import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule, type DeviceType } from '../store/deviceStore'

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
  })

  client.on('disconnect', () => store.setConnected(false))
  client.on('error',      () => store.setConnected(false))
  client.on('offline',    () => store.setConnected(false))

  client.on('message', (_topic, payload) => {
    try {
      const d = JSON.parse(payload.toString()) as Record<string, unknown>
      const { setTelemetry, setSchedules, setDeviceType } = useDeviceStore.getState()

      setTelemetry({
        eg:      typeof d.eg === 'number' ? d.eg : undefined,
        ep:      typeof d.ep === 'number' ? d.ep : undefined,
        tp:      typeof d.tp === 'number' ? d.tp : undefined,
        voltage: typeof d.v  === 'number' ? d.v  : undefined,
        al:      typeof d.al === 'boolean' ? d.al : undefined,
        am:      typeof d.am === 'boolean' ? d.am : undefined,
        er:      typeof d.er === 'number' ? d.er : undefined,
        ts:      typeof d.ts === 'string' ? d.ts : undefined,
        pf:      typeof d.pf === 'number' ? d.pf : undefined,
      })

      // pf: 0 = piscicultura, 1 = pet/cão
      if (typeof d.pf === 'number') {
        const t: DeviceType = d.pf === 0 ? 'peixe' : 'cao'
        if (useDeviceStore.getState().deviceType !== t) setDeviceType(t)
      }

      if (Array.isArray(d.c_pt)) {
        setSchedules(d.c_pt as DeviceSchedule[])
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
