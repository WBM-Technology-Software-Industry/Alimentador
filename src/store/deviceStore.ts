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
  al: boolean         // al: motor alimentando agora (true = dispensando)
  am: boolean         // am: modo automático ativo
  er: number          // código de erro (0=OK, 1=corrente zero, 2=obstrução, 3=vazio, 11=timeout)
  ts: string          // timestamp do device
  pf: number          // pf: perfil (0=piscicultura, 1=pet)

  // Agendamentos vindos do hardware
  schedules: DeviceSchedule[]      // c_pt — perfil Cão
  fishSchedule: FishSchedule | null // c_ps — perfil Peixe

  // Histórico local
  feedHistory: FeedEntry[]

  // Actions
  setDeviceType: (t: DeviceType) => void
  setBrokerConfig: (url: string, id: string) => void
  setConnected: (v: boolean) => void
  setTelemetry: (data: Partial<DeviceState>) => void
  setSchedules: (schedules: DeviceSchedule[]) => void
  setFishSchedule: (s: FishSchedule | null) => void
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
      pf: 0,

      schedules: [],
      fishSchedule: { qpc: 500, tc: 30, hl: 8, hd: 18 },
      feedHistory: [],

      setDeviceType: (deviceType) => set({ deviceType }),
      setBrokerConfig: (brokerUrl, deviceId) => set({ brokerUrl, deviceId }),
      setConnected: (connected) => set({ connected }),
      setTelemetry: (data) => set((s) => ({
        ...s,
        ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      })),
      setSchedules: (schedules) => set({ schedules }),
      setFishSchedule: (fishSchedule) => set({ fishSchedule }),
      addFeedEntry: (entry) =>
        set((s) => ({ feedHistory: [entry, ...s.feedHistory].slice(0, 200) })),
    }),
    { name: 'feeder-wbm-storage', version: 2 }
  )
)
