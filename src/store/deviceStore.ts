import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DeviceType = 'cao' | 'peixe'

export type FeedEntry = {
  id: string
  timestamp: number
  grams: number
  source: 'manual' | 'scheduled'
}

export type DeviceSchedule = {
  h: number
  m: number
  q: number
}

export type FishSchedule = {
  qpc: number  // gramas por trato
  tc: number   // intervalo em minutos
  hl: number   // hora de início
  hd: number   // hora de fim
}

export type CmdType   = 'feed' | 'stop' | 'config' | 'profile' | 'mode'
export type CmdStatus = 'sent' | 'confirmed' | 'timeout'

export type CmdLogEntry = {
  id: string
  timestamp: number
  deviceId: string
  label: string
  type: CmdType
  status: CmdStatus
}

export type CachedEntry = {
  id: string | number
  timestamp: number
  grams: number
  source: 'manual' | 'scheduled'
  deviceId: string
}

export type PerDeviceData = {
  schedules: DeviceSchedule[]
  fishSchedule: FishSchedule | null
  eg: number
  ep: number
  cp: number
  tp: number
  er: number
  al: boolean
  pf: number | null   // perfil real reportado pelo dispositivo (1=cão, 0=peixe, null=não recebido)
  am: boolean | null  // modo real reportado pelo dispositivo (true=automático, false=manual, null=não recebido)
  historyCache: CachedEntry[]
}

type DeviceState = {
  // Tipo do dispositivo
  deviceType: DeviceType

  // MQTT config
  brokerUrl: string
  deviceId: string
  connected: boolean

  // Telemetry — estoque (tópico status: eg, ep)
  eg: number
  ep: number
  cp: number

  // Telemetry — dispositivo
  tp: number
  voltage: number
  al: boolean
  am: boolean
  er: number
  ts: string
  pf: number

  // Dados recebidos por dispositivo (persistidos no localStorage)
  deviceData: Record<string, PerDeviceData>

  // Histórico local
  feedHistory: FeedEntry[]
  lastFeedAt: number
  optimisticFeed: (FeedEntry & { deviceId: string }) | null

  // Quantidade para trato manual
  manualGrams: number

  // Log de comandos enviados
  cmdLog: CmdLogEntry[]

  // Actions
  setDeviceType: (t: DeviceType) => void
  setBrokerConfig: (url: string, id: string) => void
  setConnected: (v: boolean) => void
  setTelemetry: (data: Partial<DeviceState>) => void
  setDeviceData: (deviceId: string, patch: Partial<PerDeviceData>) => void
  addFeedEntry: (entry: FeedEntry) => void
  clearFeedHistory: () => void
  bumpLastFeedAt: () => void
  setOptimisticFeed: (feed: (FeedEntry & { deviceId: string }) | null) => void
  setManualGrams: (g: number) => void
  addCmd: (entry: Omit<CmdLogEntry, 'status'>) => void
  confirmCmdByType: (type: CmdType) => void
  timeoutCmd: (id: string) => void
  clearCmdLog: () => void
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      deviceType: 'cao',

      brokerUrl: '',
      deviceId: '',
      connected: false,

      eg: 0,
      ep: 0,
      cp: 10000,
      tp: 0,
      voltage: 0,
      al: false,
      am: false,
      er: 0,
      ts: '',
      pf: 0,

      deviceData: {},
      feedHistory: [],
      lastFeedAt: 0,
      optimisticFeed: null,
      manualGrams: 100,
      cmdLog: [],

      setDeviceType: (deviceType) => set({ deviceType }),
      setBrokerConfig: (brokerUrl, deviceId) => set({ brokerUrl, deviceId }),
      setConnected: (connected) => set({ connected }),
      setTelemetry: (data) => set((s) => ({
        ...s,
        ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      })),
      setDeviceData: (deviceId, patch) => set((s) => ({
        deviceData: {
          ...s.deviceData,
          [deviceId]: {
            schedules:    s.deviceData[deviceId]?.schedules    ?? [],
            fishSchedule: s.deviceData[deviceId]?.fishSchedule ?? null,
            eg: s.deviceData[deviceId]?.eg ?? 0,
            ep: s.deviceData[deviceId]?.ep ?? 0,
            cp: s.deviceData[deviceId]?.cp ?? 10000,
            tp: s.deviceData[deviceId]?.tp ?? 0,
            er: s.deviceData[deviceId]?.er ?? 0,
            al:           s.deviceData[deviceId]?.al           ?? false,
            pf:           s.deviceData[deviceId]?.pf           ?? null,
            am:           s.deviceData[deviceId]?.am           ?? null,
            historyCache: s.deviceData[deviceId]?.historyCache ?? [],
            ...patch,
          },
        },
      })),
      addFeedEntry: (entry) =>
        set((s) => ({ feedHistory: [entry, ...s.feedHistory].slice(0, 200) })),
      clearFeedHistory: () => set({ feedHistory: [] }),
      bumpLastFeedAt: () => set({ lastFeedAt: Date.now() }),
      setOptimisticFeed: (optimisticFeed) => set({ optimisticFeed }),
      setManualGrams: (manualGrams) => set({ manualGrams }),
      addCmd: (entry) => set((s) => ({
        cmdLog: [{ ...entry, status: 'sent' as CmdStatus }, ...s.cmdLog].slice(0, 10),
      })),
      confirmCmdByType: (type) => set((s) => {
        let done = false
        return {
          cmdLog: s.cmdLog.map((e) => {
            if (!done && e.type === type && e.status === 'sent') { done = true; return { ...e, status: 'confirmed' as CmdStatus } }
            return e
          }),
        }
      }),
      timeoutCmd: (id) => set((s) => ({
        cmdLog: s.cmdLog.map((e) => e.id === id && e.status === 'sent' ? { ...e, status: 'timeout' as CmdStatus } : e),
      })),
      clearCmdLog: () => set({ cmdLog: [] }),
    }),
    {
      name: 'feeder-wbm-storage',
      version: 4,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: (s) => { const { cmdLog, ...rest } = s as DeviceState & { cmdLog: unknown }; return rest as unknown as DeviceState },
    }
  )
)
