import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  token: string | null
  email: string | null
  name: string | null
  setAuth: (token: string, email: string, name: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      name: null,
      setAuth: (token, email, name) => set({ token, email, name }),
      clearAuth: () => set({ token: null, email: null, name: null }),
    }),
    { name: 'feeder-auth' }
  )
)
