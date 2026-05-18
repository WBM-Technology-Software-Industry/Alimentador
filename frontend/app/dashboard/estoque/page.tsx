"use client"

import * as React from "react"
import {
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Tag,
  MapPin,
  ChevronLeft,
  ChevronRight,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { apiOmieProxy } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OmieProduto {
  nCodProd: number
  cCodigo: string
  cDescricao: string
  nSaldo: number
  estoque_minimo: number
  nPrecoUnitario: number
  fisico: number
  nPendente: number
  reservado: number
}

interface OmieEstoqueResponse {
  nPagina: number
  nTotPaginas: number
  nRegistros: number
  nTotRegistros: number
  dDataPosicao: string
  produtos: OmieProduto[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

function stockStatus(saldo: number, minimo: number): "ok" | "baixo" | "zerado" {
  if (saldo <= 0) return "zerado"
  if (saldo <= minimo) return "baixo"
  return "ok"
}

const statusConfig = {
  ok:     { label: "Normal", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  baixo:  { label: "Baixo",  color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-950/40" },
  zerado: { label: "Zerado", color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-950/40" },
}

function formatCurrency(value?: number): string {
  if (value == null || value === 0) return "—"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const [produtos,      setProdutos]      = React.useState<OmieProduto[]>([])
  const [totalPages,    setTotalPages]    = React.useState(1)
  const [totalItems,    setTotalItems]    = React.useState(0)
  const [dataDate,      setDataDate]      = React.useState("")
  const [page,          setPage]          = React.useState(1)
  const [loading,       setLoading]       = React.useState(true)
  const [search,        setSearch]        = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [selected,      setSelected]      = React.useState<OmieProduto | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    const param: Record<string, unknown> = { nPagina: page, nRegPorPagina: PAGE_SIZE }
    if (debouncedSearch.trim()) param.cDescricao = debouncedSearch.trim()

    apiOmieProxy<OmieEstoqueResponse>("/estoque/consulta/", "ListarPosEstoque", [param])
      .then(res => {
        if (cancelled) return
        setProdutos(res.produtos ?? [])
        setTotalPages(res.nTotPaginas ?? 1)
        setTotalItems(res.nTotRegistros ?? 0)
        setDataDate(res.dDataPosicao ?? "")
      })
      .catch(() => {
        if (!cancelled) setProdutos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [page, debouncedSearch])

  // ── Stats (página atual) ───────────────────────────────────────────────────
  const itensBaixos  = produtos.filter(p => stockStatus(p.nSaldo, p.estoque_minimo) !== "ok").length
  const valorPagina  = produtos.reduce((acc, p) => acc + (p.nPrecoUnitario ?? 0) * Math.max(p.nSaldo, 0), 0)

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Posição de estoque via OMIE
              {dataDate && <span className="ml-1 text-muted-foreground/60">— {dataDate}</span>}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          {[
            {
              label: "Total de Produtos",
              value: loading ? "—" : totalItems.toLocaleString("pt-BR"),
              sub: "Cadastrados no OMIE",
              icon: Package,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/40",
            },
            {
              label: "Baixo / Zerado",
              value: loading ? "—" : itensBaixos,
              sub: "Nesta página",
              icon: AlertTriangle,
              color: itensBaixos > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
              bg: itensBaixos > 0 ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
            },
            {
              label: "Valor na Página",
              value: loading ? "—" : formatCurrency(valorPagina),
              sub: "Baseado no saldo × preço unit.",
              icon: DollarSign,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 dark:bg-purple-950/40",
            },
          ].map(s => (
            <Card key={s.label} className="gap-0 py-0">
              <CardContent className="p-5">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-4", s.bg)}>
                  <s.icon className={cn("size-4", s.color)} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                <p className="text-[11px] mt-0.5 text-muted-foreground/70">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descrição…"
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabela */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Itens em Estoque</CardTitle>
            <CardDescription>
              {loading
                ? "Carregando…"
                : `${totalItems.toLocaleString("pt-BR")} produto${totalItems !== 1 ? "s" : ""} — página ${page} de ${totalPages}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="pl-4 min-w-[260px]">Produto</TableHead>
                    <TableHead className="w-[130px]">Código</TableHead>
                    <TableHead className="w-[110px]">Saldo</TableHead>
                    <TableHead className="w-[110px]">Físico</TableHead>
                    <TableHead className="w-[120px]">Preço Unit.</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-4"><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    : produtos.length === 0
                      ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="py-16 text-center">
                                <Package className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      : produtos.map(p => {
                          const st  = stockStatus(p.nSaldo, p.estoque_minimo)
                          const cfg = statusConfig[st]
                          return (
                            <TableRow
                              key={p.nCodProd}
                              className="cursor-pointer"
                              onClick={() => setSelected(p)}
                            >
                              <TableCell className="pl-4">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                                    {st !== "ok"
                                      ? <TrendingDown className={cn("size-3.5", cfg.color)} />
                                      : <Package className={cn("size-3.5", cfg.color)} />
                                    }
                                  </div>
                                  <p className="font-medium text-sm line-clamp-1">{p.cDescricao}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground">{p.cCodigo || "—"}</span>
                              </TableCell>
                              <TableCell>
                                <span className={cn("text-sm font-medium", st !== "ok" && cfg.color)}>
                                  {p.nSaldo}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{p.fisico}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">{formatCurrency(p.nPrecoUnitario)}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-[11px]", cfg.color)}>
                                  {cfg.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })
                  }
                </TableBody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-between gap-4 shrink-0">
                <p className="text-xs text-muted-foreground">
                  Mostrando {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalItems)} de {totalItems.toLocaleString("pt-BR")}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number
                    if (totalPages <= 5) {
                      p = i + 1
                    } else if (page <= 3) {
                      p = i + 1
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i
                    } else {
                      p = page - 2 + i
                    }
                    return (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="size-8 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sheet: Detalhes do produto ───────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 gap-0">
          {selected && (() => {
            const st  = stockStatus(selected.nSaldo, selected.estoque_minimo)
            const cfg = statusConfig[st]
            return (
              <>
                <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                      <Package className={cn("size-5", cfg.color)} />
                    </div>
                    <div>
                      <SheetTitle className="text-sm font-bold leading-snug">{selected.cDescricao}</SheetTitle>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{selected.cCodigo || `ID ${selected.nCodProd}`}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("w-fit text-xs", cfg.color)}>{cfg.label}</Badge>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
                      <p className={cn("text-lg font-bold mt-0.5", st !== "ok" && cfg.color)}>{selected.nSaldo}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Físico</p>
                      <p className="text-lg font-bold mt-0.5">{selected.fisico}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendente</p>
                      <p className="text-lg font-bold mt-0.5">{selected.nPendente}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Reservado</p>
                      <p className="text-lg font-bold mt-0.5">{selected.reservado}</p>
                    </div>
                  </div>

                  {selected.estoque_minimo > 0 && (
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Estoque Mínimo</p>
                      <p className="text-sm font-medium mt-0.5">{selected.estoque_minimo}</p>
                    </div>
                  )}

                  {selected.nPrecoUnitario > 0 && (
                    <>
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Preço Unitário</p>
                          <p className="text-sm font-medium">{formatCurrency(selected.nPrecoUnitario)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <Tag className="size-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor em Estoque</p>
                          <p className="text-sm font-medium">{formatCurrency(selected.nPrecoUnitario * Math.max(selected.nSaldo, 0))}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Código interno OMIE</p>
                      <p className="text-sm font-medium font-mono">{selected.nCodProd}</p>
                    </div>
                  </div>

                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </>
  )
}
