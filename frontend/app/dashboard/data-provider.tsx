"use client"

import * as React from "react"
import {
  apiGetOmiePedidosSeparacao,
  apiGetOPs,
  apiGetClients,
  apiGetVinculos,
  apiGetEntregues,
  apiDeleteEntregue,
  apiVincular,
  apiDesvincular,
  type Vinculo,
} from "@/lib/api"

// ─── Types — Pedidos ─────────────────────────────────────────────────────────

export type Prioridade = "urgente" | "alta" | "media" | "baixa"
export type OrderStatus = "pendente" | "fabricacao" | "producao" | "concluido" | "entregue" | "cancelado"

export interface OrderItem {
  name: string
  quantity: number
}

export interface Order {
  id: string
  numero: string
  numeroCliente?: string
  cliente: string
  items: OrderItem[]
  prioridade: Prioridade
  status: OrderStatus
  dataEntrada: string   // YYYY-MM-DD
  dataPrazo: string     // YYYY-MM-DD
  dadosAdicionais?: string
  criadoEm: string      // ISO string
  atualizadoEm?: string
  createdBy?: string
  updatedBy?: string
}

// ─── Types — Ordens de Produção ───────────────────────────────────────────────

export type OPStatus = "pendente" | "fabricacao" | "producao" | "cancelado" | "concluido"
export type OPTipo = "interno" | "externo"

export interface ProductionOrder {
  id: string
  numero: string
  tipo: OPTipo
  empresa?: string
  items: OrderItem[]
  status: OPStatus
  prioridade: Prioridade
  openedAt: string
  deliveryAt: string
  responsible: string
  sector: string
  linkedOrders: string[]
  fabricacaoStartedAt?: string
  fabricacaoEndedAt?: string
}

// ─── Types — Equipe ───────────────────────────────────────────────────────────

export type MemberStatus = "ativo" | "inativo"
export type MemberPermissao = "admin" | "editor" | "viewer"

export interface TeamMember {
  id: string
  nome: string
  cargo: string
  setor: string
  email: string
  telefone?: string
  status: MemberStatus
  permissao: MemberPermissao
  criadoEm: string
  atualizadoEm?: string
}

// ─── Types — Clientes ────────────────────────────────────────────────────────

export interface Client {
  id: string
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
  criadoEm: string
  atualizadoEm?: string
}

// ─── Types — Suporte ─────────────────────────────────────────────────────────

export type TicketTipo       = "bug" | "melhoria" | "outro"
export type TicketPrioridade = "alta" | "media" | "baixa"
export type TicketStatus     = "aberto" | "em_analise" | "resolvido"

export interface Ticket {
  id: string
  titulo: string
  descricao: string
  tipo: TicketTipo
  prioridade: TicketPrioridade
  status: TicketStatus
  criadoEm: string
  criadoPor?: string
}

// ─── Types — Ordens de Serviço ────────────────────────────────────────────────

export type OSStatus = "pendente" | "em_andamento" | "concluido" | "cancelado"
export type OSTipo = "interno" | "externo"

export interface ServiceOrder {
  id: string
  numero: string
  tipo: OSTipo
  opRef?: string
  descricao: string
  cliente: string
  items: OrderItem[]
  status: OSStatus
  prioridade: Prioridade
  responsible: string
  sector: string
  dataAbertura: string
  dataPrevista: string
  iniciadoEm?: string
  linkedOrders: string[]
  criadoEm: string
  atualizadoEm?: string
  createdBy?: string
  updatedBy?: string
}

// ─── Types — Estoque ─────────────────────────────────────────────────────────

export interface StockItem {
  id: string
  nome: string
  codigo: string
  categoria: string
  quantidade: number
  quantidadeMinima: number
  unidade: string
  localizacao?: string
  preco?: number
  criadoEm: string
  atualizadoEm?: string
}

// ─── Types — Relatórios ───────────────────────────────────────────────────────

export interface ReportArquivo {
  id: string
  arquivo_path: string
  arquivo_nome: string
  arquivo_url: string
}

