"use client"

import * as React from "react"
import {
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
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
import { cn } from "@/lib/utils"
import { useAppData, type Client } from "../data-provider"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400",
  "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
]

// ─── Máscaras ─────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

// ─── Empty form ───────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function ClientesPage() {
  const { clients } = useAppData()
  const [search,    setSearch]    = React.useState("")
  const [selected,  setSelected]  = React.useState<Client | null>(null)
  const [page,      setPage]      = React.useState(1)

  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => { setPage(1) }, [debouncedSearch])

  // ── Filtered + paginação ───────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    return clients
      .filter(c => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
          c.nome.toLowerCase().includes(q) ||
          c.documento.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.telefone.toLowerCase().includes(q) ||
          c.endereco.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [clients, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Cadastro e gestão de clientes
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          {[
            {
              label: "Total de Clientes",
              value: clients.length,
              sub: "Cadastros ativos",
              icon: Users,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/40",
            },
            {
              label: "Pessoas Físicas",
              value: clients.filter(c => c.documento.replace(/\D/g, "").length <= 11).length,
              sub: "CPF cadastrado",
              icon: User,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/40",
            },
            {
              label: "Pessoas Jurídicas",
              value: clients.filter(c => c.documento.replace(/\D/g, "").length > 11).length,
              sub: "CNPJ cadastrado",
              icon: Building2,
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
            placeholder="Buscar por nome, documento, e-mail…"
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabela */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Clientes Cadastrados</CardTitle>
            <CardDescription>
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <div className="overflow-auto h-full">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="pl-4 min-w-[200px]">Cliente</TableHead>
                    <TableHead className="w-[160px]">Documento</TableHead>
                    <TableHead className="min-w-[180px]">E-mail</TableHead>
                    <TableHead className="w-[150px]">Telefone</TableHead>
                    <TableHead className="min-w-[180px]">Endereço</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="py-16 text-center">
                          <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">
                            {clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {clients.length === 0 ? "Nenhum cliente cadastrado" : "Tente ajustar a busca"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(c => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(c)}
                      >
                        {/* Nome */}
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              avatarColor(c.nome)
                            )}>
                              {initials(c.nome)}
                            </div>
                            <span className="font-medium text-sm truncate max-w-[150px]">{c.nome}</span>
                          </div>
                        </TableCell>

                        {/* Documento */}
                        <TableCell>
                          {c.documento ? (
                            <span className="font-mono text-xs text-muted-foreground">{c.documento}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>

                        {/* E-mail */}
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          <span className="truncate block">{c.email || "—"}</span>
                        </TableCell>

                        {/* Telefone */}
                        <TableCell className="text-xs text-muted-foreground">
                          {c.telefone || "—"}
                        </TableCell>

                        {/* Endereço */}
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          <span className="truncate block">{c.endereco || "—"}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
          </CardContent>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} clientes
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs font-medium px-2">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>


      {/* ── Sheet: Detalhes do cliente ──────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 gap-0">
          {selected && (
            <>
              {/* Header */}
              <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    avatarColor(selected.nome)
                  )}>
                    {initials(selected.nome)}
                  </div>
                  <div>
                    <SheetTitle className="text-base font-bold leading-snug">{selected.nome}</SheetTitle>
                    {selected.documento && (
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{selected.documento}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  {selected.documento.replace(/\D/g, "").length > 11 ? "Pessoa Jurídica" : "Pessoa Física"}
                </Badge>
              </SheetHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

                {selected.email && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">E-mail</p>
                      <p className="text-sm font-medium break-all">{selected.email}</p>
                    </div>
                  </div>
                )}

                {selected.telefone && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Telefone</p>
                      <p className="text-sm font-medium">{selected.telefone}</p>
                    </div>
                  </div>
                )}

                {selected.endereco && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Endereço</p>
                      <p className="text-sm font-medium">{selected.endereco}</p>
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
