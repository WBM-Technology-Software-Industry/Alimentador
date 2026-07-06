import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const RESTRICTED_USER_EMAIL = 'usuario@wbm.com'
export const RESTRICTED_USER_DEVICE = 'ALIMENTADOR_3'
const RESTRICTED_USER_PROFILES = ['pet', 'fish'] as const

export function getScopedAccountAccess(email: string | null | undefined, devices: string[], profiles: string[]) {
  if (email !== RESTRICTED_USER_EMAIL) {
    return { devices, profiles }
  }

  const normalizedProfiles = profiles.filter((p) => p === 'pet' || p === 'fish')
  return {
    devices: [RESTRICTED_USER_DEVICE],
    profiles: normalizedProfiles.length > 0 ? normalizedProfiles : [...RESTRICTED_USER_PROFILES],
  }
}

type AuthState = {
  token: string | null
  email: string | null
  name: string | null
  devices: string[]
  profiles: string[]
  setAuth: (token: string, email: string, name: string) => void
  setDevices: (devices: string[], profiles: string[]) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      name: null,
      devices: [],
      profiles: [],
      setAuth: (token, email, name) => set({ token, email, name }),
      setDevices: (devices, profiles) => set((state) => {
        const scoped = getScopedAccountAccess(state.email, devices, profiles)
        return { devices: scoped.devices, profiles: scoped.profiles }
      }),
      clearAuth: () => set({ token: null, email: null, name: null, devices: [], profiles: [] }),
    }),
    { name: 'feeder-auth' }
  )
)
