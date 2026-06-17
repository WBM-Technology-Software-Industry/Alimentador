import mqtt, { type MqttClient } from 'mqtt'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { notify } from '../store/notificationStore'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

const DEVICE_LABELS: Record<string, string> = {
  ALIMENTADOR_1: 'Alimentador 1',
  ALIMENTADOR_2: 'Alimentador 2',
}

const OFFLINE_THRESHOLD_MS = 90_000

let client: MqttClient | null = null
let lastNotifiedError = 0
let mqttConnectedAt = 0
const prevAlAll:      Record<string, boolean> = {}
const feedStartTime:  Record<string, number>  = {}
const lastAlTrueAt:   Record<string, number>  = {}
const lastPostedManual:    Record<string, number> = {} // dedup local por dispositivo — manual
const lastPostedScheduled: Record<string, number> = {} // dedup local por dispositivo — automático

export function getMqttClient() { return client }
export function getMqttConnectedAt() { return mqttConnectedAt }

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
    mqttConnectedAt = Date.now()
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
            // Todos os browsers registram o comando pendente ao ver um sim no tópico cmd
            const existingPending = useDeviceStore.getState().pendingManual[deviceId]
            useDeviceStore.getState().setPendingManual(deviceId, {
              cmdAt: ts, grams: cmd.sim, cooldownUntil: ts + 30 * 60 * 1000,
              user: existingPending?.user ?? useAuthStore.getState().name,
            })
            setOptimisticFeed({ id: `opt-${ts}`, deviceId, grams: cmd.sim, timestamp: ts, source: 'manual', user: useAuthStore.getState().name })
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
        deviceId, al: prevAl, deviceData,
      } = useDeviceStore.getState()

      const prevLastSeen = deviceData[msgDeviceId]?.lastSeen ?? 0
      const wasOffline = prevLastSeen > 0 && (Date.now() - prevLastSeen) > OFFLINE_THRESHOLD_MS

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
              3:  'Alimentador vazio.',
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
          // Feed done — clear optimistic entry and let server data take over
          setOptimisticFeed(null, deviceId)
          bumpLastFeedAt()
        }

        if (typeof d.pf === 'number') confirmCmdByType('profile')
        if (d.am !== undefined)       confirmCmdByType('mode')
      }

      // Always persist data for every device that sends a message
      const devicePatch: Partial<{ eg: number; ep: number; cp: number; tp: number; er: number; al: boolean; pf: number; am: boolean; lastSeen: number }> = {}
      if (typeof d.eg === 'number')                        devicePatch.eg = d.eg
      if (typeof d.ep === 'number')                        devicePatch.ep = d.ep
      if (typeof d.cp === 'number')                        devicePatch.cp = d.cp
      if (typeof d.tp === 'number')                        devicePatch.tp = d.tp
      if (typeof d.er === 'number')                        devicePatch.er = d.er
      if (typeof d.al === 'boolean' || typeof d.al === 'number') devicePatch.al = !!d.al
      if (typeof d.pf === 'number')                        devicePatch.pf = d.pf
      if (typeof d.am === 'boolean')                       devicePatch.am = d.am
      devicePatch.lastSeen = Date.now()
      setDeviceData(msgDeviceId, devicePatch)

      // Ao voltar do offline, descarta estado de detecção em memória (prevAlAll, feedStartTime, lastAlTrueAt)
      // mas preserva pendingManual no store — pode haver um comando manual pendente legítimo
      if (wasOffline) {
        delete prevAlAll[msgDeviceId]
        delete feedStartTime[msgDeviceId]
        delete lastAlTrueAt[msgDeviceId]
        setOptimisticFeed(null, msgDeviceId)
      }

      // Detecta início e fim de trato para QUALQUER dispositivo
      const newAl = typeof d.al === 'boolean' ? d.al : typeof d.al === 'number' ? !!d.al : null

      if (newAl === true && !prevAlAll[msgDeviceId]) {
        feedStartTime[msgDeviceId] = Date.now()
        lastAlTrueAt[msgDeviceId]  = Date.now()
        // Cria entrada otimista para todos os browsers (manual ou automático)
        const { pendingManual, optimisticFeed, setOptimisticFeed } = useDeviceStore.getState()
        const pending = pendingManual[msgDeviceId]
        if (!optimisticFeed[msgDeviceId]) {
          const ts = Date.now()
          if (pending) {
            setOptimisticFeed({ id: `opt-${ts}`, deviceId: msgDeviceId, grams: pending.grams, timestamp: ts, source: 'manual', user: pending.user ?? useAuthStore.getState().name })
          } else {
            const schedGrams = resolveScheduledGramsFromStore(msgDeviceId, ts)
            setOptimisticFeed({ id: `opt-${ts}`, deviceId: msgDeviceId, grams: schedGrams, timestamp: ts, source: 'scheduled', user: null })
          }
        }
      }

      if (newAl === false && prevAlAll[msgDeviceId] === true) {
        const { pendingManual, setPendingManual } = useDeviceStore.getState()
        const pending      = pendingManual[msgDeviceId]
        const lastSim      = pending?.cmdAt        ?? 0
        const grams        = pending?.grams         ?? 0
        const cooldownUntil = pending?.cooldownUntil ?? 0
        const lastTrue     = lastAlTrueAt[msgDeviceId] ?? 0

        const withinCooldown = cooldownUntil > Date.now()
        const isManualFeed  = lastSim > 0 && grams > 0 && lastTrue > lastSim && withinCooldown
        const manualPending = lastSim > 0 && grams > 0 && withinCooldown

        const FEED_DEDUP_MS = 120_000 // 2 minutos por fonte — evita que múltiplos browsers postem o mesmo trato

        if (isManualFeed) {
          const canPost = !lastPostedManual[msgDeviceId] || Date.now() - lastPostedManual[msgDeviceId] > FEED_DEDUP_MS
          if (canPost) {
            lastPostedManual[msgDeviceId] = Date.now()
            api.postFeedEntry(msgDeviceId, grams, 'manual', pending?.user ?? useAuthStore.getState().name).catch(() => {})
          }
          setPendingManual(msgDeviceId, null)
        } else if (!manualPending) {
          const schedGrams = resolveScheduledGramsFromStore(msgDeviceId, feedStartTime[msgDeviceId])
          const canPost = !lastPostedScheduled[msgDeviceId] || Date.now() - lastPostedScheduled[msgDeviceId] > FEED_DEDUP_MS
          if (schedGrams > 0 && canPost) {
            lastPostedScheduled[msgDeviceId] = Date.now()
            api.postFeedEntry(msgDeviceId, schedGrams, 'scheduled').catch(() => {})
          }
        }

        delete feedStartTime[msgDeviceId]
        const { setOptimisticFeed: clearOpt } = useDeviceStore.getState()
        clearOpt(null, msgDeviceId)
        bumpLastFeedAt()
      }

      if (newAl !== null) prevAlAll[msgDeviceId] = newAl

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

