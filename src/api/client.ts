import { useAuthStore } from '../store/authStore'

const BASE = import.meta.env.VITE_API_URL ?? ''

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeader() })
  if (res.status === 401) { useAuthStore.getState().clearAuth(); throw new Error('401') }
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeader() })
  if (res.status === 401) { useAuthStore.getState().clearAuth(); throw new Error('401') }
  if (!res.ok) throw new Error(`API ${res.status}`)
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  })
  if (res.status === 401) { useAuthStore.getState().clearAuth(); throw new Error('401') }
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
  al: boolean | null
  am: boolean | null
  pf: number | null
}

export type ApiErrorLog = {
  id: number
  deviceId: string
  timestamp: string
  errorCode: number
  errorMessage: string
}

export const api = {
  history:       (deviceId: string, limit = 100) =>
    get<ApiFeedEntry[]>(`/api/devices/${deviceId}/history?limit=${limit}`),
  postFeedEntry: (deviceId: string, grams: number, source: 'manual' | 'scheduled') =>
    post<ApiFeedEntry>(`/api/devices/${deviceId}/history`, { grams, source }),
  clearHistory:  (deviceId: string) =>
    del(`/api/devices/${deviceId}/history`),
  telemetry:     (deviceId: string, limit = 200) =>
    get<ApiTelemetry[]>(`/api/devices/${deviceId}/telemetry?limit=${limit}`),
  latestTelemetry: (deviceId: string) =>
    get<ApiTelemetry | null>(`/api/devices/${deviceId}/telemetry/latest`),
  errors:        (deviceId: string, limit = 50) =>
    get<ApiErrorLog[]>(`/api/devices/${deviceId}/errors?limit=${limit}`),
  logout:        () =>
    fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: authHeader() }),
}
