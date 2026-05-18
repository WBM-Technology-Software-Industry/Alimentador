"use client"

import * as React from "react"
import { User, Mail, Lock, Save, Eye, EyeOff, CheckCircle2, Camera, Loader2, ShieldCheck, ShieldOff, ScanLine, QrCode, RefreshCw } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { apiTotpStatus, apiTotpSetup, apiTotpEnable, apiTotpDisable, apiQrGenerate } from "@/lib/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateDisplayName, updateUserPassword, updatePhoto } = useAuth()

  // ── Nome ───────────────────────────────────────────────────────────────────
  const [nome,       setNome]       = React.useState(user?.displayName ?? "")
  const [savingNome, setSavingNome] = React.useState(false)
  const [nomeOk,     setNomeOk]     = React.useState(false)
  const [nomeError,  setNomeError]  = React.useState("")

  const handleSaveNome = React.useCallback(async () => {
    if (!nome.trim()) return
    setSavingNome(true)
    setNomeError("")
    setNomeOk(false)
    try {
      await updateDisplayName(nome.trim())
      setNomeOk(true)
      setTimeout(() => setNomeOk(false), 3000)
    } catch {
      setNomeError("Não foi possível atualizar o nome.")
    } finally {
      setSavingNome(false)
    }
  }, [nome, updateDisplayName])

  // ── Senha ──────────────────────────────────────────────────────────────────
  const [novaSenha,    setNovaSenha]    = React.useState("")
  const [confirmSenha, setConfirmSenha] = React.useState("")
  const [showNova,     setShowNova]     = React.useState(false)
  const [showConfirm,  setShowConfirm]  = React.useState(false)
  const [savingSenha,  setSavingSenha]  = React.useState(false)
  const [senhaOk,      setSenhaOk]      = React.useState(false)
  const [senhaError,   setSenhaError]   = React.useState("")

  const senhaValida = novaSenha.length >= 6 && novaSenha === confirmSenha

  const handleSaveSenha = React.useCallback(async () => {
    if (!senhaValida) return
    setSavingSenha(true)
    setSenhaError("")
    setSenhaOk(false)
    try {
      await updateUserPassword(novaSenha)
      setSenhaOk(true)
      setNovaSenha("")
      setConfirmSenha("")
      setTimeout(() => setSenhaOk(false), 3000)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === "auth/weak-password") {
        setSenhaError("A nova senha deve ter pelo menos 6 caracteres.")
      } else if (code === "auth/requires-recent-login") {
        setSenhaError("Sessão expirada. Faça logout e entre novamente para alterar a senha.")
      } else {
        setSenhaError("Não foi possível atualizar a senha.")
      }
    } finally {
      setSavingSenha(false)
    }
  }, [novaSenha, senhaValida, updateUserPassword])

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Usuário"

  // ── QR de Login ───────────────────────────────────────────────────────────
  const [qrUri,        setQrUri]        = React.useState("")
  const [qrCountdown,  setQrCountdown]  = React.useState(0)
  const [qrLoading,    setQrLoading]    = React.useState(false)
  const [qrError,      setQrError]      = React.useState("")

  const handleGenerateQr = React.useCallback(async () => {
    setQrLoading(true)
    setQrError("")
    try {
      const { qrUri: uri } = await apiQrGenerate()
      setQrUri(uri)
      setQrCountdown(60)
    } catch {
      setQrError("Não foi possível gerar o QR code.")
    } finally {
      setQrLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (qrCountdown <= 0) return
    const t = setInterval(() => setQrCountdown(c => {
      if (c <= 1) { setQrUri(""); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [qrCountdown])

  // ── TOTP ───────────────────────────────────────────────────────────────────
  const [totpEnabled,    setTotpEnabled]    = React.useState<boolean | null>(null)
  const [totpPhase,      setTotpPhase]      = React.useState<"idle" | "setup" | "disable">("idle")
  const [totpQr,         setTotpQr]         = React.useState("")
  const [totpCode,       setTotpCode]       = React.useState("")
  const [totpLoading,    setTotpLoading]    = React.useState(false)
  const [totpError,      setTotpError]      = React.useState("")
  const [totpOk,         setTotpOk]         = React.useState(false)

  React.useEffect(() => {
    apiTotpStatus().then(r => setTotpEnabled(r.enabled)).catch(() => setTotpEnabled(false))
  }, [])

  const handleTotpSetupStart = async () => {
    setTotpLoading(true)
    setTotpError("")
    try {
      const { qrUri } = await apiTotpSetup()
      setTotpQr(qrUri)
      setTotpCode("")
      setTotpPhase("setup")
    } catch {
      setTotpError("Não foi possível iniciar o setup.")
    } finally {
      setTotpLoading(false)
    }
  }

  const handleTotpEnable = async () => {
    if (totpCode.length < 6) return
    setTotpLoading(true)
    setTotpError("")
    try {
      await apiTotpEnable(totpCode)
      setTotpEnabled(true)
      setTotpPhase("idle")
      setTotpOk(true)
      setTimeout(() => setTotpOk(false), 3000)
    } catch {
      setTotpError("Código inválido. Tente novamente.")
    } finally {
      setTotpLoading(false)
    }
  }

  const handleTotpDisable = async () => {
    if (totpCode.length < 6) return
    setTotpLoading(true)
    setTotpError("")
    try {
      await apiTotpDisable(totpCode)
      setTotpEnabled(false)
      setTotpPhase("idle")
      setTotpOk(true)
      setTimeout(() => setTotpOk(false), 3000)
    } catch {
      setTotpError("Código inválido. Tente novamente.")
    } finally {
      setTotpLoading(false)
    }
  }

  // ── Foto de perfil ─────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false)
  const [photoError,     setPhotoError]     = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handlePhotoClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError("")
    try {
      await updatePhoto(file)
    } catch {
      setPhotoError("Não foi possível salvar a foto.")
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gerencie suas informações pessoais e senha de acesso
        </p>
      </div>

      {/* Avatar + info */}
      <Card className="gap-0 py-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Clickable avatar with camera overlay */}
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className="relative w-16 h-16 rounded-full shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
              aria-label="Alterar foto de perfil"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Foto de perfil"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {initials(displayName)}
                </div>
              )}
              {/* Camera overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-disabled:opacity-100 transition-opacity">
                {uploadingPhoto
                  ? <Loader2 className="size-5 text-white animate-spin" />
                  : <Camera className="size-5 text-white" />
                }
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="size-3.5" />
                {user?.email}
              </p>
              {photoError && <p className="text-xs text-destructive mt-1">{photoError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar nome */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Nome de exibição</CardTitle>
          </div>
          <CardDescription>
            Este nome aparece no sidebar e nos relatórios criados por você.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-nome">Nome completo</Label>
            <Input
              id="p-nome"
              placeholder="Seu nome"
              value={nome}
              onChange={e => { setNome(e.target.value); setNomeOk(false); setNomeError("") }}
            />
          </div>

          {nomeError && <p className="text-sm text-destructive">{nomeError}</p>}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveNome}
              disabled={savingNome || !nome.trim() || nome.trim() === (user?.displayName ?? "")}
              size="sm"
            >
              <Save className="size-3.5" />
              {savingNome ? "Salvando…" : "Salvar Nome"}
            </Button>
            {nomeOk && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Nome atualizado!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR de Login */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">QR Code de login</CardTitle>
          </div>
          <CardDescription>
            Gere um código temporário para entrar em outro dispositivo sem digitar a senha. Válido por 60 segundos.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5 space-y-4">
          {qrUri ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img src={qrUri} alt="QR Code de login" className="w-44 h-44 rounded-lg border" />
                {qrCountdown <= 10 && (
                  <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">{qrCountdown}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={qrCountdown <= 10 ? "text-destructive font-medium" : ""}>
                  Expira em {qrCountdown}s
                </span>
                <button onClick={handleGenerateQr} disabled={qrLoading} className="flex items-center gap-1 text-primary hover:underline">
                  <RefreshCw className="size-3" /> Renovar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-44 h-44 rounded-lg border border-dashed flex items-center justify-center bg-muted/30">
                <QrCode className="size-16 text-muted-foreground/30" />
              </div>
              <Button size="sm" onClick={handleGenerateQr} disabled={qrLoading}>
                {qrLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><QrCode className="size-3.5" /> Gerar QR de login</>}
              </Button>
            </div>
          )}
          {qrError && <p className="text-sm text-destructive text-center">{qrError}</p>}
        </CardContent>
      </Card>

      {/* Autenticação de dois fatores */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Autenticação de dois fatores (2FA)</CardTitle>
          </div>
          <CardDescription>
            Use o Google Authenticator ou Microsoft Authenticator para proteger sua conta.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5 space-y-4">
          {totpEnabled === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : totpPhase === "idle" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {totpEnabled ? (
                  <><ShieldCheck className="size-4 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 font-medium">2FA ativo</span></>
                ) : (
                  <><ShieldOff className="size-4 text-muted-foreground" /><span className="text-muted-foreground">2FA inativo</span></>
                )}
              </div>
              <Button
                size="sm"
                variant={totpEnabled ? "destructive" : "default"}
                onClick={totpEnabled ? () => { setTotpPhase("disable"); setTotpCode(""); setTotpError("") } : handleTotpSetupStart}
                disabled={totpLoading}
              >
                {totpLoading ? <Loader2 className="size-3.5 animate-spin" /> : totpEnabled ? <><ShieldOff className="size-3.5" /> Desativar</> : <><ScanLine className="size-3.5" /> Ativar 2FA</>}
              </Button>
            </div>
          ) : totpPhase === "setup" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR code com o <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong>:
              </p>
              {totpQr && (
                <div className="flex justify-center">
                  <img src={totpQr} alt="QR Code 2FA" className="w-44 h-44 rounded-lg border" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="totp-code">Digite o código gerado pelo app para confirmar</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={e => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setTotpError("") }}
                  className="text-center tracking-[0.5em] font-mono text-lg h-11"
                  autoFocus
                />
              </div>
              {totpError && <p className="text-sm text-destructive">{totpError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleTotpEnable} disabled={totpLoading || totpCode.length < 6}>
                  {totpLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><CheckCircle2 className="size-3.5" /> Confirmar e ativar</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setTotpPhase("idle"); setTotpError("") }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite o código atual do Authenticator para confirmar a desativação:
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="totp-disable-code">Código do Authenticator</Label>
                <Input
                  id="totp-disable-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={e => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setTotpError("") }}
                  className="text-center tracking-[0.5em] font-mono text-lg h-11"
                  autoFocus
                />
              </div>
              {totpError && <p className="text-sm text-destructive">{totpError}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleTotpDisable} disabled={totpLoading || totpCode.length < 6}>
                  {totpLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><ShieldOff className="size-3.5" /> Desativar 2FA</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setTotpPhase("idle"); setTotpError("") }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {totpOk && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              {totpEnabled ? "2FA ativado com sucesso!" : "2FA desativado."}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Alterar senha</CardTitle>
          </div>
          <CardDescription>
            Defina uma nova senha com mínimo de 6 caracteres.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5 space-y-4">

          {/* Nova senha */}
          <div className="space-y-1.5">
            <Label htmlFor="p-nova">Nova senha</Label>
            <div className="relative">
              <Input
                id="p-nova"
                type={showNova ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={e => { setNovaSenha(e.target.value); setSenhaError(""); setSenhaOk(false) }}
                className={cn(
                  "pr-9",
                  novaSenha.length > 0 && novaSenha.length < 6 && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowNova(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNova ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {novaSenha.length > 0 && novaSenha.length < 6 && (
              <p className="text-xs text-destructive">Mínimo de 6 caracteres</p>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div className="space-y-1.5">
            <Label htmlFor="p-confirm">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="p-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmSenha}
                onChange={e => { setConfirmSenha(e.target.value); setSenhaError(""); setSenhaOk(false) }}
                className={cn(
                  "pr-9",
                  confirmSenha.length > 0 && confirmSenha !== novaSenha && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmSenha.length > 0 && confirmSenha !== novaSenha && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          {senhaError && <p className="text-sm text-destructive">{senhaError}</p>}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveSenha}
              disabled={savingSenha || !senhaValida}
              size="sm"
            >
              <Save className="size-3.5" />
              {savingSenha ? "Salvando…" : "Alterar Senha"}
            </Button>
            {senhaOk && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Senha atualizada!
              </span>
            )}
          </div>

        </CardContent>
      </Card>

    </div>
  )
}
