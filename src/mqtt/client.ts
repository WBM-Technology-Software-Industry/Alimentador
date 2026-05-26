import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { notify } from '../store/notificationStore'

let client: MqttClient | null = null

export function getMqttClient() {
  return client
}

export function connectMqtt(brokerUrl: string, deviceId: string) {
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
    client!.subscribe(`devices/${deviceId}/status`, { qos: 1 })
    notify.success('Dispositivo conectado.')
  })

  client.on('disconnect', () => { store.setConnected(false); notify.warning('Dispositivo desconectado.') })
  client.on('error',      () => { store.setConnected(false); notify.error('Erro na conexão MQTT.') })
  client.on('offline',    () => { store.setConnected(false); notify.warning('Conexão offline.') })

  client.on('message', (_topic, payload) => {
    try {
      const d = JSON.parse(payload.toString()) as Record<string, unknown>
      const { setTelemetry, setDeviceData, addFeedEntry, deviceId, al: prevAl, eg: prevEg, manualGrams } = useDeviceStore.getState()

      setTelemetry({
        eg:      typeof d.eg === 'number' ? d.eg : undefined,
        ep:      typeof d.ep === 'number' ? d.ep : undefined,
        tp:      typeof d.tp === 'number' ? d.tp : undefined,
        voltage: typeof d.v  === 'number' ? d.v  : undefined,
        al:      typeof d.al === 'boolean' ? d.al : undefined,
        er:      typeof d.er === 'number' ? d.er : undefined,
        ts:      typeof d.ts === 'string' ? d.ts : undefined,
        pf:      typeof d.pf === 'number' ? d.pf : undefined,
      })

      if (typeof d.er === 'number' && d.er > 0) {
        const ERR: Record<number, string> = {
          1:  'Motor desconectado ou fusível queimado.',
          2:  'Motor travado por objeto estranho ou ração úmida.',
          3:  'Sensor capacitivo detectou falta de ração.',
          4:  'Tensão baixa — verifique a alimentação elétrica.',
          6:  'Nível de ração baixo — reabasteça em breve.',
          11: 'Motor ligado por tempo excessivo sem atingir o peso.',
        }
        notify.error(ERR[d.er as number] ?? `Erro no dispositivo (${d.er}).`)
      }

      if (typeof d.al === 'boolean' && d.al) {
        notify.info('Alimentando...')
      }

      // Register feed event when al transitions true → false (feeding completed)
      if (typeof d.al === 'boolean' && !d.al && prevAl) {
        const gramsUsed = typeof d.eg === 'number' && prevEg > 0 ? Math.max(0, Math.round(prevEg - d.eg)) : manualGrams
        addFeedEntry({
          id: `${Date.now()}-${deviceId}`,
          timestamp: Date.now(),
          grams: gramsUsed,
          source: typeof d.am === 'boolean' ? (d.am ? 'scheduled' : 'manual') : 'manual',
        })
      }

      // Sempre atualiza dados recebidos do dispositivo no localStorage por device
      const stockPatch: Partial<{ eg: number; ep: number; cp: number }> = {}
      if (typeof d.eg === 'number') stockPatch.eg = d.eg
      if (typeof d.ep === 'number') stockPatch.ep = d.ep
      if (typeof d.cp === 'number') stockPatch.cp = d.cp
      if (Object.keys(stockPatch).length) setDeviceData(deviceId, stockPatch)

      if (Array.isArray(d.c_pt)) {
        setDeviceData(deviceId, { schedules: d.c_pt as DeviceSchedule[] })
      }

      if (d.c_ps && typeof d.c_ps === 'object') {
        const ps = d.c_ps as Record<string, unknown>
        if (typeof ps.qpc === 'number' && typeof ps.tc === 'number' &&
            typeof ps.hl === 'number' && typeof ps.hd === 'number') {
          setDeviceData(deviceId, { fishSchedule: ps as unknown as FishSchedule })
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
