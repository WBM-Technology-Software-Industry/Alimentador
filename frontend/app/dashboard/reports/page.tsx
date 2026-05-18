"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  FileText,
  CalendarIcon,
  Building2,
  User,
  Clock,
  Paperclip,
  Download,
  X,
  Upload,
  File as FileIcon,
} from "lucide-react"
import {
  Card,
  CardContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useAppData, type Report, type ReportArquivo } from "../data-provider"
import { useAuth } from "@/lib/auth-context"

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = [
  "Mecânica", "CTO", "CEO", "CCO", "Software",
  "EletroEletrônica", "Vendas", "Gerente de Fábrica", "ADM",
] as const

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso + "T00:00:00"))
}

function formatDateTime(iso: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

function fileIcon(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase() ?? ""
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️"
  if (ext === "pdf") return "📄"
  if (["doc", "docx"].includes(ext)) return "📝"
  if (["xls", "xlsx"].includes(ext)) return "📊"
  return "📎"
}

const emptyForm = {
  titulo:         "",
  setor:          SECTORS[0] as string,
  conteudo:       "",
  dataReferencia: "",
}

// ─── FileList (novos arquivos a enviar) ───────────────────────────────────────

function NewFileList({
  files,
  onRemove,
}: {
  files: File[]
  onRemove: (idx: number) => void
}) {
  if (!files.length) return null
  return (
    <div className="space-y-1.5 mt-2">
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs">
          <span>{fileIcon(f.name)}</span>
          <span className="flex-1 truncate font-medium">{f.name}</span>
          <span className="text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
          <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { reports, addReport, updateReport, deleteReport, deleteReportFile } = useAppData()
  const { user } = useAuth()

  const [search,        setSearch]        = React.useState("")
  const [filterSetor,   setFilterSetor]   = React.useState("all")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  // ── Dialog: Novo / Editar ──────────────────────────────────────────────────
  const [dialogOpen,   setDialogOpen]   = React.useState(false)
  const [editTarget,   setEditTarget]   = React.useState<Report | null>(null)
  const [form,         setForm]         = React.useState(emptyForm)
  const [saving,       setSaving]       = React.useState(false)
  const [newFiles,     setNewFiles]     = React.useState<File[]>([])
  const [deleteTarget, setDeleteTarget] = React.useState<Report | null>(null)
  const [deletingFile, setDeletingFile] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Sheet: Visualizar ─────────────────────────────────────────────────────
  const [viewing, setViewing] = React.useState<Report | null>(null)

  // Mantém viewing sincronizado com reports (para refletir remoção de arquivos)
  React.useEffect(() => {
    if (!viewing) return
    const updated = reports.find(r => r.id === viewing.id)
    if (updated) setViewing(updated)
  }, [reports]) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = React.useCallback(() => {
    setForm(emptyForm)
    setEditTarget(null)
    setNewFiles([])
    setDialogOpen(true)
  }, [])

  const openEdit = React.useCallback((r: Report) => {
    setForm({
      titulo:         r.titulo,
      setor:          r.setor,
      conteudo:       r.conteudo,
      dataReferencia: r.dataReferencia,
    })
    setEditTarget(r)
    setNewFiles([])
    setDialogOpen(true)
  }, [])

  const handleAddFiles = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    setNewFiles(prev => [...prev, ...picked])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleRemoveNewFile = React.useCallback((idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleSubmit = React.useCallback(async () => {
    setSaving(true)
    try {
      const autorNome = user?.displayName ?? user?.email?.split("@")[0] ?? "Usuário"
      if (editTarget) {
        const updates = {
          titulo:         form.titulo.trim(),
          setor:          form.setor,
          conteudo:       form.conteudo,
          dataReferencia: form.dataReferencia,
        }
        await updateReport(editTarget.id, updates, newFiles.length ? newFiles : undefined)
      } else {
        await addReport({
          titulo:         form.titulo.trim(),
          setor:          form.setor,
          conteudo:       form.conteudo,
          dataReferencia: form.dataReferencia,
          autorNome,
          criadoPor:      user?.uid ?? "",
          arquivos:       [],
        }, newFiles.length ? newFiles : undefined)
      }
      setDialogOpen(false)
      setEditTarget(null)
      setNewFiles([])
    } finally {
      setSaving(false)
    }
  }, [form, editTarget, newFiles, user, addReport, updateReport])

  const handleDeleteFile = React.useCallback(async (relatorioId: string, arquivo: ReportArquivo) => {
    setDeletingFile(arquivo.id)
    try {
      await deleteReportFile(relatorioId, arquivo.id)
    } finally {
      setDeletingFile(null)
    }
  }, [deleteReportFile])

  const formValid = React.useMemo(() =>
    form.titulo.trim() !== "" && form.conteudo.trim() !== "" && form.dataReferencia !== "",
  [form])

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    await deleteReport(deleteTarget.id)
    setViewing(prev => prev?.id === deleteTarget.id ? null : prev)
    setDeleteTarget(null)
  }, [deleteTarget, deleteReport])

  const filtered = React.useMemo(() => {
    return reports
      .filter(r => filterSetor === "all" ? true : r.setor === filterSetor)
      .filter(r => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
          r.titulo.toLowerCase().includes(q) ||
          r.setor.toLowerCase().includes(q) ||
          r.autorNome.toLowerCase().includes(q) ||
          r.conteudo.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  }, [reports, debouncedSearch, filterSetor])

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Crie e visualize relatórios por setor</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="shrink-0" onClick={openNew}>
                <Plus className="size-3.5" />
                Novo Relatório
              </Button>
            </TooltipTrigger>
            <TooltipContent>Criar novo relatório</TooltipContent>
          </Tooltip>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por título, setor ou autor…"
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterSetor} onValueChange={setFilterSetor}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="size-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="size-12 text-muted-foreground/25 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum relatório encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {reports.length === 0 ? "Clique em \"Novo Relatório\" para começar" : "Tente ajustar a busca ou o filtro"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(r => (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:shadow-md transition-shadow gap-0 py-0 group"
                  onClick={() => setViewing(r)}
                >
                  <CardHeader className="px-5 pt-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] h-5 shrink-0">{r.setor}</Badge>
                      <span className="text-[11px] text-muted-foreground/60 shrink-0">{formatDate(r.dataReferencia)}</span>
                    </div>
                    <CardTitle className="text-sm font-semibold leading-snug mt-2 line-clamp-2">{r.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.conteudo}</p>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{r.autorNome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {r.arquivos?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="size-3 shrink-0" />
                            {r.arquivos.length}
                          </span>
                        )}
                        <Clock className="size-3 shrink-0" />
                        <span>{formatDateTime(r.criadoEm).split(" ")[0]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Dialog: Novo / Editar ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setEditTarget(null); setNewFiles([]) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Relatório" : "Novo Relatório"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Atualize os dados do relatório." : "Preencha os dados do novo relatório."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 py-1 pr-3">

              <div className="space-y-1.5">
                <Label htmlFor="r-titulo">Título <span className="text-destructive">*</span></Label>
                <Input
                  id="r-titulo"
                  placeholder="Ex: Relatório de produção — Fevereiro 2026"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Setor <span className="text-destructive">*</span></Label>
                  <Select value={form.setor} onValueChange={val => setForm(f => ({ ...f, setor: val }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Data de referência <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !form.dataReferencia && "text-muted-foreground")}
                      >
                        <CalendarIcon className="size-4" />
                        {form.dataReferencia ? format(new Date(form.dataReferencia + "T00:00:00"), "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.dataReferencia ? new Date(form.dataReferencia + "T00:00:00") : undefined}
                        onSelect={date => setForm(f => ({ ...f, dataReferencia: date ? date.toISOString().split("T")[0] : "" }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-conteudo">Conteúdo <span className="text-destructive">*</span></Label>
                <Textarea
                  id="r-conteudo"
                  placeholder="Descreva o relatório detalhadamente…"
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  className="min-h-[160px] resize-y"
                />
              </div>

              {/* Arquivos já salvos (edição) */}
              {editTarget && editTarget.arquivos?.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Arquivos já anexados</Label>
                  <div className="space-y-1.5">
                    {editTarget.arquivos.map(a => (
                      <div key={a.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5 text-xs">
                        <span>{fileIcon(a.arquivo_nome)}</span>
                        <span className="flex-1 truncate font-medium">{a.arquivo_nome}</span>
                        <a
                          href={a.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="size-3.5" />
                        </a>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deletingFile === a.id}
                          onClick={async e => {
                            e.stopPropagation()
                            await handleDeleteFile(editTarget.id, a)
                            setEditTarget(prev => prev ? { ...prev, arquivos: prev.arquivos.filter(x => x.id !== a.id) } : prev)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar novos arquivos */}
              <div className="space-y-1.5">
                <Label>
                  {editTarget ? "Adicionar mais arquivos" : "Arquivos anexos"}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" />
                    Escolher arquivos
                  </Button>
                  <span className="text-xs text-muted-foreground">PDF, DOC, XLS, imagens — máx. 20 MB cada</span>
                </div>
                <NewFileList files={newFiles} onRemove={handleRemoveNewFile} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  multiple
                  className="hidden"
                  onChange={handleAddFiles}
                />
              </div>

            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditTarget(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formValid || saving}>
              {saving ? "Salvando…" : editTarget ? "Salvar Alterações" : "Criar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Excluir ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              O relatório <span className="font-medium text-foreground">&quot;{deleteTarget?.titulo}&quot;</span> será
              removido permanentemente junto com todos os arquivos anexados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Visualizar relatório ─────────────────────────────────────── */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewing && (
            <>
              <DialogHeader className="gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{viewing.setor}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    Ref: {formatDate(viewing.dataReferencia)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold leading-snug">{viewing.titulo}</DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><User className="size-3" />{viewing.autorNome}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" />Criado em {formatDateTime(viewing.criadoEm)}</span>
                  {viewing.atualizadoEm && viewing.atualizadoEm !== viewing.criadoEm && (
                    <span className="text-muted-foreground/60">· Editado em {formatDateTime(viewing.atualizadoEm)}</span>
                  )}
                </div>
              </DialogHeader>

              <Separator />

              <ScrollArea className="max-h-[35vh] pr-1">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground py-1 pr-3">{viewing.conteudo}</p>
              </ScrollArea>

              {/* Lista de arquivos */}
              {viewing.arquivos?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="size-3.5" />
                    Arquivos anexados ({viewing.arquivos.length})
                  </p>
                  <div className="space-y-1.5">
                    {viewing.arquivos.map(a => (
                      <div key={a.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs bg-muted/30 group">
                        <span className="text-base leading-none">{fileIcon(a.arquivo_nome)}</span>
                        <span className="flex-1 truncate font-medium">{a.arquivo_nome}</span>
                        <a
                          href={a.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={a.arquivo_nome}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="size-3.5" />
                        </a>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive transition-colors px-1.5 py-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                          disabled={deletingFile === a.id}
                          onClick={() => handleDeleteFile(viewing.id, a)}
                        >
                          {deletingFile === a.id
                            ? <span className="text-[10px]">…</span>
                            : <Trash2 className="size-3.5" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(viewing)}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setViewing(null); openEdit(viewing) }}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
