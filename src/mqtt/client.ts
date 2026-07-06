import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { useAuthStore } from '../store/authStore'
import { notify } from '../store/notificationStore'
import { api } from '../api/client'

const OFFLINE_THRESHOLD_MS = 90_000

let eventSource: EventSource | null = null
let mqttConnectedAt = 0
let lastNotifiedError = 0

const prevAlAll: Record<string, boolean> = {}
const feedStartTime: Record<string, number> = {}
const lastAlTrueAt: Record<string, number> = {}
const feedStartEg: Record<string, number> = {}
const lastPostedManual: Record<string, number> = {}
const lastPostedScheduled: Record<string, number> = {}

function buildEventUrl(baseUrl: string, token?: string) {
  if (!token) return baseUrl
  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`
}

export function getMqttClient() {
  return eventSource
}

export function getMqttConnectedAt() {
  return mqttConnectedAt
}

export function connectMqtt(url: string, token?: string) {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  const store = useDeviceStore.getState()
  const eventUrl = buildEventUrl(url, token)

  eventSource = new EventSource(eventUrl)

  eventSource.onopen = () => {
    mqttConnectedAt = Date.now()
    store.setConnected(true)
    store.clearCmdLog()
    console.debug('[SSE] conectado em', eventUrl)
    notify.success('Conexão de eventos estabelecida.')
  }

  eventSource.onerror = (error) => {
    store.setConnected(false)
    console.error('[SSE] erro de SSE', error)
    notify.warning('Erro na conexão de eventos.')
  }

  eventSource.addEventListener('connected', () => {
    console.debug('[SSE] handshake OK')
  })

  eventSource.addEventListener('status', (event) => {
    try {
      handleStatusEvent(event.data)
    } catch (e) {
      console.error('[SSE] falha ao processar status', e)
    }
  })

  eventSource.addEventListener('cmd', (event) => {
    try {
      handleCmdEvent(event.data)
    } catch (e) {
      console.error('[SSE] falha ao processar cmd', e)
    }
  })

  return eventSource
}

export function disconnectMqtt() {
  eventSource?.close()
  eventSource = null
  mqttConnectedAt = 0
  useDeviceStore.getState().setConnected(false)
}

export async function publishCmd(deviceId: string, payload: object) {
  const store = useDeviceStore.getState()
  if (!store.connected) return false
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
        cmdAt: now,
        grams: g,
        cooldownUntil: now + 30 * 60 * 1000,
        user: useAuthStore.getState().name,
      })
    }
  }
  if ('st' in p) {
    const { pendingManual, setPendingManual } = useDeviceStore.getState()
    const pending = pendingManual[deviceId]
    if (pending && !pending.cancelled) {
      setPendingManual(deviceId, { ...pending, cancelled: true })
    }
  }

  return await publishCommand(deviceId, payload)
}

export async function publishCmdSequence(deviceId: string, payloads: object[], delayMs = 300) {
  const store = useDeviceStore.getState()
  if (!store.connected) return false
  if (isDeviceOffline(deviceId)) {
    notify.warning('Dispositivo sem comunicação. Verifique a conexão antes de enviar comandos.')
    return false
  }

  for (let i = 0; i < payloads.length; i += 1) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    const ok = await publishCmd(deviceId, payloads[i])
    if (!ok) return false
  }

  return true
}

async function publishCommand(deviceId: string, payload: object) {
  try {
    await api.sendCommand(deviceId, payload)
    return true
  } catch (error) {
    console.error('[CMD] falha ao enviar comando', error)
    notify.error('Falha ao enviar comando.')
    return false
  }
}

function handleCmdEvent(data: string) {
  const message = JSON.parse(data) as { deviceId: string; payload: Record<string, unknown> }
  const cmd = message.payload
  const deviceId = message.deviceId
  const { deviceId: activeDeviceId, setOptimisticFeed, addCmd, timeoutCmd } = useDeviceStore.getState()

  if (deviceId !== activeDeviceId) return

  const ts = Date.now()
  if (typeof cmd.sim === 'number' && cmd.sim > 0) {
    const existingPending = useDeviceStore.getState().pendingManual[deviceId]
    useDeviceStore.getState().setPendingManual(deviceId, {
      cmdAt: ts,
      grams: cmd.sim,
      cooldownUntil: ts + 30 * 60 * 1000,
      user: existingPending?.user ?? useAuthStore.getState().name,
    })
    setOptimisticFeed({
      id: `opt-${ts}`,
      deviceId,
      grams: cmd.sim,
      timestamp: ts,
      source: 'manual',
      user: useAuthStore.getState().name,
    })
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label: `Trato ${cmd.sim}g`, type: 'feed' })
    setTimeout(() => timeoutCmd(id), 60_000)
    return
  }

  if (typeof cmd.st === 'number') {
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label: 'Parar alimentação', type: 'stop' })
    setTimeout(() => timeoutCmd(id), 30_000)
    return
  }

  if (cmd.c_ps) {
    const ps = cmd.c_ps as Record<string, unknown>
    const label = (typeof ps.qpc === 'number' && typeof ps.tc === 'number' && typeof ps.hl === 'number' && typeof ps.hd === 'number')
      ? `Janela: ${ps.qpc}g/${ps.tc}min ${ps.hl}h-${ps.hd}h`
      : 'Config. piscicultura'
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label, type: 'config' })
    setTimeout(() => timeoutCmd(id), 60_000)
    return
  }

  if (cmd.c_pt) {
    const slots = Array.isArray(cmd.c_pt) ? cmd.c_pt.length : '?'
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label: `Agenda: ${slots} refeições`, type: 'config' })
    setTimeout(() => timeoutCmd(id), 60_000)
    return
  }

  if (typeof cmd.pf === 'number') {
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label: cmd.pf === 1 ? 'Perfil: Cão' : 'Perfil: Peixe', type: 'profile' })
    setTimeout(() => timeoutCmd(id), 60_000)
    return
  }

  if (typeof cmd.am === 'boolean') {
    const id = `cmd-${ts}`
    addCmd({ id, timestamp: ts, deviceId, label: cmd.am ? 'Automático ligado' : 'Automático desligado', type: 'mode' })
    setTimeout(() => timeoutCmd(id), 60_000)
  }
}

function handleStatusEvent(payload: string) {
  const d = JSON.parse(payload) as Record<string, unknown>
  const store = useDeviceStore.getState()
  const { setTelemetry, setDeviceData, bumpLastFeedAt, setOptimisticFeed, confirmCmdByType, deviceId, al: prevAl, deviceData } = store

  const msgDeviceId = typeof d.deviceId === 'string' ? d.deviceId : ''
  if (!msgDeviceId) return

  const prevLastSeen = deviceData[msgDeviceId]?.lastSeen ?? 0
  const wasOffline = prevLastSeen > 0 && (Date.now() - prevLastSeen) > OFFLINE_THRESHOLD_MS

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
      const label = store.deviceNames[deviceId] ?? deviceId
      if (!prevAl) {
        notify.info(`${label} alimentando...`)
        confirmCmdByType('feed')
      }
    }

    if (typeof d.al === 'boolean' && !d.al && prevAl) {
      confirmCmdByType('stop')
      setOptimisticFeed(null, deviceId)
      bumpLastFeedAt()
    }

    if (typeof d.pf === 'number') confirmCmdByType('profile')
    if (d.am !== undefined)       confirmCmdByType('mode')
  }

  const devicePatch: Partial<{ eg: number; ep: number; cp: number; tp: number; er: number; al: boolean; pf: number; am: boolean; lastSeen: number; schedules: DeviceSchedule[]; fishSchedule: FishSchedule }> = {}
  if (typeof d.eg === 'number')                        devicePatch.eg = d.eg
  if (typeof d.ep === 'number')                        devicePatch.ep = d.ep
  if (typeof d.cp === 'number')                        devicePatch.cp = d.cp
  if (typeof d.tp === 'number')                        devicePatch.tp = d.tp
  if (typeof d.er === 'number')                        devicePatch.er = d.er
  if (typeof d.al === 'boolean' || typeof d.al === 'number') devicePatch.al = !!d.al
  if (typeof d.pf === 'number')                        devicePatch.pf = d.pf
  if (typeof d.am === 'boolean')                       devicePatch.am = d.am
  devicePatch.lastSeen = Date.now()

  if (Array.isArray(d.c_pt)) devicePatch.schedules = d.c_pt as DeviceSchedule[]
  if (d.c_ps && typeof d.c_ps === 'object') devicePatch.fishSchedule = d.c_ps as FishSchedule

  setDeviceData(msgDeviceId, devicePatch)

  if (wasOffline) {
    delete prevAlAll[msgDeviceId]
    delete feedStartTime[msgDeviceId]
    delete lastAlTrueAt[msgDeviceId]
    delete feedStartEg[msgDeviceId]
    setOptimisticFeed(null, msgDeviceId)
  }

  const newAl = typeof d.al === 'boolean' ? d.al : typeof d.al === 'number' ? !!d.al : null

  if (newAl === true && !prevAlAll[msgDeviceId]) {
    feedStartTime[msgDeviceId] = Date.now()
    lastAlTrueAt[msgDeviceId]  = Date.now()
    feedStartEg[msgDeviceId] = typeof d.eg === 'number' ? d.eg : (deviceData[msgDeviceId]?.eg ?? 0)
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
    const motorStartedAfterCmd = lastTrue > lastSim
    const manualPending = lastSim > 0 && grams > 0 && withinCooldown && motorStartedAfterCmd

    const FEED_DEDUP_MS = 120_000

    if (isManualFeed) {
      const canPost = !lastPostedManual[msgDeviceId] || Date.now() - lastPostedManual[msgDeviceId] > FEED_DEDUP_MS
      if (canPost) {
        lastPostedManual[msgDeviceId] = Date.now()
        const source = pending?.cancelled ? 'cancelled' : 'manual'
        api.postFeedEntry(msgDeviceId, grams, source).catch(() => {})
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
    useDeviceStore.getState().setOptimisticFeed(null, msgDeviceId)
    bumpLastFeedAt()
  }

  if (newAl !== null) prevAlAll[msgDeviceId] = newAl
}

function resolveScheduledGramsFromStore(deviceId: string, startTime?: number): number {
  const { deviceData } = useDeviceStore.getState()
  const d = deviceData[deviceId]
  if (!d) return 0

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

  if (d.fishSchedule?.qpc && d.fishSchedule.qpc > 0) return d.fishSchedule.qpc
  return 0
}

function isDeviceOffline(deviceId: string) {
  const { deviceData } = useDeviceStore.getState()
  const lastSeen = deviceData[deviceId]?.lastSeen ?? 0
  const clearlyOffline = lastSeen > 0 && (Date.now() - lastSeen) > OFFLINE_THRESHOLD_MS
  if (!clearlyOffline) return false
  const waitingFirstMsg = eventSource && mqttConnectedAt > 0
    && Date.now() - mqttConnectedAt < OFFLINE_THRESHOLD_MS
    && lastSeen < mqttConnectedAt
  return !waitingFirstMsg
}