function resolveScheduledGramsFromStore(deviceId: string, startTime?: number): number {
  const { deviceData } = useDeviceStore.getState()
  const d = deviceData[deviceId]
  if (!d) return 0

  // Tenta c_pt (agenda pet) — slot mais próximo dentro de 5 minutos
  if (d.schedules && Array.isArray(d.schedules) && startTime) {
    const dt = new Date(startTime)
    const feedHour = dt.getHours()
    const feedMin  = dt.getMinutes()
    let bestQ = 0, bestDiff = Infinity
    for (const slot of d.schedules) {
      if (!slot.q || slot.q <= 0) continue
      const diff = Math.abs((slot.h * 60 + slot.m) - (feedHour * 60 + feedMin))
      if (diff < bestDiff) { bestDiff = diff; bestQ = slot.q }
    }
    if (bestQ > 0 && bestDiff <= 30) return bestQ
  }

  // Fallback: ciclo piscicultura (c_ps.qpc)
  if (d.fishSchedule?.qpc && d.fishSchedule.qpc > 0) return d.fishSchedule.qpc

  return 0
}

export function disconnectMqtt() {
  client?.end(true)
  client = null
  useDeviceStore.getState().setConnected(false)
}

function isDeviceOffline(deviceId: string): boolean {
  const { deviceData } = useDeviceStore.getState()
  const lastSeen = deviceData[deviceId]?.lastSeen ?? 0
  return lastSeen > 0 && (Date.now() - lastSeen) > OFFLINE_THRESHOLD_MS
}

export function publishCmd(deviceId: string, payload: object) {
  if (!client?.connected) return false
  if (isDeviceOffline(deviceId)) {
    notify.warning('Dispositivo sem comunicação. Verifique a conexão antes de enviar comandos.')
    return false
  }
  const p = payload as Record<string, unknown>
  if ('sim' in p) {
    const g = typeof p.sim === 'number' ? p.sim : 0
    if (g > 0) {
      const now = Date.now()
      useDeviceStore.getState().setPendingManual(deviceId, {
        cmdAt: now, grams: g, cooldownUntil: now + 30 * 60 * 1000,
        user: useAuthStore.getState().name,
      })
    }
  }
  client.publish(`devices/${deviceId}/cmd`, JSON.stringify(payload), { qos: 1 })
  return true
}

export function publishCmdSequence(deviceId: string, payloads: object[], delayMs = 300) {
  if (!client?.connected) return false
  if (isDeviceOffline(deviceId)) {
    notify.warning('Dispositivo sem comunicação. Verifique a conexão antes de enviar comandos.')
    return false
  }
  payloads.forEach((payload, i) => {
    setTimeout(() => {
      client?.publish(`devices/${deviceId}/cmd`, JSON.stringify(payload), { qos: 1 })
    }, i * delayMs)
  })
  return true
}
