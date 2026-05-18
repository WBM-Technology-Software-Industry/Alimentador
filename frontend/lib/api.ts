const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api"

// ─── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("sanctum_token")
}

export function setToken(token: string): void {
  localStorage.setItem("sanctum_token", token)
}

export function clearToken(): void {
  localStorage.removeItem("sanctum_token")
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    if (res.status === 403 && token && isTokenExpired(token)) {
      clearToken()
      window.dispatchEvent(new Event("auth:expired"))
    }
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error((error as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number
  uid: string
  name: string
  displayName: string
  email: string
  avatarUrl?: string
}

function normalizeUser(raw: { id: number; name: string; email: string; avatar_url?: string | null }): ApiUser {
  const avatarUrl = raw.avatar_url
    ? (raw.avatar_url.startsWith("http") ? raw.avatar_url : `${API_BASE}/${raw.avatar_url}`)
    : undefined
  return { ...raw, uid: String(raw.id), displayName: raw.name, avatarUrl }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type LoginResult =
  | { pending: true; tempToken: string; totpEnabled: boolean }
  | { pending: false; user: ApiUser }

export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  const data = await apiFetch<{ pending?: boolean; temp_token?: string; totp_enabled?: boolean; token?: string; user?: { id: number; name: string; email: string; avatar_url?: string | null } }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  if (data.pending) {
    return { pending: true, tempToken: data.temp_token!, totpEnabled: data.totp_enabled ?? false }
  }
  setToken(data.token!)
  return { pending: false, user: normalizeUser(data.user!) }
}

export async function apiVerifyOtp(tempToken: string, code: string): Promise<ApiUser> {
  const data = await apiFetch<{ token: string; user: { id: number; name: string; email: string; avatar_url?: string | null } }>("/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({ temp_token: tempToken, code }),
  })
  setToken(data.token)
  return normalizeUser(data.user)
}

export async function apiLogout(): Promise<void> {
  await apiFetch("/logout", { method: "POST" }).catch(() => {})
  clearToken()
}

export async function apiMe(): Promise<ApiUser> {
  const raw = await apiFetch<{ id: number; name: string; email: string; avatar_url?: string | null }>("/me")
  return normalizeUser(raw)
}

export async function apiUpdateMe(data: { name?: string }, avatar?: File | null): Promise<ApiUser> {
  const form = new FormData()
  if (data.name !== undefined) form.append("name", data.name)
  if (avatar) form.append("avatar", avatar)
  const token = getToken()
  const res = await fetch(`${API_BASE}/me`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? "Erro ao atualizar perfil")
  }
  const raw = await res.json() as { id: number; name: string; email: string; avatar_url?: string | null }
  return normalizeUser(raw)
}

// ─── OPs (Omie) ───────────────────────────────────────────────────────────────

const prioridadeCompat: Record<string, string> = { medio: "media", normal: "media" }

function parseDateBR(val: unknown): string {
  if (!val || typeof val !== "string") return ""
  // DD/MM/YYYY → YYYY-MM-DD
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return val
}

function normalizeOP<T>(raw: Record<string, unknown>): T {
  const p = raw.prioridade as string | undefined
  const itemStr = (raw.item as string | undefined) ?? ""
  const items = Array.isArray(raw.items)
    ? raw.items
    : itemStr ? [{ name: itemStr, quantity: 1 }] : []
  const linkedOrders = Array.isArray(raw.linkedOrders)
    ? raw.linkedOrders
    : Array.isArray(raw.linked_orders)
      ? raw.linked_orders
      : []
  return {
    ...raw,
    id:                  String(raw.id),
    items,
    responsible:         raw.responsible ?? raw.responsavel ?? "",
    sector:              raw.sector      ?? raw.setor       ?? "",
    openedAt:            parseDateBR(raw.openedAt    ?? raw.opened_at   ?? raw.abertura),
    deliveryAt:          parseDateBR(raw.deliveryAt  ?? raw.delivery_at ?? raw.prev_entrega),
    linkedOrders,
    fabricacaoStartedAt: raw.fabricacaoStartedAt ?? raw.fabricacao_started_at ?? undefined,
    fabricacaoEndedAt:   raw.fabricacaoEndedAt   ?? raw.fabricacao_ended_at   ?? undefined,
    prioridade:          p ? (prioridadeCompat[p] ?? p) : p,
  } as T
}

