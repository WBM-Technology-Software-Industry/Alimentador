"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, QrCode, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { apiQrGenerate, apiQrPoll, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, verifyOtp } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loginMode, setLoginMode] = React.useState<"credentials" | "qr">("credentials");
  const [step, setStep] = React.useState<"credentials" | "otp">("credentials");
  const [tempToken, setTempToken] = React.useState("");
  const [totpEnabled, setTotpEnabled] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [qrUri, setQrUri] = React.useState("");
  const [qrSessionId, setQrSessionId] = React.useState("");
  const [qrCountdown, setQrCountdown] = React.useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn(email, password);
      if (result.pending) {
        setTempToken(result.tempToken);
        setTotpEnabled(result.totpEnabled);
        setStep("otp");
        setLoading(false);
      } else {
        router.push("/dashboard/pedidos");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Failed to fetch" || msg.includes("fetch")) {
        setError("Não foi possível conectar ao servidor. Verifique sua conexão.");
      } else {
        setError("Conta não encontrada ou acesso negado. Entre em contato com o administrador.");
      }
      setLoading(false);
    }
  }

  // Gera QR e inicia polling
  const startQrLogin = React.useCallback(async () => {
    setLoading(true)
    setError("")
    setQrUri("")
    setQrSessionId("")
    try {
      const { sessionId, qrUri: uri } = await apiQrGenerate()
      setQrUri(uri)
      setQrSessionId(sessionId)
      setQrCountdown(120)
    } catch {
      setError("Não foi possível gerar o QR code.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Inicia QR ao entrar no modo QR
  React.useEffect(() => {
    if (loginMode === "qr" && step === "credentials") {
      startQrLogin()
    }
  }, [loginMode, step, startQrLogin])

  // Polling de status do QR
  React.useEffect(() => {
    if (!qrSessionId || loginMode !== "qr") return
    const interval = setInterval(async () => {
      try {
        const result = await apiQrPoll(qrSessionId)
        if (result.status === "approved" && result.token) {
          clearInterval(interval)
          setToken(result.token)
          window.location.href = "/dashboard/pedidos"
        } else if (result.status === "expired") {
          clearInterval(interval)
          setQrUri("")
          setQrSessionId("")
          setQrCountdown(0)
        }
      } catch { /* ignora erros de rede */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [qrSessionId, loginMode])

  // Countdown do QR
  React.useEffect(() => {
    if (qrCountdown <= 0) return
    const t = setInterval(() => setQrCountdown(c => {
      if (c <= 1) { setQrUri(""); setQrSessionId(""); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [qrCountdown])

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyOtp(tempToken, otpCode);
      router.push("/dashboard/pedidos");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Failed to fetch" || msg.includes("fetch")) {
        setError("Não foi possível conectar ao servidor. Verifique sua conexão.");
      } else {
        setError("Código inválido ou expirado. Tente novamente.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[oklch(0.13_0_0)]">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow blob top-right */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[oklch(0.65_0.18_132)] opacity-10 blur-[120px]" />
        {/* Glow blob bottom-left */}
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[oklch(0.55_0.16_145)] opacity-8 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <img
            src="https://wbmtechnology.com.br/wp-content/uploads/2024/10/logo041.png"
            alt="WBM Technology"
            className="h-56 w-auto object-contain brightness-0 invert translate-y-6"
          />

          {/* Center content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[oklch(0.65_0.18_132)/30] bg-[oklch(0.65_0.18_132)/8] text-[oklch(0.77_0.20_131)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.77_0.20_131)]" />
                Plataforma Empresarial
              </div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Gerenciando com{" "}
                <span className="text-[oklch(0.77_0.20_131)]">
                  Inteligência
                </span>
              </h1>
              <p className="text-[oklch(0.65_0_0)] text-base leading-relaxed max-w-sm">
                Acesse métricas em tempo real, relatórios avançados e controle
                total das suas operações em um único lugar.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                "Dashboard com métricas em tempo real",
                "Relatórios e análises avançadas",
                "Gestão de equipes e permissões",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[oklch(0.65_0.18_132)/15] border border-[oklch(0.65_0.18_132)/30] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4 7L8 3"
                        stroke="oklch(0.77 0.20 131)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-[oklch(0.75_0_0)] text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center gap-8">
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "256-bit", label: "Criptografia" },
              { value: "24/7", label: "Suporte" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-white font-semibold text-lg">
                  {stat.value}
                </div>
                <div className="text-[oklch(0.50_0_0)] text-xs">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <img
              src="https://wbmtechnology.com.br/wp-content/uploads/2024/10/logo041.png"
              alt="WBM Technology"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Mode toggle (only on credentials step) */}
          {step === "credentials" && (
            <div className="flex rounded-lg border border-border p-1 gap-1">
              <button
                onClick={() => { setLoginMode("credentials"); setError("") }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${loginMode === "credentials" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <KeyRound className="w-4 h-4" /> Senha
              </button>
              <button
                onClick={() => { setLoginMode("qr"); setError("") }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${loginMode === "qr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <QrCode className="w-4 h-4" /> QR Code
              </button>
            </div>
          )}

          {step === "credentials" && loginMode === "qr" ? (
            <div className="space-y-5">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Entrar via QR Code</h2>
                <p className="text-muted-foreground text-sm">
                  Escaneie o código com seu celular e<br />entre com sua conta para liberar o acesso.
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Gerando QR…</p>
                </div>
              ) : qrUri ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img src={qrUri} alt="QR Code de login" className="w-52 h-52 rounded-xl border" />
                    {qrCountdown <= 15 && qrCountdown > 0 && (
                      <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">{qrCountdown}</span>
                      </div>
                    )}
                    {qrCountdown === 0 && (
                      <div className="absolute inset-0 rounded-xl bg-black/70 flex flex-col items-center justify-center gap-2">
                        <span className="text-white text-sm">Expirado</span>
                        <button onClick={startQrLogin} className="text-xs text-primary-foreground bg-primary px-3 py-1.5 rounded-md">
                          Gerar novo
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando leitura…
                    {qrCountdown > 0 && <span className="ml-1">({qrCountdown}s)</span>}
                  </p>
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <button onClick={startQrLogin} className="text-sm text-primary hover:underline">
                    Gerar QR code
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          ) : step === "credentials" ? (
            <>
              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground text-sm">
                  Entre com suas credenciais para acessar o painel
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-9 h-10"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    "Entrar na plataforma"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* OTP Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Verificação em duas etapas</h2>
                    <p className="text-muted-foreground text-sm">
                      {totpEnabled
                        ? "Abra o Google Authenticator e digite o código de 6 dígitos."
                        : <>Enviamos um código para <span className="font-medium text-foreground">{email}</span></>
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="otp">{totpEnabled ? "Código do Authenticator" : "Código de verificação"}</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                  {!totpEnabled && <p className="text-xs text-muted-foreground">O código expira em 10 minutos.</p>}
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-medium"
                  disabled={loading || otpCode.length < 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    "Confirmar código"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setOtpCode(""); setError(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar ao login
                </button>
              </form>
            </>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-background text-xs text-muted-foreground">
                Acesso seguro
              </span>
            </div>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-6">
            {["SSL/TLS", "ISO 27001", "LGPD"].map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Lock className="w-3 h-3" />
                {badge}
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Ao entrar, você concorda com nossos{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Termos de Uso
            </a>{" "}
            e{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
