"use client"

import * as React from "react"
import { MessageSquareQuote, Plus, Trash2, User, CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  apiGetMensagensSemana,
  apiGetMensagemAtual,
  apiCreateMensagemSemana,
  apiDeleteMensagemSemana,
  type MensagemSemana,
} from "@/lib/api"

function formatWeek(semana_inicio: string): string {
  const mon = new Date(semana_inicio.substring(0, 10) + "T00:00:00")
  const fri = new Date(mon)
  fri.setDate(fri.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }
  return `${mon.toLocaleDateString("pt-BR", opts)} – ${fri.toLocaleDateString("pt-BR", opts)}`
}

function isCurrentWeek(semana_inicio: string): boolean {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + diff)
  thisMonday.setHours(0, 0, 0, 0)
  const msgMonday = new Date(semana_inicio.substring(0, 10) + "T00:00:00")
  return thisMonday.getTime() === msgMonday.getTime()
}

export function MensagemDaSemana() {
  const [mensagemAtual, setMensagemAtual] = React.useState<MensagemSemana | null>(null)
  const [historico, setHistorico] = React.useState<MensagemSemana[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ conteudo: "", responsavel: "", semana_inicio: "" })
  const [error, setError] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [atual, all] = await Promise.all([apiGetMensagemAtual(), apiGetMensagensSemana()])
      setMensagemAtual(atual)
      setHistorico(all)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.conteudo.trim()) { setError("Escreva a mensagem."); return }
    if (!form.responsavel.trim()) { setError("Informe o responsável."); return }
    setSaving(true); setError("")
    try {
      await apiCreateMensagemSemana({
        conteudo: form.conteudo.trim(),
        responsavel: form.responsavel.trim(),
        semana_inicio: form.semana_inicio || undefined,
      })
      setOpen(false)
      setForm({ conteudo: "", responsavel: "", semana_inicio: "" })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await apiDeleteMensagemSemana(id); await load() }
    finally { setDeleting(null) }
  }


  return (
    <>
      {/* ── Layout: dois cards lado a lado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Card principal: Esta semana (2/3 da largura) ── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Mensagem da Semana</CardTitle>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Semana atual</Badge>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setOpen(true)}>
                <Plus className="size-3.5" />
                Nova
              </Button>
            </div>
            <CardDescription className="text-xs">
              Comunicado semanal — atualizado toda segunda-feira
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Carregando…
              </div>
            ) : mensagemAtual ? (
              <div className="space-y-4">
                <blockquote className="text-sm leading-relaxed text-foreground whitespace-pre-wrap italic border-l-4 border-primary pl-4 py-1">
                  &quot;{mensagemAtual.conteudo}&quot;
                </blockquote>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    <span className="font-medium text-foreground">{mensagemAtual.responsavel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatWeek(mensagemAtual.semana_inicio)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <MessageSquareQuote className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem para esta semana.</p>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
                  <Plus className="size-3.5" />
                  Adicionar mensagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Card secundário: Histórico (1/3 da largura) ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Histórico</CardTitle>
            <CardDescription className="text-xs">Mensagens das semanas anteriores</CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Carregando…
              </div>
            ) : historico.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs text-center">
                Nenhuma mensagem cadastrada.
              </div>
            ) : (
              <ScrollArea className="max-h-[220px] pr-1">
                <div className="space-y-2 pr-2">
                  {historico.map(msg => (
                    <div key={msg.id} className="rounded-lg border bg-muted/20 p-3 space-y-1.5 group relative">
                      {isCurrentWeek(msg.semana_inicio) && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 mb-1">Esta semana</Badge>
                      )}
                      <p className="text-xs leading-relaxed text-foreground line-clamp-2">
                        {msg.conteudo}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                          <User className="size-3 shrink-0" />
                          <span className="truncate font-medium text-foreground/80">{msg.responsavel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground shrink-0">{formatWeek(msg.semana_inicio)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-5 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            disabled={deleting === msg.id}
                            onClick={() => handleDelete(msg.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Dialog nova mensagem ── */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); setError("") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquareQuote className="size-4 text-primary" />
              Nova Mensagem da Semana
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Responsável *</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                placeholder="Nome do responsável"
                value={form.responsavel}
                onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Mensagem *</label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground resize-none"
                placeholder="Escreva o comunicado da semana…"
                rows={4}
                value={form.conteudo}
                onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                Semana
                <span className="text-muted-foreground font-normal">(opcional — padrão: semana atual)</span>
              </label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-muted-foreground"
                value={form.semana_inicio}
                onChange={e => setForm(f => ({ ...f, semana_inicio: e.target.value }))}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
