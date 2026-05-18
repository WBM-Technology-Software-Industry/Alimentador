"use client"

import * as React from "react"
import {
  Search,
  CheckCircle2,
  Package,
  Hash,
  PackageSearch,
  FileText,
  User2,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { useAppData, type Order, type OrderItem } from "@/app/dashboard/data-provider"

function fmt(iso: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso + "T00:00:00"))
}

export default function PedidosConcluidosPage() {
  const { concluidos } = useAppData()
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Order | null>(null)

  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  const filtered = React.useMemo(() => {
    if (!debouncedSearch.trim()) return concluidos
    const q = debouncedSearch.toLowerCase()
    return concluidos.filter(o =>
      (o.numero  ?? "").toLowerCase().includes(q) ||
      (o.cliente ?? "").toLowerCase().includes(q) ||
      (o.items   ?? []).some((it: OrderItem) => it.name.toLowerCase().includes(q))
    )
  }, [concluidos, debouncedSearch])

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos Concluídos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Histórico de todos os pedidos finalizados
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 rounded-lg border bg-emerald-500/10 border-emerald-500/30 px-4 py-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {concluidos.length} concluído{concluidos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-sm shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nº, cliente ou item…"
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Histórico</CardTitle>
            <CardDescription>
              {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <div className="overflow-auto h-full">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="w-[130px] pl-4">Nº Pedido</TableHead>
                    <TableHead className="min-w-[160px]">Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[200px]">Itens</TableHead>
                    <TableHead className="hidden md:table-cell w-[120px]">Entrada</TableHead>
                    <TableHead className="w-[110px]">Prazo</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="py-16 text-center">
                          <PackageSearch className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">Nenhum pedido concluído</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {search ? "Tente ajustar a busca" : "Os pedidos finalizados aparecerão aqui"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((order, i) => {
                      const items     = order.items ?? []
                      const firstItem = items[0]
                      const extra     = items.length - 1

                      return (
                        <TableRow
                          key={order.id}
                          className={cn("cursor-pointer", i % 2 !== 0 && "bg-muted/20")}
                          onClick={() => setSelected(order)}
                        >
                          <TableCell className="pl-4 font-mono text-xs font-medium">
                            <div className="flex items-center gap-1">
                              <Hash className="size-3 text-muted-foreground/50" />
                              {order.numero ?? "—"}
                            </div>
                            {order.numeroCliente && (
                              <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                                cli: {order.numeroCliente}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm max-w-[200px]">
                            <span className="truncate block">{order.cliente}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[240px]">
                            {firstItem ? (
                              <span className="flex items-center gap-1.5">
                                <span className="truncate">{firstItem.name}</span>
                                <span className="text-muted-foreground/50 shrink-0">×{firstItem.quantity}</span>
                                {extra > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                    +{extra}
                                  </Badge>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {fmt(order.dataEntrada)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {fmt(order.dataPrazo)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Sheet de detalhes */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 gap-0">
          <SheetTitle className="sr-only">Detalhes do pedido concluído</SheetTitle>
          {selected && (
            <>
              {/* Header */}
              <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                <div>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="size-3" />
                    Concluído
                  </Badge>
                </div>
                <div>
                  <SheetTitle className="text-base font-bold leading-snug">{selected.cliente}</SheetTitle>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Pedido #{selected.numero}
                    {selected.numeroCliente && (
                      <span className="ml-2 text-muted-foreground/60">· cli: {selected.numeroCliente}</span>
                    )}
                  </p>
                </div>
              </SheetHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                {/* Datas */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datas</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                      <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entrada</p>
                        <p className="text-sm font-medium">{fmt(selected.dataEntrada)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                      <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prazo</p>
                        <p className="text-sm font-medium">{fmt(selected.dataPrazo)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cliente</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                      <User2 className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nome</p>
                        <p className="text-sm font-medium">{selected.cliente}</p>
                      </div>
                    </div>
                    {selected.numeroCliente && (
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <Hash className="size-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nº do Pedido do Cliente</p>
                          <p className="text-sm font-medium font-mono">{selected.numeroCliente}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itens */}
                {(selected.items ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Itens <span className="text-muted-foreground/50 font-normal normal-case">({selected.items.length})</span>
                    </p>
                    <div className="space-y-1.5">
                      {selected.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                          <Package className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm flex-1">{it.name}</p>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">×{it.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dados Adicionais */}
                {selected.dadosAdicionais && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Dados Adicionais para Nota Fiscal
                    </p>
                    <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                      <FileText className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selected.dadosAdicionais}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
