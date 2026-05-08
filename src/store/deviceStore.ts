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
  h: number   // hour
  m: number   // minute
  q: number   // grams
}

type DeviceState = {
  // Tipo do dispositivo
  deviceType: DeviceType

  // MQTT config
  brokerUrl: string
  deviceId: string
  connected: boolean

  // Telemetry — estoque (tópico status: eg, ep)
  eg: number          // eg: estoque atual em gramas
  ep: number          // ep: estoque em porcentagem (0-100)
  cp: number          // capacidade total em gramas

  // Telemetry — dispositivo
  tp: number          // temperatura (°C)
  voltage: number     // tensão (V)
  al: boolean         // alerta de nível baixo
  am: boolean         // alerta de motor
  er: number          // código de erro
  ts: string          // timestamp do device

  // Agendamentos vindos do hardware (c_pt)
  schedules: DeviceSchedule[]

  // Histórico local
  feedHistory: FeedEntry[]

  // Actions
  setDeviceType: (t: DeviceType) => void
  setBrokerConfig: (url: string, id: string) => void
  setConnected: (v: boolean) => void
  setTelemetry: (data: Partial<DeviceState>) => void
  setSchedules: (schedules: DeviceSchedule[]) => void
  addFeedEntry: (entry: FeedEntry) => void
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

      schedules: [],
      feedHistory: [],

      setDeviceType: (deviceType) => set({ deviceType }),
      setBrokerConfig: (brokerUrl, deviceId) => set({ brokerUrl, deviceId }),
      setConnected: (connected) => set({ connected }),
      setTelemetry: (data) => set((s) => ({ ...s, ...data })),
      setSchedules: (schedules) => set({ schedules }),
      addFeedEntry: (entry) =>
        set((s) => ({ feedHistory: [entry, ...s.feedHistory].slice(0, 200) })),
    }),
    { name: 'feeder-wbm-storage' }
  )
)
