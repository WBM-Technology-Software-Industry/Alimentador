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

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API ${res.status}`)
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export const api = {
  history:   (deviceId: string, limit = 100) =>
    get<ApiFeedEntry[]>(`/api/devices/${deviceId}/history?limit=${limit}`),
  postFeedEntry: (deviceId: string, grams: number, source: 'manual' | 'scheduled') =>
    post<ApiFeedEntry>(`/api/devices/${deviceId}/history`, { grams, source }),
  clearHistory: (deviceId: string) =>
    del(`/api/devices/${deviceId}/history`),
  telemetry: (deviceId: string, limit = 200) =>
    get<ApiTelemetry[]>(`/api/devices/${deviceId}/telemetry?limit=${limit}`),
  latestTelemetry: (deviceId: string) =>
    get<ApiTelemetry | null>(`/api/devices/${deviceId}/telemetry/latest`),
  errors:    (deviceId: string, limit = 50) =>
    get<ApiErrorLog[]>(`/api/devices/${deviceId}/errors?limit=${limit}`),
}
