"use client"

import * as React from "react"
import {
  Search,
  Plus,
  Clock,
  AlertCircle,
  Hammer,
  Factory,
  ClipboardList,
  Link2,
  X,
  User,
  Wrench,
  Building2,
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAppData, type Prioridade, type OPStatus, type ProductionOrder } from "../data-provider"

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + "T00:00:00")
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function getDeliveryState(op: ProductionOrder): "overdue" | "urgent" | "normal" {
  if (op.status === "cancelado" || op.status === "concluido") return "normal"
  const d = daysUntil(op.deliveryAt)
  if (d < 0) return "overdue"
  if (d <= 2) return "urgent"
  return "normal"
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<
  OPStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  pendente:   { label: "Pendente",      variant: "secondary" },
  fabricacao: { label: "Em Fabricação", variant: "outline",   className: "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700" },
  producao:   { label: "Em Produção",   variant: "default" },
  concluido:  { label: "Concluído",     variant: "outline",   className: "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700" },
  cancelado:  { label: "Cancelado",     variant: "destructive" },
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

// ─── OPRow (memoized — prevents table re-render when modal state changes) ─────

const OPRow = React.memo(function OPRow({
  op,
  onSelect,
  orderNumero,
}: {
  op: ProductionOrder
  onSelect: (op: ProductionOrder) => void
  orderNumero: Record<string, string>
}) {
  const delivState = getDeliveryState(op)
  const days = daysUntil(op.deliveryAt)
  const s = statusConfig[op.status]
  const p = priorityConfig[op.prioridade] ?? priorityConfig["media"]

  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        delivState === "overdue" && "bg-destructive/5 hover:bg-destructive/10",
        delivState === "urgent"  && "bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
      )}
      onClick={() => onSelect(op)}
    >
      {/* Nº OP + tipo */}
      <TableCell className="pl-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-medium">{op.numero || op.empresa || op.id}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] h-3.5 px-1 w-fit gap-0.5",
              op.tipo === "externo"
                ? "border-blue-400 text-blue-500 dark:text-blue-400"
                : "border-emerald-400 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {op.tipo === "externo"
              ? <><Globe className="size-2 shrink-0" />Externo</>
              : <><Building2 className="size-2 shrink-0" />Interno</>
            }
          </Badge>
        </div>
      </TableCell>

      {/* Item */}
      <TableCell className="text-sm">
        {(() => {
          const items = op.items ?? []
          if (items.length === 0) return (
            <span className="text-muted-foreground/50 italic text-xs">—</span>
          )
          return (
            <span className="flex items-center gap-1.5">
              <span className="font-medium truncate max-w-[130px]">{items[0].name}</span>
              {items[0].quantity > 1 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">×{items[0].quantity}</Badge>
              )}
              {items.length > 1 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">+{items.length - 1}</Badge>
              )}
            </span>
          )
        })()}
      </TableCell>

      {/* Responsável */}
      <TableCell className="hidden md:table-cell font-medium text-sm">
        {op.responsible}
      </TableCell>

      {/* Setor */}
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {op.sector}
      </TableCell>

      {/* Prioridade */}
      <TableCell className="hidden md:table-cell">
        <Badge variant={p.variant} className={cn("text-[10px] h-5", p.className)}>
          {p.label}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={s.variant} className={cn("text-[10px] h-5", s.className)}>
          {s.label}
        </Badge>
      </TableCell>

      {/* Abertura */}
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {formatDate(op.openedAt)}
      </TableCell>

      {/* Previsão de entrega */}
      <TableCell>
        {delivState === "normal" ? (
          <span className="text-xs text-muted-foreground">
            {formatDate(op.deliveryAt)}
          </span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs cursor-default w-fit",
                  delivState === "overdue" && "text-destructive font-semibold",
                  delivState === "urgent"  && "text-amber-600 dark:text-amber-400 font-medium"
                )}
              >
                {delivState === "overdue" && <AlertCircle className="size-3.5 shrink-0" />}
                {delivState === "urgent"  && <Clock className="size-3.5 shrink-0" />}
                {formatDate(op.deliveryAt)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {delivState === "overdue"
                ? `Atrasada ${Math.abs(days)} dia(s)`
                : days === 0
                ? "Vence hoje"
                : `Vence em ${days} dia(s)`}
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Referência */}
      <TableCell className="hidden sm:table-cell">
        {op.tipo === "externo" ? (
          op.empresa ? (
            <span className="text-xs font-medium flex items-center gap-1">
              <Globe className="size-3 text-muted-foreground shrink-0" />
              {op.empresa}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">—</span>
          )
        ) : op.linkedOrders.length === 0 ? (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            {op.linkedOrders.slice(0, 2).map(id => (
              <Badge key={id} variant="outline" className="text-[10px] h-5 font-mono">
                {orderNumero[id] ?? id}
              </Badge>
            ))}
            {op.linkedOrders.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{op.linkedOrders.length - 2}
              </span>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
})

// ─── OPsMainContent (memoized — skips re-render when modals open) ──────────────

type OPsStats = { total: number; pendentes: number; fabricacao: number; producao: number; atrasadas: number }

const OPsMainContent = React.memo(function OPsMainContent({
  stats,
  filtered,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  setSelected,
  orderNumero,
}: {
  stats: OPsStats
  filtered: ProductionOrder[]
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  activeTab: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  setSelected: (op: ProductionOrder) => void
  orderNumero: Record<string, string>
}) {
  const statsCards = [
    {
      label: "Total de OPs",
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
      label: "Em Fabricação",
      value: stats.fabricacao,
      sub: "Na linha de produção",
      icon: Hammer,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      alert: false,
    },
    {
      label: "Em Produção",
      value: stats.producao,
      sub: "Em andamento",
      icon: Factory,
      color: "text-primary",
      bg: "bg-primary/10",
      alert: false,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Produção</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie as ordens de fabricação e produção em aberto
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {statsCards.map((stat) => (
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
                ) : (
                  <div />
                )}
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
          placeholder="Buscar por OP, responsável, setor ou pedido…"
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
            Todas
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 min-w-4">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendente" className="gap-1.5">
            Pendentes
            {stats.pendentes > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 min-w-4">{stats.pendentes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fabricacao" className="gap-1.5">
            Fabricação
            {stats.fabricacao > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 min-w-4 border-blue-500 text-blue-600 dark:text-blue-400">
                {stats.fabricacao}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="producao" className="gap-1.5">
            Produção
            {stats.producao > 0 && (
              <Badge variant="default" className="text-[10px] h-4 px-1.5 min-w-4">{stats.producao}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="concluido">Concluídas</TabsTrigger>
          <TabsTrigger value="cancelado">Canceladas</TabsTrigger>
        </TabsList>
        </div>

        {/* Single shared content block — tab drives the filter */}
        {["all", "pendente", "fabricacao", "producao", "concluido", "cancelado"].map(tab => (
          <TabsContent key={tab} value={tab} className="flex-1 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Ordens de Produção</CardTitle>
                    <CardDescription className="mt-0.5">
                      {filtered.length} ordem{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <div className="overflow-auto h-full">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="w-[110px] pl-4">Nº OP</TableHead>
                        <TableHead className="min-w-[140px]">Item</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[130px]">Responsável</TableHead>
                        <TableHead className="hidden md:table-cell w-[110px]">Setor</TableHead>
                        <TableHead className="hidden md:table-cell w-[90px]">Prioridade</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead className="hidden md:table-cell w-[100px]">Abertura</TableHead>
                        <TableHead className="w-[110px]">Prev. Entrega</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[140px]">Referência</TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9}>
                            <div className="py-16 text-center">
                              <Hammer className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">Nenhuma OP encontrada</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Tente ajustar o filtro ou a busca
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map(op => (
                          <OPRow key={op.id} op={op} onSelect={setSelected} orderNumero={orderNumero} />
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

export default function OPsPage() {
  const { ops, orders, vincular, desvincular } = useAppData()
  const [linkPopoverOpen, setLinkPopoverOpen] = React.useState(false)
  const [linkSearch, setLinkSearch] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [selected, setSelected] = React.useState<ProductionOrder | null>(null)
  const deferredSelected = React.useDeferredValue(selected)

  // Fechar Sheet se a OP for removida por cascade delete
  React.useEffect(() => {
    if (selected && !ops.find(o => o.id === selected.id)) setSelected(null)
  }, [ops, selected])

  // Lookup id → numero para exibição
  const orderNumero = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const o of orders) map[o.id] = o.numero ?? o.id
    return map
  }, [orders])

  // Debounce da busca — evita filtrar a cada tecla
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  const handleSelectOP = React.useCallback((op: ProductionOrder) => {
    setSelected(op)
  }, [])

  // Stats
  const stats = React.useMemo(() => {
    const total      = ops.length
    const pendentes  = ops.filter(o => o.status === "pendente").length
    const fabricacao = ops.filter(o => o.status === "fabricacao").length
    const producao   = ops.filter(o => o.status === "producao").length
    const atrasadas  = ops.filter(o => getDeliveryState(o) === "overdue").length
    return { total, pendentes, fabricacao, producao, atrasadas }
  }, [ops])

  // Filtered + sorted
  const filtered = React.useMemo(() => {
    return ops
      .filter(o => activeTab === "all" ? true : o.status === activeTab)
      .filter(o => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
          o.id.toLowerCase().includes(q) ||
          o.responsible.toLowerCase().includes(q) ||
          o.sector.toLowerCase().includes(q) ||
          o.linkedOrders.some(id => id.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        const order = { overdue: 0, urgent: 1, normal: 2 }
        const diff = order[getDeliveryState(a)] - order[getDeliveryState(b)]
        if (diff !== 0) return diff
        return a.deliveryAt.localeCompare(b.deliveryAt)
      })
  }, [ops, debouncedSearch, activeTab])

  return (
    <>
      <OPsMainContent
        stats={stats}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelected={handleSelectOP}
        orderNumero={orderNumero}
      />

      {/* Sheet: detalhes da OP */}
      <Sheet modal={false} open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent showOverlay={false} className="w-full sm:max-w-md p-0 gap-0">
          <SheetTitle className="sr-only">{selected?.id ?? "Detalhes da OP"}</SheetTitle>
          {deferredSelected && (() => {
            const selected = deferredSelected
            const s = statusConfig[selected.status]
            const p = priorityConfig[selected.prioridade] ?? priorityConfig["media"]
            const delivState = getDeliveryState(selected)
            return (
              <>
                {/* ── Header ── */}
                <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        selected.tipo === "externo"
                          ? "border-blue-400 text-blue-500 dark:text-blue-400"
                          : "border-emerald-400 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {selected.tipo === "externo"
                        ? <><Globe className="size-3" />Externo</>
                        : <><Building2 className="size-3" />Interno</>
                      }
                    </Badge>
                    <Badge variant={s.variant} className={cn(s.className)}>{s.label}</Badge>
                    <Badge variant={p.variant} className={cn("text-xs", p.className)}>{p.label}</Badge>
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
                    <p className="font-mono text-xl font-bold">{selected.numero || selected.empresa || selected.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selected.responsible} · {selected.sector}
                    </p>
                  </div>
                </SheetHeader>

                {/* ── Body (scrollável) ── */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                  {/* Itens */}
                  {(() => {
                    const items = selected.items ?? []
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

                  {/* Info grid 2×2 */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Abertura</p>
                        <p className="text-sm font-medium">{formatDate(selected.openedAt)}</p>
                      </div>
                      <div className={cn(
                        "rounded-lg px-3 py-2.5",
                        delivState === "overdue" ? "bg-destructive/10" :
                        delivState === "urgent"  ? "bg-amber-50 dark:bg-amber-950/30" :
                        "bg-muted/50"
                      )}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Entrega</p>
                        <p className={cn(
                          "text-sm font-medium",
                          delivState === "overdue" && "text-destructive",
                          delivState === "urgent"  && "text-amber-600 dark:text-amber-400"
                        )}>
                          {formatDate(selected.deliveryAt)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Responsável</p>
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium">{selected.responsible}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Setor</p>
                        <div className="flex items-center gap-1.5">
                          <Wrench className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium">{selected.sector}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fabricação */}
                  {selected.fabricacaoStartedAt && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Hammer className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fabricação</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Início</p>
                          <p className="text-sm font-medium">{formatDate(selected.fabricacaoStartedAt)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Conclusão</p>
                          {selected.fabricacaoEndedAt ? (
                            <p className="text-sm font-medium">{formatDate(selected.fabricacaoEndedAt)}</p>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">Em andamento</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empresa — só para OPs externas */}
                  {selected.tipo === "externo" && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Globe className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</p>
                      </div>
                      {selected.empresa ? (
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-sm font-medium">{selected.empresa}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed px-4 py-6 flex flex-col items-center gap-2 text-center">
                          <Globe className="size-6 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">Empresa não informada</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pedidos Vinculados */}
                  {(() => {
                    const linkedPedidos = orders.filter(o => selected.linkedOrders?.includes(o.id))
                    const available = orders.filter(o =>
                      !selected.linkedOrders?.includes(o.id) &&
                      (linkSearch === "" || o.numero?.includes(linkSearch) || o.cliente?.toLowerCase().includes(linkSearch.toLowerCase()))
                    )
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Link2 className="size-3.5 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pedidos Vinculados</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {linkedPedidos.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{linkedPedidos.length}</Badge>
                            )}
                            <Popover open={linkPopoverOpen} onOpenChange={open => { setLinkPopoverOpen(open); if (!open) setLinkSearch("") }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="size-6">
                                  <Plus className="size-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2" align="end">
                                <Input
                                  placeholder="Buscar pedido..."
                                  value={linkSearch}
                                  onChange={e => setLinkSearch(e.target.value)}
                                  className="h-8 text-xs mb-2"
                                />
                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                  {available.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum pedido disponível</p>
                                  ) : available.map(o => (
                                    <button
                                      key={o.id}
                                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs flex flex-col"
                                      onClick={() => { vincular(o.id, selected.id); setLinkPopoverOpen(false); setLinkSearch("") }}
                                    >
                                      <span className="font-mono font-medium">{o.numero ?? o.id}</span>
                                      {o.cliente && <span className="text-muted-foreground truncate">{o.cliente}</span>}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
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
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-mono font-medium text-xs">{order.numero ?? order.id}</span>
                                  {order.cliente && (
                                    <span className="text-[11px] text-muted-foreground truncate">{order.cliente}</span>
                                  )}
                                </div>
                                <button
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => desvincular(order.id, selected.id)}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                </div>

              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </>
  )
}