export async function apiGetOPs<T>(): Promise<T[]> {
  const data = await apiFetch<Record<string, unknown>[]>("/omie/ops")
  return data.map(op => normalizeOP<T>(op))
}

// ─── Clientes (Omie) ──────────────────────────────────────────────────────────

interface OmieCliente {
  id: string
  nome: string
  documento?: string
  email?: string
  telefone?: string
  endereco?: string
}

export async function apiGetClients<T>(): Promise<T[]> {
  const data = await apiFetch<OmieCliente[]>("/omie/clientes")
  return data.map((c, i) => ({
    id: c.id || c.nome || String(i),
    nome: c.nome ?? "",
    documento: c.documento ?? "",
    email: c.email ?? "",
    telefone: c.telefone ?? "",
    endereco: c.endereco ?? "",
    criadoEm: "",
  } as unknown as T))
}

// ─── Pedidos Separação (Omie) ─────────────────────────────────────────────────

interface OmiePedidoSeparacao {
  numero_pedido: string
  numero_pedido_cliente?: string
  nome_cliente: string
  itens: string[]
  data_entrada: string
  data_prazo: string
  status?: string
  dados_adicionais?: string
}

function omieDataToISO(ddmmyyyy: string): string {
  if (!ddmmyyyy) return ""
  const p = ddmmyyyy.split("/")
  if (p.length !== 3) return ""
  return `${p[2]}-${p[1]}-${p[0]}`
}

export async function apiGetOmiePedidosSeparacao<T>(): Promise<T[]> {
  const data = await apiFetch<OmiePedidoSeparacao[]>("/omie/pedidos-separacao")
  return data.map(p => ({
    id: p.numero_pedido,
    numero: p.numero_pedido,
    numeroCliente: p.numero_pedido_cliente ?? undefined,
    cliente: p.nome_cliente,
    items: p.itens.map(desc => ({ name: desc, quantity: 1 })),
    prioridade: "media",
    status: p.status ?? "pendente",
    dataEntrada: omieDataToISO(p.data_entrada),
    dataPrazo: omieDataToISO(p.data_prazo),
    criadoEm: omieDataToISO(p.data_entrada),
    dadosAdicionais: p.dados_adicionais ?? undefined,
  } as unknown as T))
}

// ─── Vínculos Pedido ↔ OP ────────────────────────────────────────────────────

export interface Vinculo {
  pedido_numero: string
  op_id: string
}

export async function apiGetVinculos(): Promise<Vinculo[]> {
  return apiFetch<Vinculo[]>("/vinculos")
}

export async function apiVincular(pedidoNumero: string, opId: string): Promise<void> {
  await apiFetch<void>("/vinculos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedido_numero: pedidoNumero, op_id: opId }),
  })
}

export async function apiDesvincular(pedidoNumero: string, opId: string): Promise<void> {
  await apiFetch<void>(`/vinculos/${pedidoNumero}/${opId}`, { method: "DELETE" })
}

// ─── OMIE Proxy ───────────────────────────────────────────────────────────────

export async function apiOmieProxy<T>(
  endpoint: string,
  call: string,
  param: unknown[] = [{}]
): Promise<T> {
  return apiFetch<T>("/omie/proxy", {
    method: "POST",
    body: JSON.stringify({ endpoint, call, param }),
  })
}

// ─── Pedidos Entregues (DB) ───────────────────────────────────────────────────

