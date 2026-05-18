"use client"

import * as React from "react"
import {
  Bug,
  Lightbulb,
  MessageSquare,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
  User,
  CalendarDays,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  useAppData,
  type Ticket,
  type TicketTipo,
  type TicketPrioridade,
  type TicketStatus,
} from "@/app/dashboard/data-provider"
import { useAuth } from "@/lib/auth-context"

// ── Configs ──────────────────────────────────────────────────────────────────

const tipoConfig: Record<TicketTipo, { label: string; icon: React.ElementType; className: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  bug:      { label: "Bug",      icon: Bug,           className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",      variant: "outline" },
  melhoria: { label: "Melhoria", icon: Lightbulb,     className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", variant: "outline" },
  outro:    { label: "Outro",    icon: MessageSquare, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",   variant: "outline" },
}

const prioridadeConfig: Record<TicketPrioridade, { label: string; className: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  alta:  { label: "Alta",  className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",      variant: "outline" },
  media: { label: "Média", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", variant: "outline" },
  baixa: { label: "Baixa", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", variant: "outline" },
}

const statusConfig: Record<TicketStatus, { label: string; icon: React.ElementType; className: string }> = {
  aberto:     { label: "Aberto",     icon: Clock,        className: "text-muted-foreground" },
  em_analise: { label: "Em análise", icon: Loader2,      className: "text-amber-500 dark:text-amber-400" },
  resolvido:  { label: "Resolvido",  icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ── Discord webhook ──────────────────────────────────────────────────────────

async function sendDiscordWebhook(url: string, data: { titulo: string; descricao: string; tipo: TicketTipo; prioridade: TicketPrioridade; responsavel?: string; data?: string }) {
  const colors    = { bug: 15158332, melhoria: 16776960, outro: 3447003 }
  const prioLabel = { alta: "🔴 Alta", media: "🟡 Média", baixa: "🟢 Baixa" }
  const tipoLabel = { bug: "🐛 Bug", melhoria: "💡 Melhoria", outro: "💬 Outro" }

  const fields = [
    { name: "Tipo",       value: tipoLabel[data.tipo],       inline: true },
    { name: "Prioridade", value: prioLabel[data.prioridade], inline: true },
  ]
  if (data.responsavel) fields.push({ name: "Responsável", value: data.responsavel, inline: true })
  if (data.data) {
    const [y, m, d] = data.data.split("-")
    fields.push({ name: "Data", value: `${d}/${m}/${y}`, inline: true })
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: `🎫 ${data.titulo}`,
        description: data.descricao || "*Sem descrição*",
        color: colors[data.tipo],
        fields,
        footer: { text: "WBM Dashboard — Suporte" },
        timestamp: new Date().toISOString(),
      }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Discord ${res.status}: ${body}`)
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SuportePage() {
  const { tickets, addTicket, deleteTicket } = useAppData()
  const { user } = useAuth()

  const [search, setSearch]             = React.useState("")
  const [activeTab, setActiveTab]       = React.useState<"todos" | TicketStatus>("todos")
  const [dialogOpen, setDialogOpen]     = React.useState(false)
  const [selected, setSelected]         = React.useState<Ticket | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Ticket | null>(null)
  const [submitting, setSubmitting]     = React.useState(false)

  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL ?? ""

  // form state
  const [titulo,       setTitulo]       = React.useState("")
  const [descricao,    setDescricao]    = React.useState("")
  const [tipo,         setTipo]         = React.useState<TicketTipo>("bug")
  const [prioridade,   setPrioridade]   = React.useState<TicketPrioridade>("media")
  const [responsavel,  setResponsavel]  = React.useState("")
  const [data,         setData]         = React.useState("")

  function openNew() {
    setTitulo("")
    setDescricao("")
    setTipo("bug")
    setPrioridade("media")
    setResponsavel(user?.name ?? "")
    setData(new Date().toISOString().split("T")[0])
    setWebhookError("")
    setDialogOpen(true)
  }

  const [webhookError, setWebhookError] = React.useState("")

  async function handleSubmit() {
    if (!titulo.trim()) return
    setSubmitting(true)
    setWebhookError("")
    try {
      await addTicket({ titulo: titulo.trim(), descricao: descricao.trim(), tipo, prioridade, criadoPor: responsavel.trim() })
      const url = webhookUrl.trim()
      if (url) {
        try {
          await sendDiscordWebhook(url, { titulo: titulo.trim(), descricao: descricao.trim(), tipo, prioridade, responsavel: responsavel.trim(), data })
        } catch (err) {
          setWebhookError(err instanceof Error ? `Discord: ${err.message}` : "Erro ao enviar para o Discord.")
          // não fecha o dialog para o usuário ver o erro
          return
        }
      }
      setDialogOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(t: Ticket) {
    await deleteTicket(t.id)
    if (selected?.id === t.id) setSelected(null)
    setDeleteTarget(null)
  }

  const filtered = tickets.filter(t => {
    const matchTab    = activeTab === "todos" || t.status === activeTab
    const matchSearch = search === "" ||
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      t.descricao.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = {
    todos:      tickets.length,
    aberto:     tickets.filter(t => t.status === "aberto").length,
    em_analise: tickets.filter(t => t.status === "em_analise").length,
    resolvido:  tickets.filter(t => t.status === "resolvido").length,
  }

  return (
    // A página não adiciona padding próprio — o layout já fornece p-6
    <div className="flex flex-col gap-4 sm:gap-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suporte</h1>
          <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
            Reporte bugs, sugira melhorias ou deixe qualquer outro feedback.
          </p>
        </div>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0"
          onClick={openNew}
        >
          <CardContent className="px-4 py-2.5 flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <span className="text-sm font-medium">Novo ticket</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {(["todos", "aberto", "em_analise", "resolvido"] as const).map(key => {
          const labels: Record<string, string> = {
            todos: "Total", aberto: "Abertos", em_analise: "Em análise", resolvido: "Resolvidos",
          }
          const icons: Record<string, React.ElementType> = {
            todos: MessageSquare, aberto: Clock, em_analise: Loader2, resolvido: CheckCircle2,
          }
          const Icon = icons[key]
          return (
            <Card key={key} className="py-3 sm:py-4">
              <CardContent className="px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
                <div className="size-8 sm:size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 sm:size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold leading-none">{counts[key]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{labels[key]}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-0 items-start">

        {/* List column */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Tabs — scrollable horizontalmente no mobile */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <div className="overflow-x-auto">
              <TabsList className="w-max min-w-full">
                <TabsTrigger value="todos" className="gap-1.5">
                  Todos
                  <span className="text-xs text-muted-foreground tabular-nums">{counts.todos}</span>
                </TabsTrigger>
                <TabsTrigger value="aberto" className="gap-1.5">
                  Abertos
                  <span className="text-xs text-muted-foreground tabular-nums">{counts.aberto}</span>
                </TabsTrigger>
                <TabsTrigger value="em_analise" className="gap-1.5">
                  <span className="hidden sm:inline">Em análise</span>
                  <span className="sm:hidden">Análise</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{counts.em_analise}</span>
                </TabsTrigger>
                <TabsTrigger value="resolvido" className="gap-1.5">
                  Resolvidos
                  <span className="text-xs text-muted-foreground tabular-nums">{counts.resolvido}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {(["todos", "aberto", "em_analise", "resolvido"] as const).map(tab => (
              <TabsContent key={tab} value={tab} className="mt-3 space-y-2">
                {filtered.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center gap-3">
                      <MessageSquare className="size-9 sm:size-10 text-muted-foreground/40" />
                      <div>
                        <p className="font-medium text-muted-foreground">Nenhum ticket encontrado</p>
                        <p className="text-sm text-muted-foreground/60 mt-0.5">
                          {search ? "Tente outro termo de busca." : "Clique em \"Novo\" para enviar feedback."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filtered.map(ticket => {
                    const t  = tipoConfig[ticket.tipo]
                    const p  = prioridadeConfig[ticket.prioridade]
                    const s  = statusConfig[ticket.status]
                    const SI = s.icon
                    const TI = t.icon
                    const isActive = selected?.id === ticket.id

                    return (
                      <Card
                        key={ticket.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/40",
                          isActive && "ring-1 ring-primary bg-muted/40"
                        )}
                        onClick={() => setSelected(isActive ? null : ticket)}
                      >
                        <CardContent className="px-3 sm:px-4 py-3 flex items-start gap-2 sm:gap-3">
                          {/* Ícone do tipo — oculto em telas muito pequenas */}
                          <div className="hidden xs:flex size-8 rounded-md bg-muted items-center justify-center shrink-0 mt-0.5 sm:flex">
                            <TI className="size-4 text-muted-foreground" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2 sm:truncate sm:line-clamp-none">
                              {ticket.titulo}
                            </p>

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant={t.variant} className={cn("text-xs gap-1 py-0", t.className)}>
                                <TI className="size-3" />{t.label}
                              </Badge>
                              <Badge variant={p.variant} className={cn("text-xs py-0", p.className)}>
                                {p.label}
                              </Badge>
                              <span className={cn("flex items-center gap-1 text-xs", s.className)}>
                                <SI className="size-3" />{s.label}
                              </span>
                            </div>

                            {/* Data — linha separada, alinhada à direita */}
                            <p className="text-xs text-muted-foreground/60 mt-1 text-right">
                              {formatDate(ticket.criadoEm)}
                            </p>
                          </div>

                          <ChevronRight className={cn(
                            "size-4 text-muted-foreground shrink-0 mt-1 transition-transform",
                            isActive && "rotate-90"
                          )} />
                        </CardContent>

                        {/* Detalhes expandidos */}
                        {isActive && (
                          <>
                            <Separator />
                            <CardContent className="px-3 sm:px-4 py-4 space-y-4">

                              {/* Responsável / Data / Status */}
                              <div className="grid grid-cols-3 gap-2">
                                <Card className="py-0">
                                  <CardContent className="px-3 py-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                      <User className="size-3" /> Responsável
                                    </p>
                                    <p className="text-xs font-semibold truncate">
                                      {ticket.criadoPor || <span className="italic text-muted-foreground/50">—</span>}
                                    </p>
                                  </CardContent>
                                </Card>
                                <Card className="py-0">
                                  <CardContent className="px-3 py-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                      <CalendarDays className="size-3" /> Data
                                    </p>
                                    <p className="text-xs font-semibold">{formatDate(ticket.criadoEm)}</p>
                                  </CardContent>
                                </Card>
                                <Card className="py-0">
                                  <CardContent className="px-3 py-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                      <SI className="size-3" /> Status
                                    </p>
                                    <p className={cn("text-xs font-semibold", s.className)}>{s.label}</p>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Descrição */}
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                  Descrição
                                </p>
                                <p className="text-sm leading-relaxed text-foreground/80">
                                  {ticket.descricao || (
                                    <span className="italic text-muted-foreground">Sem descrição.</span>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center justify-end">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-muted-foreground hover:text-destructive"
                                      onClick={e => { e.stopPropagation(); setDeleteTarget(ticket) }}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir ticket</TooltipContent>
                                </Tooltip>
                              </div>
                            </CardContent>
                          </>
                        )}
                      </Card>
                    )
                  })
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Tips panel — aparece a partir de lg */}
        <div className="hidden lg:flex flex-col gap-3 w-64 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="size-4 text-red-500" /> Reportar bug
              </CardTitle>
              <CardDescription className="text-xs">
                Descreva o que aconteceu, em qual tela e quais passos levaram ao problema.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" /> Sugerir melhoria
              </CardTitle>
              <CardDescription className="text-xs">
                Explique o que gostaria de ver e como isso ajudaria no seu trabalho diário.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-500" /> Outro feedback
              </CardTitle>
              <CardDescription className="text-xs">
                Dúvidas, elogios ou qualquer outro tipo de mensagem para a equipe.
              </CardDescription>
            </CardHeader>
          </Card>

        </div>
      </div>

      {/* Tips inline — visível entre sm e lg (abaixo da lista) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:hidden">
        {[
          { icon: Bug,           color: "text-red-500",    title: "Reportar bug",      desc: "Informe a tela e os passos que causaram o problema." },
          { icon: Lightbulb,     color: "text-amber-500",  title: "Sugerir melhoria",  desc: "Descreva como a melhoria ajudaria no dia a dia." },
          { icon: MessageSquare, color: "text-blue-500",   title: "Outro feedback",    desc: "Dúvidas, elogios ou qualquer outra mensagem." },
        ].map(({ icon: Icon, color, title, desc }) => (
          <Card key={title}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Icon className={cn("size-3.5", color)} /> {title}
              </CardTitle>
              <CardDescription className="text-xs leading-snug">{desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* ── Dialog: novo ticket ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-lg sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Novo ticket</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para enviar seu feedback à equipe.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardContent className="px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo">Título <span className="text-destructive">*</span></Label>
                <Input
                  id="titulo"
                  placeholder="Resumo curto do problema ou sugestão"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                />
              </div>

              {/* Responsável + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    placeholder="Nome do responsável"
                    value={responsavel}
                    onChange={e => setResponsavel(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                  />
                </div>
              </div>

              {/* Tipo + Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={v => setTipo(v as TicketTipo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">🐛 Bug</SelectItem>
                      <SelectItem value="melhoria">💡 Melhoria</SelectItem>
                      <SelectItem value="outro">💬 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={prioridade} onValueChange={v => setPrioridade(v as TicketPrioridade)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">🔴 Alta</SelectItem>
                      <SelectItem value="media">🟡 Média</SelectItem>
                      <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva com detalhes: o que aconteceu, qual tela, quais passos..."
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="min-h-[100px] sm:min-h-[120px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {webhookError && (
            <p className="text-sm text-destructive">{webhookError}</p>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={!titulo.trim() || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Enviar ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar exclusão ─────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-lg sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.titulo}&rdquo; será removido permanentemente do Firebase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
