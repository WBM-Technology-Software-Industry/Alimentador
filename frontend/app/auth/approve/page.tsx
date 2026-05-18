"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Lock, Mail, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiQrApprove } from "@/lib/api"

function ApproveContent() {
  const params = useSearchParams()
  const sessionId = params.get("s") ?? ""

  const [email,    setEmail]    = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading,  setLoading]  = React.useState(false)
  const [error,    setError]    = React.useState("")
  const [done,     setDone]     = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId) { setError("Link inválido."); return }
    setLoading(true)
    setError("")
    try {
      await apiQrApprove(sessionId, email, password)
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("fetch")) {
        setError("Sem conexão com o servidor.")
      } else if (msg.includes("expirado") || msg.includes("GONE")) {
        setError("QR expirado. Gere um novo na tela de login.")
      } else {
        setError("E-mail ou senha incorretos.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold">Login aprovado!</h1>
          <p className="text-muted-foreground text-sm">
            Você pode voltar ao computador. A sessão foi autenticada com sucesso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Aprovar login</h1>
            <p className="text-muted-foreground text-xs">Entre com sua conta para liberar o acesso</p>
          </div>
        </div>

        {!sessionId && (
          <p className="text-sm text-destructive text-center">Link inválido ou expirado.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="seu@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-9 h-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9 h-10"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full h-10" disabled={loading || !sessionId}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Aprovando…
              </span>
            ) : (
              "Aprovar login no desktop"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Este link expira em 2 minutos.
        </p>
      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ApproveContent />
    </React.Suspense>
  )
}