export interface Report {
  id: string
  titulo: string
  setor: string
  conteudo: string
  dataReferencia: string
  criadoEm: string
  atualizadoEm?: string
  autorNome: string
  criadoPor: string
  arquivos: ReportArquivo[]
  arquivoUrl?: string
  arquivoNome?: string
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppDataContextValue {
  // Pedidos
  orders: Order[]
  addOrder: (data: Omit<Order, "id" | "criadoEm" | "atualizadoEm">) => Promise<void>
  updateOrder: (id: string, updates: Partial<Omit<Order, "id" | "criadoEm">>) => Promise<void>
  deletePedido: (id: string) => Promise<void>
  concluirPedido: (id: string) => Promise<void>
  // Pedidos Concluídos
  concluidos: Order[]
  entregues: Order[]
  deleteEntregue: (id: string) => Promise<void>
  reverterPedido: (id: string, status: OrderStatus) => Promise<void>
  // OPs
  ops: ProductionOrder[]
  addOP: (op: Omit<ProductionOrder, "id">) => Promise<void>
  updateOP: (id: string, updates: Partial<Omit<ProductionOrder, "id">>) => Promise<void>
  deleteOP: (id: string) => Promise<void>
  // Vínculos
  vincular: (pedidoNumero: string, opId: string) => Promise<void>
  desvincular: (pedidoNumero: string, opId: string) => Promise<void>
  // Ordens de Serviço
  serviceOrders: ServiceOrder[]
  addOS: (os: Omit<ServiceOrder, "id">) => Promise<void>
  updateOS: (id: string, updates: Partial<Omit<ServiceOrder, "id">>) => Promise<void>
  deleteOS: (id: string) => Promise<void>
  // Equipe
  members: TeamMember[]
  addMember: (data: Omit<TeamMember, "id" | "criadoEm" | "atualizadoEm">) => Promise<void>
  updateMember: (id: string, updates: Partial<Omit<TeamMember, "id" | "criadoEm">>) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  // Clientes
  clients: Client[]
  addClient: (data: Omit<Client, "id" | "criadoEm" | "atualizadoEm">) => Promise<void>
  updateClient: (id: string, updates: Partial<Omit<Client, "id" | "criadoEm">>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  // Relatórios
  reports: Report[]
  addReport: (data: Omit<Report, "id" | "criadoEm" | "atualizadoEm">, arquivos?: File[]) => Promise<void>
  updateReport: (id: string, updates: Partial<Omit<Report, "id" | "criadoEm">>, arquivos?: File[]) => Promise<Report>
  deleteReport: (id: string) => Promise<void>
  deleteReportFile: (relatorioId: string, arquivoId: string) => Promise<void>
  // Estoque
  stockItems: StockItem[]
  addStockItem: (data: Omit<StockItem, "id" | "criadoEm" | "atualizadoEm">) => Promise<void>
  updateStockItem: (id: string, updates: Partial<Omit<StockItem, "id" | "criadoEm">>) => Promise<void>
  deleteStockItem: (id: string) => Promise<void>
  // Suporte
  tickets: Ticket[]
  addTicket: (data: Omit<Ticket, "id" | "criadoEm" | "status">) => Promise<void>
  deleteTicket: (id: string) => Promise<void>
  // Loading
  dataLoading: boolean
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [orders,    setOrders]    = React.useState<Order[]>([])
  const [rawOPs,    setRawOPs]    = React.useState<ProductionOrder[]>([])
  const [clients,   setClients]   = React.useState<Client[]>([])
  const [vinculos,  setVinculos]  = React.useState<Vinculo[]>([])
  const [entregues, setEntregues] = React.useState<Order[]>([])

  const activeOrders = React.useMemo<Order[]>(
    () => orders.filter(o => o.status !== "concluido" && o.status !== "entregue"),
    [orders]
  )
  const concluidos = React.useMemo<Order[]>(
    () => orders.filter(o => o.status === "concluido"),
    [orders]
  )
  const [serviceOrders] = React.useState<ServiceOrder[]>([])
  const [members]       = React.useState<TeamMember[]>([])
  const [reports]       = React.useState<Report[]>([])
  const [stockItems]    = React.useState<StockItem[]>([])
  const [tickets]       = React.useState<Ticket[]>([])

  const [ordersReady,   setOrdersReady]   = React.useState(false)
  const [opsReady,      setOpsReady]      = React.useState(false)
  const [clientsReady,  setClientsReady]  = React.useState(false)
  const [vinculosReady, setVinculosReady] = React.useState(false)

  // OPs com linkedOrders populado a partir dos vínculos
  const ops = React.useMemo<ProductionOrder[]>(() => {
    if (vinculos.length === 0) return rawOPs
    return rawOPs.map(op => ({
      ...op,
      linkedOrders: vinculos.filter(v => v.op_id === op.id).map(v => v.pedido_numero),
    }))
  }, [rawOPs, vinculos])

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchOrders = React.useCallback(async () => {
    try { setOrders(await apiGetOmiePedidosSeparacao<Order>()) } catch { /* keep existing */ }
    finally { setOrdersReady(true) }
  }, [])

  const fetchOPs = React.useCallback(async () => {
    try { setRawOPs(await apiGetOPs<ProductionOrder>()) } catch { setRawOPs([]) }
    finally { setOpsReady(true) }
  }, [])

  const fetchClients = React.useCallback(async () => {
    try { setClients(await apiGetClients<Client>()) } catch { setClients([]) }
    finally { setClientsReady(true) }
  }, [])

  const fetchVinculos = React.useCallback(async () => {
    try { setVinculos(await apiGetVinculos()) } catch { setVinculos([]) }
    finally { setVinculosReady(true) }
  }, [])

  const fetchEntregues = React.useCallback(async () => {
    try { setEntregues(await apiGetEntregues<Order>()) } catch { setEntregues([]) }
  }, [])

  React.useEffect(() => {
    fetchOrders()
    fetchOPs()
    fetchClients()
    fetchVinculos()
    fetchEntregues()
  }, [fetchOrders, fetchOPs, fetchClients, fetchVinculos, fetchEntregues])

  const dataLoading = !ordersReady || !opsReady || !clientsReady || !vinculosReady

  // ── Pedidos (somente leitura via Omie) ────────────────────────────────────

  const addOrder      = React.useCallback(async (_d: Omit<Order, "id" | "criadoEm" | "atualizadoEm">) => {}, [])
  const updateOrder   = React.useCallback(async (_i: string, _u: Partial<Omit<Order, "id" | "criadoEm">>) => {}, [])
  const deletePedido  = React.useCallback(async (_i: string) => {}, [])
  const concluirPedido = React.useCallback(async (_i: string) => {}, [])
  const reverterPedido = React.useCallback(async (_i: string, _s: OrderStatus) => {}, [])

  const deleteEntregue = React.useCallback(async (id: string) => {
    await apiDeleteEntregue(id)
    setEntregues(prev => prev.filter(o => o.id !== id))
  }, [])

  // ── OPs (somente leitura via Omie) ────────────────────────────────────────

  const addOP    = React.useCallback(async (_o: Omit<ProductionOrder, "id">) => {}, [])
  const updateOP = React.useCallback(async (_i: string, _u: Partial<Omit<ProductionOrder, "id">>) => {}, [])
  const deleteOP = React.useCallback(async (_i: string) => {}, [])

  // ── Vínculos ──────────────────────────────────────────────────────────────

  const vincular = React.useCallback(async (pedidoNumero: string, opId: string) => {
    await apiVincular(pedidoNumero, opId)
    setVinculos(prev => [...prev, { pedido_numero: pedidoNumero, op_id: opId }])
  }, [])

  const desvincular = React.useCallback(async (pedidoNumero: string, opId: string) => {
    await apiDesvincular(pedidoNumero, opId)
    setVinculos(prev => prev.filter(v => !(v.pedido_numero === pedidoNumero && v.op_id === opId)))
  }, [])

  // ── Ordens de Serviço (sem backend) ──────────────────────────────────────

  const addOS    = React.useCallback(async (_o: Omit<ServiceOrder, "id">) => {}, [])
  const updateOS = React.useCallback(async (_i: string, _u: Partial<Omit<ServiceOrder, "id">>) => {}, [])
  const deleteOS = React.useCallback(async (_i: string) => {}, [])

  // ── Equipe (sem backend) ──────────────────────────────────────────────────

  const addMember    = React.useCallback(async (_d: Omit<TeamMember, "id" | "criadoEm" | "atualizadoEm">) => {}, [])
  const updateMember = React.useCallback(async (_i: string, _u: Partial<Omit<TeamMember, "id" | "criadoEm">>) => {}, [])
  const deleteMember = React.useCallback(async (_i: string) => {}, [])

  // ── Clientes (somente leitura via Omie) ──────────────────────────────────

  const addClient    = React.useCallback(async (_d: Omit<Client, "id" | "criadoEm" | "atualizadoEm">) => {}, [])
  const updateClient = React.useCallback(async (_i: string, _u: Partial<Omit<Client, "id" | "criadoEm">>) => {}, [])
  const deleteClient = React.useCallback(async (_i: string) => {}, [])

  // ── Relatórios (sem backend) ──────────────────────────────────────────────

  const addReport        = React.useCallback(async (_d: Omit<Report, "id" | "criadoEm" | "atualizadoEm">, _f?: File[]) => {}, [])
  const updateReport     = React.useCallback(async (_i: string, _u: Partial<Omit<Report, "id" | "criadoEm">>, _f?: File[]): Promise<Report> => { throw new Error("Não disponível") }, [])
  const deleteReport     = React.useCallback(async (_i: string) => {}, [])
  const deleteReportFile = React.useCallback(async (_r: string, _a: string) => {}, [])

  // ── Estoque (somente leitura via Omie, veja estoque/page.tsx) ─────────────

  const addStockItem    = React.useCallback(async (_d: Omit<StockItem, "id" | "criadoEm" | "atualizadoEm">) => {}, [])
  const updateStockItem = React.useCallback(async (_i: string, _u: Partial<Omit<StockItem, "id" | "criadoEm">>) => {}, [])
  const deleteStockItem = React.useCallback(async (_i: string) => {}, [])

  // ── Suporte (sem backend) ─────────────────────────────────────────────────

  const addTicket    = React.useCallback(async (_d: Omit<Ticket, "id" | "criadoEm" | "status">) => {}, [])
  const deleteTicket = React.useCallback(async (_i: string) => {}, [])

  const value = React.useMemo<AppDataContextValue>(() => ({
    orders: activeOrders, addOrder, updateOrder, deletePedido, concluirPedido,
    concluidos, entregues, deleteEntregue, reverterPedido,
    ops, addOP, updateOP, deleteOP,
    vincular, desvincular,
    serviceOrders, addOS, updateOS, deleteOS,
    members, addMember, updateMember, deleteMember,
    clients, addClient, updateClient, deleteClient,
    reports, addReport, updateReport, deleteReport, deleteReportFile,
    stockItems, addStockItem, updateStockItem, deleteStockItem,
    tickets, addTicket, deleteTicket,
    dataLoading,
  }), [
    activeOrders, addOrder, updateOrder, deletePedido, concluirPedido,
    concluidos, entregues, deleteEntregue, reverterPedido,
    ops, addOP, updateOP, deleteOP,
    vincular, desvincular,
    serviceOrders, addOS, updateOS, deleteOS,
    members, addMember, updateMember, deleteMember,
    clients, addClient, updateClient, deleteClient,
    reports, addReport, updateReport, deleteReport, deleteReportFile,
    stockItems, addStockItem, updateStockItem, deleteStockItem,
    tickets, addTicket, deleteTicket,
    dataLoading,
  ])

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = React.useContext(AppDataContext)
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider")
  return ctx
}
