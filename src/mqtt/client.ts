import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { notify } from '../store/notificationStore'


const DEVICE_LABELS: Record<string, string> = {
  ALIMENTADOR_1: 'Alimentador 1',
  ALIMENTADOR_2: 'Alimentador 2',
}

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
    store.clearCmdLog()
    client!.subscribe('devices/+/status', { qos: 1 })
    client!.subscribe('devices/+/cmd',    { qos: 0 })
    notify.success('Dispositivo conectado.')
  })

  client.on('disconnect', () => { store.setConnected(false); notify.warning('Dispositivo desconectado.') })
  client.on('error',      () => { store.setConnected(false); notify.error('Erro na conexão MQTT.') })
  client.on('offline',    () => { store.setConnected(false); notify.warning('Conexão offline.') })

  client.on('message', (topic, payload) => {
    // cmd topic: show optimistic entry on ALL clients the moment a sim command is published
    const cmdMatch = topic.match(/^devices\/(.+)\/cmd$/)
    if (cmdMatch) {
      try {
        const cmd = JSON.parse(payload.toString()) as Record<string, unknown>
        const { deviceId, setOptimisticFeed, addCmd, timeoutCmd } = useDeviceStore.getState()
        if (cmdMatch[1] === deviceId) {
          const ts = Date.now()
          if (typeof cmd.sim === 'number' && cmd.sim > 0) {
            setOptimisticFeed({ id: `opt-${ts}`, deviceId, grams: cmd.sim, timestamp: ts, source: 'manual' })
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label: `Trato ${cmd.sim}g`, type: 'feed' })
            setTimeout(() => timeoutCmd(id), 60_000)
          } else if (typeof cmd.st === 'number') {
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label: 'Parar alimentação', type: 'stop' })
            setTimeout(() => timeoutCmd(id), 30_000)
          } else if (cmd.c_ps) {
            const ps = cmd.c_ps as Record<string, unknown>
            const label = (typeof ps.qpc === 'number' && typeof ps.tc === 'number' && typeof ps.hl === 'number' && typeof ps.hd === 'number')
              ? `Janela: ${ps.qpc}g/${ps.tc}min ${ps.hl}h-${ps.hd}h`
              : 'Config. piscicultura'
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label, type: 'config' })
            setTimeout(() => timeoutCmd(id), 60_000)
          } else if (cmd.c_pt) {
            const slots = Array.isArray(cmd.c_pt) ? cmd.c_pt.length : '?'
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label: `Agenda: ${slots} refeições`, type: 'config' })
            setTimeout(() => timeoutCmd(id), 60_000)
          } else if (typeof cmd.pf === 'number') {
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label: cmd.pf === 1 ? 'Perfil: Cão' : 'Perfil: Peixe', type: 'profile' })
            setTimeout(() => timeoutCmd(id), 60_000)
          } else if (typeof cmd.am === 'boolean') {
            const id = `cmd-${ts}`
            addCmd({ id, timestamp: ts, deviceId, label: cmd.am ? 'Automático ligado' : 'Automático desligado', type: 'mode' })
            setTimeout(() => timeoutCmd(id), 60_000)
          }
        }
      } catch { /* ignore */ }
      return
    }

    const topicMatch = topic.match(/^devices\/(.+)\/status$/)
    if (!topicMatch) return
    const msgDeviceId = topicMatch[1]

    try {
      const d = JSON.parse(payload.toString()) as Record<string, unknown>
      const {
        setTelemetry, setDeviceData, bumpLastFeedAt, setOptimisticFeed, confirmCmdByType,
        deviceId, al: prevAl, eg: prevEg,
      } = useDeviceStore.getState()

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
          const label = DEVICE_LABELS[deviceId] ?? deviceId
          if (!prevAl) {
            notify.info(`${label} alimentando...`)
            confirmCmdByType('feed')
          }
        }

        if (typeof d.al === 'boolean' && !d.al && prevAl) {
          confirmCmdByType('stop')
          // Compute grams from stock delta and set optimistic entry on all connected clients
          const gramsUsed = typeof d.eg === 'number' && prevEg > 0
            ? Math.max(0, Math.round(prevEg - d.eg))
            : 0
          if (gramsUsed > 0) {
            const source: 'manual' | 'scheduled' = d.am ? 'scheduled' : 'manual'
            setOptimisticFeed({ id: `opt-${Date.now()}`, deviceId, grams: gramsUsed, timestamp: Date.now(), source })
          }
          bumpLastFeedAt()
        }

        if (typeof d.pf === 'number') confirmCmdByType('profile')
        if (d.am !== undefined)       confirmCmdByType('mode')
      }

      // Always persist data for every device that sends a message
      const devicePatch: Partial<{ eg: number; ep: number; cp: number; tp: number; er: number; al: boolean; pf: number; am: boolean }> = {}
      if (typeof d.eg === 'number')                        devicePatch.eg = d.eg
      if (typeof d.ep === 'number')                        devicePatch.ep = d.ep
      if (typeof d.cp === 'number')                        devicePatch.cp = d.cp
      if (typeof d.tp === 'number')                        devicePatch.tp = d.tp
      if (typeof d.er === 'number')                        devicePatch.er = d.er
      if (typeof d.al === 'boolean' || typeof d.al === 'number') devicePatch.al = !!d.al
      if (typeof d.pf === 'number')                        devicePatch.pf = d.pf
      if (typeof d.am === 'boolean')                       devicePatch.am = d.am
      if (Object.keys(devicePatch).length) setDeviceData(msgDeviceId, devicePatch)

      if (Array.isArray(d.c_pt)) {
        setDeviceData(msgDeviceId, { schedules: d.c_pt as DeviceSchedule[] })
        if (msgDeviceId === deviceId) confirmCmdByType('config')
      }

      if (d.c_ps && typeof d.c_ps === 'object') {
        const ps = d.c_ps as Record<string, unknown>
        if (typeof ps.qpc === 'number' && typeof ps.tc === 'number' &&
            typeof ps.hl === 'number' && typeof ps.hd === 'number') {
          setDeviceData(msgDeviceId, { fishSchedule: ps as unknown as FishSchedule })
          if (msgDeviceId === deviceId) confirmCmdByType('config')
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
