const BASE = import.meta.env.VITE_API_URL ?? ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export type ApiFeedEntry = {
  id: number
  deviceId: string
  timestamp: string
  grams: number
  source: 'manual' | 'scheduled'
}

export type ApiTelemetry = {
  id: number
  deviceId: string
  timestamp: string
  eg: number | null
  ep: number | null
  cp: number | null
  tp: number | null
  er: number | null
}

export type ApiErrorLog = {
  id: number
  deviceId: string
  timestamp: string
  errorCode: number
  errorMessage: string
}

export const api = {
  history:   (deviceId: string, limit = 100) =>
    get<ApiFeedEntry[]>(`/api/devices/${deviceId}/history?limit=${limit}`),
  telemetry: (deviceId: string, limit = 200) =>
    get<ApiTelemetry[]>(`/api/devices/${deviceId}/telemetry?limit=${limit}`),
  latestTelemetry: (deviceId: string) =>
    get<ApiTelemetry | null>(`/api/devices/${deviceId}/telemetry/latest`),
  errors:    (deviceId: string, limit = 50) =>
    get<ApiErrorLog[]>(`/api/devices/${deviceId}/errors?limit=${limit}`),
}
