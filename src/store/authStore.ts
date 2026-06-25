import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      setDevices: (devices, profiles) => set({ devices, profiles }),
      clearAuth: () => set({ token: null, email: null, name: null, devices: [], profiles: [] }),
    }),
    { name: 'feeder-auth' }
  )
)
