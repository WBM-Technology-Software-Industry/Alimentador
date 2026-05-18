"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ClipboardList,
  Wrench,
  CalendarIcon,
  Link2,
  X,
  User,
  Building2,
  PackageSearch,
  Globe,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useAppData,
  type Prioridade,
  type OSStatus,
  type OSTipo,
  type ServiceOrder,
  type OrderItem,
} from "../data-provider"

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = [
  "Mecânica", "CTO", "CEO", "CCO", "Software",
  "EletroEletrônica", "Vendas", "Gerente de Fábrica", "ADM",
] as const

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso + "T00:00:00"))
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + "T00:00:00")
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function getDeliveryState(os: ServiceOrder): "overdue" | "urgent" | "normal" {
  if (os.status === "cancelado" || os.status === "concluido") return "normal"
  const d = daysUntil(os.dataPrevista)
  if (d < 0) return "overdue"
  if (d <= 2) return "urgent"
  return "normal"
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<
  OSStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  pendente:     { label: "Pendente",       variant: "secondary" },
  em_andamento: { label: "Em Andamento",   variant: "outline", className: "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700" },
  concluido:    { label: "Concluído",      variant: "outline", className: "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700" },
  cancelado:    { label: "Cancelado",      variant: "destructive" },
}

const priorityConfig: Record<
  Prioridade,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  urgente: { label: "Urgente", variant: "destructive" },
  alta:    { label: "Alta",    variant: "outline", className: "border-orange-500 text-orange-600 dark:text-orange-400 dark:border-orange-600" },
  media:   { label: "Média",   variant: "secondary", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700" },
  baixa:   { label: "Baixa",   variant: "outline" },
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyOSForm = {
  tipo: "interno" as OSTipo,
  opRef: "",
  numero: "",
  descricao: "",
  cliente: "",
  items: [{ name: "", quantity: 1 }] as OrderItem[],
  responsible: "",
  sector: SECTORS[0] as string,
  prioridade: "media" as Prioridade,
  status: "pendente" as OSStatus,
  dataAbertura: "",
  dataPrevista: "",
  linkedOrders: [] as string[],
}

// ─── DatePicker helper ────────────────────────────────────────────────────────

function DateField({
  label,
  value,
  onChange,
  required,
  disablePast,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  disablePast?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="size-4" />
            {value ? format(new Date(value + "T00:00:00"), "PPP", { locale: ptBR }) : "Selecionar data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T00:00:00") : undefined}
            onSelect={date => onChange(date ? date.toISOString().split("T")[0] : "")}
            disabled={disablePast ? (date => date < new Date(new Date().setHours(0, 0, 0, 0))) : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── OSRow (memoized) ─────────────────────────────────────────────────────────

const OSRow = React.memo(function OSRow({
  os,
  onSelect,
  orderNumero,
}: {
  os: ServiceOrder
  onSelect: (os: ServiceOrder) => void
  orderNumero: Record<string, string>
}) {
  const delivState = getDeliveryState(os)
  const days = daysUntil(os.dataPrevista)
  const s = statusConfig[os.status]
  const p = priorityConfig[os.prioridade]

  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        delivState === "overdue" && "bg-destructive/5 hover:bg-destructive/10",
        delivState === "urgent"  && "bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
      )}
      onClick={() => onSelect(os)}
    >
      {/* Nº OS */}
      <TableCell className="pl-4 font-mono text-xs font-medium">{os.id}</TableCell>

      {/* Cliente */}
      <TableCell className="font-medium text-sm max-w-[160px]">
        <span className="truncate block">{os.cliente || <span className="text-muted-foreground/50 italic">—</span>}</span>
      </TableCell>

      {/* Descrição */}
      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
        <span className="truncate block">{os.descricao || <span className="italic">—</span>}</span>
      </TableCell>

      {/* Responsável */}
      <TableCell className="hidden md:table-cell text-sm font-medium">{os.responsible}</TableCell>

      {/* Setor */}
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{os.sector}</TableCell>

      {/* Prioridade */}
      <TableCell className="hidden md:table-cell">
        <Badge variant={p.variant} className={cn("text-[10px] h-5", p.className)}>{p.label}</Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={s.variant} className={cn("text-[10px] h-5", s.className)}>{s.label}</Badge>
      </TableCell>

      {/* Abertura */}
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(os.dataAbertura)}</TableCell>

      {/* Previsão */}
      <TableCell>
        {delivState === "normal" ? (
          <span className="text-xs text-muted-foreground">{formatDate(os.dataPrevista)}</span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 text-xs cursor-default w-fit",
                delivState === "overdue" && "text-destructive font-semibold",
                delivState === "urgent"  && "text-amber-600 dark:text-amber-400 font-medium"
              )}>
                {delivState === "overdue" && <AlertCircle className="size-3.5 shrink-0" />}
                {delivState === "urgent"  && <Clock className="size-3.5 shrink-0" />}
                {formatDate(os.dataPrevista)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {delivState === "overdue"
                ? `Atrasada ${Math.abs(days)} dia(s)`
                : days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)`}
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Pedidos vinculados */}
      <TableCell className="hidden sm:table-cell">
        {os.linkedOrders?.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {os.linkedOrders.slice(0, 2).map(id => (
              <Badge key={id} variant="outline" className="text-[10px] h-5 font-mono">
                {orderNumero[id] ?? id}
              </Badge>
            ))}
            {os.linkedOrders.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{os.linkedOrders.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        )}
      </TableCell>
    </TableRow>
  )
})

// ─── OSMainContent (memoized) ─────────────────────────────────────────────────

type OSStats = { total: number; pendentes: number; em_andamento: number; concluidas: number; atrasadas: number }

const OSMainContent = React.memo(function OSMainContent({
  stats,
  filtered,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  openDialog,
  setSelected,
  orderNumero,
}: {
  stats: OSStats
  filtered: ServiceOrder[]
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  activeTab: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  openDialog: () => void
  setSelected: (os: ServiceOrder) => void
  orderNumero: Record<string, string>
}) {
  const statsCards = [
    {
      label: "Total de OSs",
      value: stats.total,
      sub: stats.atrasadas > 0 ? `${stats.atrasadas} atrasada(s)` : "Tudo em dia",
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      alert: stats.atrasadas > 0,
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      sub: "Aguardando início",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      alert: false,
    },
    {
      label: "Em Andamento",
      value: stats.em_andamento,
      sub: "Em execução",
      icon: Wrench,
      color: "text-primary",
      bg: "bg-primary/10",
      alert: false,
    },
    {
      label: "Concluídas",
      value: stats.concluidas,
      sub: "Histórico total",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      alert: false,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie as ordens de serviço e atendimentos em aberto
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" className="shrink-0" onClick={openDialog}>
              <Plus className="size-3.5" />
              Nova OS
            </Button>
          </TooltipTrigger>
          <TooltipContent>Registrar nova ordem de serviço</TooltipContent>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {statsCards.map(stat => (
          <Card key={stat.label} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("size-4", stat.color)} />
                </div>
                {stat.alert ? (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {stats.atrasadas} atrasadas
                  </Badge>
                ) : <div />}
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              <p className={cn(
                "text-[11px] mt-0.5",
                stat.alert ? "text-destructive font-medium" : "text-muted-foreground/70"
              )}>
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nº, cliente, descrição…"
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
        <div className="overflow-x-auto -mx-0.5 px-0.5 pb-1">
        <TabsList className="w-max">
          <TabsTrigger value="all" className="gap-1.5">
            Todos
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 min-w-4">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendente" className="gap-1.5">
            Pendentes
            {stats.pendentes > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 min-w-4">{stats.pendentes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="em_andamento" className="gap-1.5">
            Em Andamento
            {stats.em_andamento > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 min-w-4 border-blue-500 text-blue-600 dark:text-blue-400">
                {stats.em_andamento}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="concluido">Concluídas</TabsTrigger>
          <TabsTrigger value="cancelado">Canceladas</TabsTrigger>
        </TabsList>
        </div>

        {["all", "pendente", "em_andamento", "concluido", "cancelado"].map(tab => (
          <TabsContent key={tab} value={tab} className="flex-1 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Ordens de Serviço</CardTitle>
                <CardDescription>
                  {filtered.length} OS{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <div className="overflow-auto h-full">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="w-[100px] pl-4">Nº OS</TableHead>
                        <TableHead className="min-w-[130px]">Cliente</TableHead>
                        <TableHead className="min-w-[160px]">Descrição</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[130px]">Responsável</TableHead>
                        <TableHead className="hidden md:table-cell w-[120px]">Setor</TableHead>
                        <TableHead className="hidden md:table-cell w-[90px]">Prioridade</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead className="hidden md:table-cell w-[105px]">Abertura</TableHead>
                        <TableHead className="w-[100px]">Previsão</TableHead>
                        <TableHead className="hidden sm:table-cell w-[130px]">Pedidos</TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10}>
                            <div className="py-16 text-center">
                              <PackageSearch className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">Nenhuma OS encontrada</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar o filtro ou a busca</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map(os => (
                          <OSRow key={os.id} os={os} onSelect={setSelected} orderNumero={orderNumero} />
                        ))
                      )}
                    </TableBody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OSPage() {
  const { serviceOrders, addOS, updateOS, deleteOS, orders, clients, members, dataLoading } = useAppData()
  const [search, setSearch]       = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [selected, setSelected]   = React.useState<ServiceOrder | null>(null)
  const deferredSelected = React.useDeferredValue(selected)

  // Fechar sheet se a OS for removida
  React.useEffect(() => {
    if (selected && !serviceOrders.find(o => o.id === selected.id)) setSelected(null)
  }, [serviceOrders, selected])

  // ── Pré-seleção ───────────────────────────────────────────────────────────
  const [preSelectOpen, setPreSelectOpen] = React.useState(false)
  const [withPedido, setWithPedido]       = React.useState(false)

  // ── Novo / Editar ─────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen]     = React.useState(false)
  const deferredDialogOpen = React.useDeferredValue(dialogOpen)
  const [editTarget, setEditTarget]     = React.useState<ServiceOrder | null>(null)
  const [form, setForm]                 = React.useState(emptyOSForm)
  const [deleteTarget, setDeleteTarget] = React.useState<ServiceOrder | null>(null)

  const openDialog = React.useCallback(() => {
    setPreSelectOpen(true)
  }, [])

  const openEdit = React.useCallback((os: ServiceOrder) => {
    React.startTransition(() => {
      setForm({
        tipo:         os.tipo         ?? "interno",
        opRef:        os.opRef        ?? "",
        numero:       os.numero       ?? "",
        descricao:    os.descricao    ?? "",
        cliente:      os.cliente      ?? "",
        items:        os.items?.length > 0 ? [...os.items] : [{ name: "", quantity: 1 }],
        responsible:  os.responsible  ?? "",
        sector:       os.sector       ?? SECTORS[0],
        prioridade:   os.prioridade   ?? "media",
        status:       os.status,
        dataAbertura: os.dataAbertura ?? "",
        dataPrevista: os.dataPrevista ?? "",
        linkedOrders: [...(os.linkedOrders ?? [])],
      })
      setWithPedido((os.linkedOrders ?? []).length > 0)
      setEditTarget(os)
      setDialogOpen(true)
    })
  }, [])

  const handleSelectOS = React.useCallback((os: ServiceOrder) => {
    setSelected(os)
  }, [])

  // Items
  const addItem    = () => setForm(f => ({ ...f, items: [...(f.items ?? []), { name: "", quantity: 1 }] }))
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: (f.items ?? []).filter((_, i) => i !== idx) }))
  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) =>
    setForm(f => ({ ...f, items: (f.items ?? []).map((it, i) => i === idx ? { ...it, [field]: value } : it) }))

  // Pedidos vinculados
  const addLinkedOrder = React.useCallback((orderId: string) => {
    setForm(f => {
      if (f.linkedOrders.includes(orderId)) return f
      return { ...f, linkedOrders: [...f.linkedOrders, orderId] }
    })
  }, [])

  const removeLinkedOrder = React.useCallback((orderId: string) => {
    setForm(f => ({ ...f, linkedOrders: f.linkedOrders.filter(id => id !== orderId) }))
  }, [])

  const generateNumero = React.useCallback((): string => {
    const nums = serviceOrders
      .map(o => parseInt(o.numero.replace("OS-", "")))
      .filter(n => !isNaN(n))
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return `OS-${String(next).padStart(3, "0")}`
  }, [serviceOrders])

  const handleSubmit = React.useCallback(async () => {
    const linkedOrders = withPedido ? form.linkedOrders : []
    const validItems = (form.items ?? []).filter(it => it.name.trim() !== "")
    const today = new Date().toISOString().split("T")[0]

    if (editTarget) {
      const updates: Partial<Omit<ServiceOrder, "id">> = {
        tipo:         form.tipo,
        opRef:        form.tipo === "interno" ? form.opRef.trim() : "",
        numero:       form.numero.trim(),
        descricao:    form.descricao.trim(),
        cliente:      form.tipo === "externo" ? form.cliente.trim() : "",
        items:        validItems,
        responsible:  form.responsible,
        sector:       form.sector,
        prioridade:   form.prioridade,
        status:       form.status,
        dataAbertura: form.dataAbertura,
        dataPrevista: form.dataPrevista,
        linkedOrders,
        atualizadoEm: new Date().toISOString(),
      }
      // Auto-set iniciadoEm ao editar para em_andamento
      if (form.status === "em_andamento" && !editTarget.iniciadoEm) {
        updates.iniciadoEm = today
      }
      await updateOS(editTarget.id, updates)
      setSelected(prev => prev?.id === editTarget.id ? { ...prev, ...updates } as ServiceOrder : prev)
      toast.success("OS atualizada", { description: `${editTarget.id} salva com sucesso.` })
    } else {
      const now = new Date().toISOString()
      const numero = form.numero.trim() || generateNumero()
      await addOS({
        tipo:         form.tipo,
        opRef:        form.tipo === "interno" ? form.opRef.trim() : "",
        numero,
        descricao:    form.descricao.trim(),
        cliente:      form.tipo === "externo" ? form.cliente.trim() : "",
        items:        validItems,
        responsible:  form.responsible,
        sector:       form.sector,
        prioridade:   form.prioridade,
        status:       "pendente",
        dataAbertura: form.dataAbertura || today,
        dataPrevista: form.dataPrevista,
        linkedOrders,
        criadoEm:     now,
        atualizadoEm: now,
      })
      toast.success("OS criada")
    }
    setDialogOpen(false)
    setEditTarget(null)
    setForm(emptyOSForm)
  }, [form, editTarget, withPedido, addOS, updateOS, generateNumero])

  const formValid = React.useMemo(() =>
    form.responsible !== "" &&
    form.dataPrevista !== "",
  [form])

  // Stats
  const stats = React.useMemo<OSStats>(() => ({
    total:        serviceOrders.length,
    pendentes:    serviceOrders.filter(o => o.status === "pendente").length,
    em_andamento: serviceOrders.filter(o => o.status === "em_andamento").length,
    concluidas:   serviceOrders.filter(o => o.status === "concluido").length,
    atrasadas:    serviceOrders.filter(o => getDeliveryState(o) === "overdue").length,
  }), [serviceOrders])

  // Debounce
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  // Filtered + sorted
  const filtered = React.useMemo(() => {
    return serviceOrders
      .filter(o => activeTab === "all" ? true : o.status === activeTab)
      .filter(o => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
          (o.id         ?? "").toLowerCase().includes(q) ||
          (o.cliente    ?? "").toLowerCase().includes(q) ||
          (o.descricao  ?? "").toLowerCase().includes(q) ||
          (o.responsible ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const ord = { overdue: 0, urgent: 1, normal: 2 }
        const diff = ord[getDeliveryState(a)] - ord[getDeliveryState(b)]
        if (diff !== 0) return diff
        return (a.dataPrevista ?? "").localeCompare(b.dataPrevista ?? "")
      })
  }, [serviceOrders, debouncedSearch, activeTab])

  // Lookups
  const orderNumero = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const o of orders) map[o.id] = o.numero ?? o.id
    return map
  }, [orders])

  const availableOrders = React.useMemo(() => orders.map(o => o.id), [orders])
  const activeMembers   = React.useMemo(() => members.filter(m => m.status === "ativo"), [members])

  // Status update
  const updateStatus = React.useCallback(async (id: string, status: OSStatus) => {
    const os = serviceOrders.find(o => o.id === id)
    const updates: Partial<Omit<ServiceOrder, "id">> = { status }
    if (status === "em_andamento" && !os?.iniciadoEm) {
      updates.iniciadoEm = new Date().toISOString().split("T")[0]
    }
    await updateOS(id, updates)
    setSelected(prev => prev?.id === id ? { ...prev, ...updates } as ServiceOrder : prev)
    toast.success("Status atualizado", { description: `OS movida para "${statusConfig[status].label}".` })
  }, [serviceOrders, updateOS])

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    await deleteOS(deleteTarget.id)
    setSelected(prev => prev?.id === deleteTarget.id ? null : prev)
    setDeleteTarget(null)
    toast.error("OS excluída", { description: `${deleteTarget.id} foi removida permanentemente.` })
  }, [deleteTarget, deleteOS])

  if (dataLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <svg className="animate-spin size-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm">Carregando ordens de serviço…</p>
        </div>
      </div>
    )
  }


  return (
    <>
      <OSMainContent
        stats={stats}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openDialog={openDialog}
        setSelected={handleSelectOS}
        orderNumero={orderNumero}
      />

      {/* ── Pré-seleção ───────────────────────────────────────────────────── */}
      <Dialog open={preSelectOpen} onOpenChange={open => !open && setPreSelectOpen(false)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
            <DialogDescription>Esta OS está vinculada a um pedido existente?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={() => {
                setWithPedido(true)
                setForm({ ...emptyOSForm, numero: generateNumero() })
                setEditTarget(null)
                setPreSelectOpen(false)
                setDialogOpen(true)
              }}
              className="flex flex-col items-center gap-2.5 rounded-xl border-2 px-3 py-5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link2 className="size-7 text-primary" />
              <span>Com Pedido</span>
              <span className="text-[11px] text-muted-foreground font-normal text-center leading-snug">
                Vincula a um pedido existente
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWithPedido(false)
                setForm({ ...emptyOSForm, numero: generateNumero() })
                setEditTarget(null)
                setPreSelectOpen(false)
                setDialogOpen(true)
              }}
              className="flex flex-col items-center gap-2.5 rounded-xl border-2 px-3 py-5 text-sm font-medium transition-colors hover:border-muted-foreground/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ClipboardList className="size-7 text-muted-foreground" />
              <span>Sem Pedido</span>
              <span className="text-[11px] text-muted-foreground font-normal text-center leading-snug">
                OS independente de pedidos
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Novo / Editar ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? `Editar OS — ${editTarget.id}` : "Nova Ordem de Serviço"}
            </DialogTitle>
            <DialogDescription>
              {editTarget ? "Atualize os dados da OS." : "Preencha os dados da ordem de serviço."}
            </DialogDescription>
          </DialogHeader>

          {deferredDialogOpen && (
            <>
              <div className="max-h-[65vh] overflow-y-auto pr-1">
                <div className="space-y-5 py-1 pr-3">

                  {/* Interno / Externo */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: "interno" }))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                        form.tipo === "interno"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      )}
                    >
                      <Building2 className="size-4 shrink-0" />
                      Interno
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: "externo" }))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                        form.tipo === "externo"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      )}
                    >
                      <Globe className="size-4 shrink-0" />
                      Externo
                    </button>
                  </div>

                  {/* Cliente — só para Externo */}
                  {form.tipo === "externo" && (
                    <div className="space-y-1.5">
                      <Label>Cliente / Empresa <span className="text-destructive">*</span></Label>
                      <Select
                        value={form.cliente}
                        onValueChange={val => setForm(f => ({ ...f, cliente: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Nº da OP — só para Interno */}
                  {form.tipo === "interno" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="f-op-ref">Nº da OP <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                      <Input
                        id="f-op-ref"
                        placeholder="Ex: OP-001"
                        value={form.opRef}
                        onChange={e => setForm(f => ({ ...f, opRef: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Nº OS + Prioridade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="f-numero">Nº OS</Label>
                      <Input
                        id="f-numero"
                        placeholder="OS-001"
                        value={form.numero}
                        onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prioridade</Label>
                      <Select
                        value={form.prioridade}
                        onValueChange={val => setForm(f => ({ ...f, prioridade: val as Prioridade }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgente">Urgente</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <Label htmlFor="f-descricao">Descrição</Label>
                    <Textarea
                      id="f-descricao"
                      placeholder="Descreva o serviço a ser realizado…"
                      value={form.descricao}
                      onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {/* Responsável + Setor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Responsável <span className="text-destructive">*</span></Label>
                      <Select
                        value={form.responsible}
                        onValueChange={val => setForm(f => ({ ...f, responsible: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecionar…" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeMembers.map(m => (
                            <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Setor</Label>
                      <Select
                        value={form.sector}
                        onValueChange={val => setForm(f => ({ ...f, sector: val }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="grid grid-cols-2 gap-3">
                    <DateField
                      label="Data de Abertura"
                      value={form.dataAbertura}
                      onChange={v => setForm(f => ({ ...f, dataAbertura: v }))}
                    />
                    <DateField
                      label="Previsão de Conclusão"
                      value={form.dataPrevista}
                      onChange={v => setForm(f => ({ ...f, dataPrevista: v }))}
                      required
                    />
                  </div>

                  {/* Itens */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_72px_32px] gap-2 items-center">
                      <Label>Item / Tarefa <span className="text-destructive">*</span></Label>
                      <Label className="text-center">Qtd</Label>
                      <span />
                    </div>
                    {(form.items ?? []).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_72px_32px] gap-2 items-center">
                        <Input
                          placeholder="Descrição do item"
                          value={item.name}
                          onChange={e => updateItem(idx, "name", e.target.value)}
                        />
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(idx)}
                          disabled={(form.items ?? []).length === 1}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-8 text-muted-foreground w-full justify-start"
                      onClick={addItem}
                    >
                      <Plus className="size-3.5" />
                      Adicionar item
                    </Button>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label>Status <span className="text-destructive">*</span></Label>
                    <Select
                      value={form.status}
                      onValueChange={val => setForm(f => ({ ...f, status: val as OSStatus }))}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pedidos Vinculados */}
                  {withPedido && (
                    <div className="space-y-2">
                      <Label>Pedidos Vinculados</Label>
                      <Select
                        value=""
                        onValueChange={val => { if (val) addLinkedOrder(val) }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Adicionar pedido vinculado…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOrders.filter(id => !form.linkedOrders.includes(id)).map(id => (
                            <SelectItem key={id} value={id}>{orderNumero[id] ?? id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.linkedOrders.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {form.linkedOrders.map(id => (
                            <Badge key={id} variant="secondary" className="gap-1 text-xs font-mono pr-1">
                              {orderNumero[id] ?? id}
                              <button
                                type="button"
                                onClick={() => removeLinkedOrder(id)}
                                className="ml-0.5 rounded-full hover:text-destructive focus:outline-none"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditTarget(null) }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formValid}>
                  {editTarget ? "Salvar Alterações" : "Criar OS"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar exclusão ──────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ordem de serviço{" "}
              <span className="font-medium text-foreground">{deleteTarget?.id}</span> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sheet: detalhes da OS ─────────────────────────────────────────── */}
      <Sheet modal={false} open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent showOverlay={false} className="w-full sm:max-w-md p-0 gap-0">
          <SheetTitle className="sr-only">{selected?.id ?? "Detalhes da OS"}</SheetTitle>
          {deferredSelected && (() => {
            const os = deferredSelected
            const s = statusConfig[os.status]
            const p = priorityConfig[os.prioridade]
            const delivState = getDeliveryState(os)

            return (
              <>
                {/* ── Header ── */}
                <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={s.variant} className={cn(s.className)}>{s.label}</Badge>
                    <Badge variant={p.variant} className={cn("text-xs", p.className)}>{p.label}</Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      {os.tipo === "externo" ? <Globe className="size-3" /> : <Building2 className="size-3" />}
                      {os.tipo === "externo" ? "Externo" : "Interno"}
                    </Badge>
                    {delivState === "overdue" && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertCircle className="size-3" />Atrasada
                      </Badge>
                    )}
                    {delivState === "urgent" && (
                      <Badge variant="outline" className="gap-1 text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                        <Clock className="size-3" />Urgente
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold">{os.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {os.responsible} · {os.sector}
                    </p>
                  </div>
                </SheetHeader>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                  {/* Descrição */}
                  {os.descricao && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descrição</p>
                      <p className="text-sm leading-relaxed text-foreground/90">{os.descricao}</p>
                    </div>
                  )}

                  {/* Cliente (Externo) ou OP Ref (Interno) */}
                  {os.tipo === "externo" && os.cliente && (
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-center gap-2">
                      <Globe className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cliente / Empresa</p>
                        <p className="text-sm font-medium">{os.cliente}</p>
                      </div>
                    </div>
                  )}
                  {os.tipo === "interno" && os.opRef && (
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">OP Vinculada</p>
                        <p className="text-sm font-mono font-medium">{os.opRef}</p>
                      </div>
                    </div>
                  )}

                  {/* Itens */}
                  {(() => {
                    const items = os.items?.filter(it => it.name?.trim()) ?? []
                    if (items.length === 0) return null
                    return (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Itens</p>
                        <div className="rounded-lg border overflow-hidden">
                          {items.map((it, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-center justify-between px-3 py-2.5 text-sm",
                                i !== items.length - 1 && "border-b"
                              )}
                            >
                              <span className="font-medium">{it.name}</span>
                              <Badge variant="secondary" className="text-xs font-mono">×{it.quantity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Informações */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Abertura</p>
                        <p className="text-sm font-medium">{formatDate(os.dataAbertura)}</p>
                      </div>
                      <div className={cn(
                        "rounded-lg px-3 py-2.5",
                        delivState === "overdue" ? "bg-destructive/10" :
                        delivState === "urgent"  ? "bg-amber-50 dark:bg-amber-950/30" :
                        "bg-muted/50"
                      )}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Previsão</p>
                        <p className={cn(
                          "text-sm font-medium",
                          delivState === "overdue" && "text-destructive",
                          delivState === "urgent"  && "text-amber-600 dark:text-amber-400"
                        )}>
                          {formatDate(os.dataPrevista)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Responsável</p>
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium">{os.responsible}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Setor</p>
                        <div className="flex items-center gap-1.5">
                          <Wrench className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium">{os.sector}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Início do Atendimento */}
                  {os.iniciadoEm && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Play className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atendimento</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Iniciado em</p>
                        <p className="text-sm font-medium">{formatDate(os.iniciadoEm)}</p>
                      </div>
                    </div>
                  )}

                  {/* Pedidos Vinculados */}
                  {(() => {
                    const linkedPedidos = orders.filter(o => os.linkedOrders?.includes(o.id))
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Link2 className="size-3.5 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pedidos Vinculados</p>
                          </div>
                          {linkedPedidos.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{linkedPedidos.length}</Badge>
                          )}
                        </div>
                        {linkedPedidos.length === 0 ? (
                          <div className="rounded-lg border border-dashed px-4 py-6 flex flex-col items-center gap-2 text-center">
                            <Link2 className="size-6 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">Nenhum pedido vinculado</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border overflow-hidden">
                            {linkedPedidos.map((order, i) => (
                              <div
                                key={order.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2.5 text-sm",
                                  i !== linkedPedidos.length - 1 && "border-b"
                                )}
                              >
                                <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-mono font-medium text-xs">{order.numero ?? order.id}</span>
                                  {order.cliente && (
                                    <span className="text-[11px] text-muted-foreground truncate">{order.cliente}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                </div>

                {/* ── Footer ── */}
                <SheetFooter className="border-t bg-muted/30 px-5 py-4 gap-2">
                  {os.status === "pendente" && (
                    <Button className="w-full" onClick={() => updateStatus(os.id, "em_andamento")}>
                      <Play className="size-4" />
                      Iniciar Atendimento
                    </Button>
                  )}
                  {os.status === "em_andamento" && (
                    <Button className="w-full" onClick={() => updateStatus(os.id, "concluido")}>
                      <CheckCircle2 className="size-4" />
                      Concluir OS
                    </Button>
                  )}

                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1"
                      onClick={() => { setSelected(null); openEdit(os) }}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                    {(os.status === "pendente" || os.status === "em_andamento") && (
                      <Button variant="outline" className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => updateStatus(os.id, "cancelado")}>
                        <XCircle className="size-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>

                  <Button variant="outline" className="w-full text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(os)}>
                    <Trash2 className="size-4" />
                    Deletar OS
                  </Button>
                </SheetFooter>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </>
  )
}
