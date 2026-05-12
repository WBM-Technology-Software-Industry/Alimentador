import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule } from '../store/deviceStore'
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
      const { setTelemetry, setSchedules, schedules, fishSchedule, setFishSchedule } = useDeviceStore.getState()

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
          6:  'Nível de ração baixo — reabasteça em breve.',
          11: 'Motor ligado por tempo excessivo sem atingir o peso.',
        }
        notify.error(ERR[d.er as number] ?? `Erro no dispositivo (${d.er}).`)
      }

      if (typeof d.al === 'boolean' && d.al) {
        notify.info('Alimentando...')
      }

      // Sincroniza agendamentos só se o app ainda não tiver dados locais
      if (Array.isArray(d.c_pt) && schedules.length === 0) {
        setSchedules(d.c_pt as DeviceSchedule[])
      }

      if (d.c_ps && typeof d.c_ps === 'object') {
        const ps = d.c_ps as Record<string, unknown>
        if (typeof ps.qpc === 'number' && typeof ps.tc === 'number' &&
            typeof ps.hl === 'number' && typeof ps.hd === 'number') {
          if (!fishSchedule) {
            setFishSchedule({ qpc: ps.qpc, tc: ps.tc, hl: ps.hl, hd: ps.hd })
          }
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
