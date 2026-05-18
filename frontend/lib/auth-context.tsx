"use client"

import * as React from "react"
import { apiLogin, apiLogout, apiMe, apiUpdateMe, apiVerifyOtp, type ApiUser } from "./api"

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ pending: true; tempToken: string; totpEnabled: boolean } | { pending: false }>
  verifyOtp: (tempToken: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  updateUserPassword: (newPassword: string) => Promise<void>
  updatePhoto: (file: File) => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    const handleExpired = () => setUser(null)
    window.addEventListener("auth:expired", handleExpired)
    return () => window.removeEventListener("auth:expired", handleExpired)
  }, [])

  const signIn = React.useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    if (!result.pending) {
      setUser(result.user)
      return { pending: false as const }
    }
    return { pending: true as const, tempToken: result.tempToken, totpEnabled: result.totpEnabled }
  }, [])

  const verifyOtp = React.useCallback(async (tempToken: string, code: string) => {
    const u = await apiVerifyOtp(tempToken, code)
    setUser(u)
  }, [])

  const signOut = React.useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const updateDisplayName = React.useCallback(async (name: string) => {
    if (!user) throw new Error("Não autenticado")
    const updated = await apiUpdateMe({ name })
    setUser(updated)
  }, [user])

  // TODO: adicionar PUT /me/password no backend
  const updateUserPassword = React.useCallback(async (_newPassword: string) => {
    // endpoint não disponível ainda
  }, [])

  const updatePhoto = React.useCallback(async (file: File) => {
    if (!user) throw new Error("Não autenticado")
    const updated = await apiUpdateMe({}, file)
    setUser(updated)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, verifyOtp, signOut, updateDisplayName, updateUserPassword, updatePhoto }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