export async function apiGetEntregues<T>(): Promise<T[]> {
  const data = await apiFetch<Record<string, unknown>[]>("/pedidos/entregues")
  return data.map(p => ({
    id:              String(p.id),
    numero:          String(p.numero_pedido ?? ""),
    numeroCliente:   p.numero_pedido_cliente ? String(p.numero_pedido_cliente) : undefined,
    cliente:         String(p.cliente ?? ""),
    items:           Array.isArray(p.items)
                       ? (p.items as Record<string, unknown>[]).map(i => ({ name: String(i.name ?? ""), quantity: Number(i.quantity ?? 1) }))
                       : [],
    prioridade:      "media",
    status:          "entregue",
    dataEntrada:     p.data_entrada ? String(p.data_entrada).substring(0, 10) : "",
    dataPrazo:       p.data_prazo   ? String(p.data_prazo).substring(0, 10)   : "",
    criadoEm:        String(p.created_at ?? ""),
    dadosAdicionais: p.dados_adicionais ? String(p.dados_adicionais) : undefined,
  } as unknown as T))
}

export async function apiDeleteEntregue(id: string): Promise<void> {
  await apiFetch(`/pedidos/${id}`, { method: "DELETE" })
}

// ─── Mensagem da Semana ───────────────────────────────────────────────────────

export interface MensagemSemana {
  id: string
  conteudo: string
  responsavel: string
  semana_inicio: string
  created_at: string
  updated_at: string
}

function normalizeMensagem(raw: Record<string, unknown>): MensagemSemana {
  return {
    id:            String(raw.id),
    conteudo:      String(raw.conteudo ?? ""),
    responsavel:   String(raw.responsavel ?? ""),
    semana_inicio: String(raw.semana_inicio ?? "").substring(0, 10),
    created_at:    String(raw.created_at ?? ""),
    updated_at:    String(raw.updated_at ?? ""),
  }
}

export async function apiGetMensagensSemana(): Promise<MensagemSemana[]> {
  const data = await apiFetch<Record<string, unknown>[]>("/mensagens-semana")
  return data.map(normalizeMensagem)
}

export async function apiGetMensagemAtual(): Promise<MensagemSemana | null> {
  const raw = await apiFetch<Record<string, unknown> | null>("/mensagens-semana/current")
  if (!raw) return null
  return normalizeMensagem(raw)
}

export async function apiCreateMensagemSemana(data: {
  conteudo: string
  responsavel: string
  semana_inicio?: string
}): Promise<MensagemSemana> {
  const raw = await apiFetch<Record<string, unknown>>("/mensagens-semana", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return normalizeMensagem(raw)
}

export async function apiDeleteMensagemSemana(id: string): Promise<void> {
  await apiFetch(`/mensagens-semana/${id}`, { method: "DELETE" })
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────

export async function apiTotpStatus(): Promise<{ enabled: boolean }> {
  return apiFetch("/me/totp/status")
}

export async function apiTotpSetup(): Promise<{ secret: string; qrUri: string }> {
  return apiFetch("/me/totp/setup")
}

export async function apiTotpEnable(code: string): Promise<void> {
  await apiFetch("/me/totp/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}

export async function apiTotpDisable(code: string): Promise<void> {
  await apiFetch("/me/totp/disable", {
    method: "DELETE",
    body: JSON.stringify({ code }),
  })
}

// ─── QR Login ─────────────────────────────────────────────────────────────────

export async function apiQrGenerate(): Promise<{ sessionId: string; qrUri: string }> {
  return apiFetch("/auth/qr/generate", { method: "POST" })
}

export async function apiQrPoll(sessionId: string): Promise<{ status: "pending" | "approved" | "expired"; token: string }> {
  return apiFetch(`/auth/qr/poll/${sessionId}`)
}

export async function apiQrApprove(sessionId: string, email: string, password: string): Promise<void> {
  await apiFetch(`/auth/qr/approve/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}
