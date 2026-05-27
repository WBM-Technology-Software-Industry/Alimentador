import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { notify } from '../store/notificationStore'
import { api } from '../api/client'

let client: MqttClient | null = null
let lastNotifiedError = 0

export function getMqttClient() {
  return client
}

export function connectMqtt(brokerUrl: string, _deviceId?: string) {
  if (client) {
    client.end(true)
    client = null
  }

  const store = useDeviceStore.getState()

  client = mqtt.connect(brokerUrl, {
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  })

  client.on('connect', () => {
    store.setConnected(true)
    client!.subscribe('devices/+/status', { qos: 1 })
    notify.success('Dispositivo conectado.')
  })

  client.on('disconnect', () => { store.setConnected(false); notify.warning('Dispositivo desconectado.') })
  client.on('error',      () => { store.setConnected(false); notify.error('Erro na conexão MQTT.') })
  client.on('offline',    () => { store.setConnected(false); notify.warning('Conexão offline.') })

  client.on('message', (topic, payload) => {
    const topicMatch = topic.match(/^devices\/(.+)\/status$/)
    if (!topicMatch) return
    const msgDeviceId = topicMatch[1]

    try {
      const d = JSON.parse(payload.toString()) as Record<string, unknown>
      const { setTelemetry, setDeviceData, addFeedEntry, bumpLastFeedAt, deviceId, al: prevAl, eg: prevEg, manualGrams } = useDeviceStore.getState()

      // Live telemetry and notifications only for the active device
      if (msgDeviceId === deviceId) {
        setTelemetry({
          eg:      typeof d.eg === 'number' ? d.eg : undefined,
          ep:      typeof d.ep === 'number' ? d.ep : undefined,
          tp:      typeof d.tp === 'number' ? d.tp : undefined,
          voltage: typeof d.v  === 'number' ? d.v  : undefined,
          al:      (typeof d.al === 'boolean' || typeof d.al === 'number') ? !!d.al : undefined,
          er:      typeof d.er === 'number' ? d.er : undefined,
          ts:      typeof d.ts === 'string' ? d.ts : undefined,
          pf:      typeof d.pf === 'number' ? d.pf : undefined,
        })

        if (typeof d.er === 'number') {
          if (d.er > 0 && d.er !== lastNotifiedError) {
            lastNotifiedError = d.er
            const ERR: Record<number, string> = {
              1:  'Motor desconectado ou fusível queimado.',
              2:  'Motor travado por objeto estranho ou ração úmida.',
              3:  'Sensor capacitivo detectou falta de ração.',
              4:  'Tensão baixa — verifique a alimentação elétrica.',
              6:  'Alerta de nível baixo.',
              11: 'Motor ligado por tempo excessivo sem atingir o peso.',
            }
            notify.error(ERR[d.er] ?? `Erro no dispositivo (${d.er}).`)
          } else if (d.er === 0) {
            lastNotifiedError = 0
          }
        }

        if (typeof d.al === 'boolean' && d.al) {
          notify.info('Alimentando...')
        }

        if (typeof d.al === 'boolean' && !d.al && prevAl) {
          const gramsUsed = typeof d.eg === 'number' && prevEg > 0 ? Math.max(0, Math.round(prevEg - d.eg)) : manualGrams
          const source = typeof d.am === 'boolean' ? (d.am ? 'scheduled' : 'manual') : 'manual'
          // Salva no banco via API (fonte de verdade)
          bumpLastFeedAt()
        }
      }

      // Always persist data for every device that sends a message
      const devicePatch: Partial<{ eg: number; ep: number; cp: number; tp: number; er: number; al: boolean }> = {}
      if (typeof d.eg === 'number')                        devicePatch.eg = d.eg
      if (typeof d.ep === 'number')                        devicePatch.ep = d.ep
      if (typeof d.cp === 'number')                        devicePatch.cp = d.cp
      if (typeof d.tp === 'number')                        devicePatch.tp = d.tp
      if (typeof d.er === 'number')                        devicePatch.er = d.er
      if (typeof d.al === 'boolean' || typeof d.al === 'number') devicePatch.al = !!d.al
      if (Object.keys(devicePatch).length) setDeviceData(msgDeviceId, devicePatch)

      if (Array.isArray(d.c_pt)) {
        setDeviceData(msgDeviceId, { schedules: d.c_pt as DeviceSchedule[] })
      }

      if (d.c_ps && typeof d.c_ps === 'object') {
        const ps = d.c_ps as Record<string, unknown>
        if (typeof ps.qpc === 'number' && typeof ps.tc === 'number' &&
            typeof ps.hl === 'number' && typeof ps.hd === 'number') {
          setDeviceData(msgDeviceId, { fishSchedule: ps as unknown as FishSchedule })
        }
      }
    } catch {
      // malformed payload — ignore
    }
  })
}

export function disconnectMqtt() {
  client?.end(true)
  client = null
  useDeviceStore.getState().setConnected(false)
}

export function publishCmd(deviceId: string, payload: object) {
  if (!client?.connected) return false
  client.publish(`devices/${deviceId}/cmd`, JSON.stringify(payload), { qos: 1 })
  return true
}

export function publishCmdSequence(deviceId: string, payloads: object[], delayMs = 300) {
  if (!client?.connected) return false
  payloads.forEach((payload, i) => {
    setTimeout(() => {
      client?.publish(`devices/${deviceId}/cmd`, JSON.stringify(payload), { qos: 1 })
    }, i * delayMs)
  })
  return true
}
