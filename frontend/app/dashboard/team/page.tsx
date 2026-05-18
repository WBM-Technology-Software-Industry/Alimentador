"use client"

import * as React from "react"
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Users,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Briefcase,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  FilePen,
  Lock,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  useAppData,
  type TeamMember,
  type MemberStatus,
  type MemberPermissao,
} from "../data-provider"

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = [
  "Mecânica", "CTO", "CEO", "CCO", "Software",
  "EletroEletrônica", "Vendas", "Gerente de Fábrica", "ADM",
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400",
]

function avatarColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<MemberStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  ativo:   { label: "Ativo",   variant: "outline", className: "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700" },
  inativo: { label: "Inativo", variant: "secondary" },
}

const permissaoConfig: Record<MemberPermissao, { label: string; icon: React.ElementType; className: string }> = {
  admin:  { label: "Administrador", icon: ShieldCheck, className: "text-primary" },
  editor: { label: "Editor",        icon: FilePen,     className: "text-blue-600 dark:text-blue-400" },
  viewer: { label: "Visualizador",  icon: Eye,         className: "text-muted-foreground" },
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = {
  nome:      "",
  cargo:     "",
  setor:     SECTORS[0] as string,
  email:     "",
  telefone:  "",
  password:  "",
  status:    "ativo" as MemberStatus,
  permissao: "viewer" as MemberPermissao,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { members, addMember, updateMember, deleteMember } = useAppData()

  const [search,    setSearch]    = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [selected,  setSelected]  = React.useState<TeamMember | null>(null)

  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(t)
  }, [search])

  // ── Dialog ─────────────────────────────────────────────────────────────────
  const [dialogOpen,   setDialogOpen]   = React.useState(false)
  const [editTarget,   setEditTarget]   = React.useState<TeamMember | null>(null)
  const [form,         setForm]         = React.useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = React.useState<TeamMember | null>(null)
  const [saving,       setSaving]       = React.useState(false)
  const [saveError,    setSaveError]    = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const openNew = React.useCallback(() => {
    setForm(emptyForm)
    setEditTarget(null)
    setDialogOpen(true)
  }, [])

  const openEdit = React.useCallback((m: TeamMember) => {
    setForm({
      nome:      m.nome      ?? "",
      cargo:     m.cargo     ?? "",
      setor:     m.setor     ?? SECTORS[0],
      email:     m.email     ?? "",
      telefone:  m.telefone  ?? "",
      password:  "",
      status:    m.status    ?? "ativo",
      permissao: m.permissao ?? "viewer",
    })
    setEditTarget(m)
    setDialogOpen(true)
  }, [])

  const handleSubmit = React.useCallback(async () => {
    setSaving(true)
    setSaveError("")
    try {
      const payload = {
        nome:      form.nome.trim(),
        cargo:     form.cargo.trim(),
        setor:     form.setor,
        email:     form.email.trim(),
        telefone:  form.telefone.trim() || undefined,
        password:  form.password || undefined,
        status:    form.status,
        permissao: form.permissao,
      }
      if (editTarget) {
        await updateMember(editTarget.id, payload)
        setSelected(prev => prev?.id === editTarget.id ? { ...prev, ...payload } : prev)
      } else {
        await addMember(payload)
      }
      setDialogOpen(false)
      setEditTarget(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }, [form, editTarget, addMember, updateMember])

  const formValid = React.useMemo(() =>
    (form.nome ?? "").trim() !== "" &&
    (form.cargo ?? "").trim() !== "" &&
    (form.email ?? "").trim() !== "" &&
    (!!editTarget || (form.password ?? "").length >= 6),
  [form, editTarget])

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    await deleteMember(deleteTarget.id)
    setSelected(prev => prev?.id === deleteTarget.id ? null : prev)
    setDeleteTarget(null)
  }, [deleteTarget, deleteMember])

  const toggleStatus = React.useCallback(async (m: TeamMember) => {
    const next: MemberStatus = m.status === "ativo" ? "inativo" : "ativo"
    await updateMember(m.id, { status: next })
    setSelected(prev => prev?.id === m.id ? { ...prev, status: next } : prev)
  }, [updateMember])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = React.useMemo(() => ({
    total:   members.length,
    ativos:  members.filter(m => m.status === "ativo").length,
    inativos: members.filter(m => m.status === "inativo").length,
  }), [members])

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    return members
      .filter(m => activeTab === "all" ? true : m.status === activeTab)
      .filter(m => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
          (m.nome  ?? "").toLowerCase().includes(q) ||
          (m.cargo ?? "").toLowerCase().includes(q) ||
          (m.setor ?? "").toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""))
  }, [members, debouncedSearch, activeTab])

  const statsCards = [
    {
      label: "Total de Membros",
      value: stats.total,
      sub: "Equipe completa",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Ativos",
      value: stats.ativos,
      sub: "Colaboradores ativos",
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Inativos",
      value: stats.inativos,
      sub: "Fora da equipe ativa",
      icon: UserX,
      color: "text-muted-foreground",
      bg: "bg-muted/60",
    },
  ]

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie os membros, cargos e permissões da equipe
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="shrink-0" onClick={openNew}>
                <Plus className="size-3.5" />
                Novo Membro
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar membro à equipe</TooltipContent>
          </Tooltip>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          {statsCards.map(s => (
            <Card key={s.label} className="gap-0 py-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.bg)}>
                    <s.icon className={cn("size-4", s.color)} />
                  </div>
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
            placeholder="Buscar por nome, cargo, setor ou e-mail…"
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs + Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Todos
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 min-w-4">{stats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ativo" className="gap-1.5">
              Ativos
              {stats.ativos > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 min-w-4 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                  {stats.ativos}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inativo">Inativos</TabsTrigger>
          </TabsList>

          {["all", "ativo", "inativo"].map(tab => (
            <TabsContent key={tab} value={tab} className="flex-1 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Membros</CardTitle>
                  <CardDescription>
                    {filtered.length} membro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                  <div className="overflow-auto h-full">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                        <TableRow>
                          <TableHead className="w-[220px] pl-4">Membro</TableHead>
                          <TableHead className="min-w-[140px]">Cargo</TableHead>
                          <TableHead className="w-[150px]">Setor</TableHead>
                          <TableHead className="min-w-[180px]">E-mail</TableHead>
                          <TableHead className="w-[140px]">Permissão</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                        </TableRow>
                      </thead>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="py-16 text-center">
                                <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Nenhum membro encontrado</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar o filtro ou a busca</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map(m => {
                            const sc = statusConfig[m.status] ?? statusConfig["inativo"]
                            const pc = permissaoConfig[m.permissao] ?? permissaoConfig["viewer"]
                            const PermIcon = pc.icon
                            return (
                              <TableRow
                                key={m.id}
                                className="cursor-pointer"
                                onClick={() => setSelected(m)}
                              >
                                {/* Membro */}
                                <TableCell className="pl-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                      avatarColor(m.nome)
                                    )}>
                                      {initials(m.nome)}
                                    </div>
                                    <span className="font-medium text-sm truncate max-w-[140px]">{m.nome}</span>
                                  </div>
                                </TableCell>
                                {/* Cargo */}
                                <TableCell className="text-sm text-muted-foreground">{m.cargo}</TableCell>
                                {/* Setor */}
                                <TableCell className="text-xs text-muted-foreground">{m.setor}</TableCell>
                                {/* E-mail */}
                                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                  <span className="truncate block">{m.email}</span>
                                </TableCell>
                                {/* Permissão */}
                                <TableCell>
                                  <span className={cn("flex items-center gap-1.5 text-xs font-medium", pc.className)}>
                                    <PermIcon className="size-3.5 shrink-0" />
                                    {pc.label}
                                  </span>
                                </TableCell>
                                {/* Status */}
                                <TableCell>
                                  <Badge variant={sc.variant} className={cn("text-[10px] h-5", sc.className)}>
                                    {sc.label}
                                  </Badge>
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Dialog: Novo / Editar ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setEditTarget(null); setSaveError("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Editar — ${editTarget.nome}` : "Novo Membro"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Atualize os dados do membro." : "Preencha os dados do novo membro."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 py-1 pr-3">

              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="f-nome">Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  id="f-nome"
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                />
              </div>

              {/* Cargo */}
              <div className="space-y-1.5">
                <Label htmlFor="f-cargo">Cargo <span className="text-destructive">*</span></Label>
                <Input
                  id="f-cargo"
                  placeholder="Ex: Engenheiro Mecânico"
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                />
              </div>

              {/* Setor */}
              <div className="space-y-1.5">
                <Label>Setor <span className="text-destructive">*</span></Label>
                <Select value={form.setor} onValueChange={val => setForm(f => ({ ...f, setor: val }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <Label htmlFor="f-email">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  id="f-email"
                  type="email"
                  placeholder="joao@wbm.com.br"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <Label htmlFor="f-telefone">Telefone</Label>
                <Input
                  id="f-telefone"
                  placeholder="(31) 9 9999-9999"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>

              {/* Senha — só na criação */}
              {!editTarget && (
                <div className="space-y-1.5">
                  <Label htmlFor="f-password">Senha <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="f-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Permissão */}
              <div className="space-y-1.5">
                <Label>Permissão <span className="text-destructive">*</span></Label>
                <Select value={form.permissao} onValueChange={val => setForm(f => ({ ...f, permissao: val as MemberPermissao }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status — só na edição */}
              {editTarget && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={val => setForm(f => ({ ...f, status: val as MemberStatus }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
          </ScrollArea>

          {saveError && (
            <p className="text-sm text-destructive text-center -mb-2">{saveError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditTarget(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formValid || saving}>
              {editTarget ? "Salvar Alterações" : "Adicionar Membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Excluir ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O membro será removido permanentemente da equipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sheet: Detalhes do membro ───────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 gap-0">
          {selected && (() => {
            const sc = statusConfig[selected.status] ?? statusConfig["inativo"]
            const pc = permissaoConfig[selected.permissao] ?? permissaoConfig["viewer"]
            const PermIcon = pc.icon
            return (
              <>
                {/* Header */}
                <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={sc.variant} className={cn(sc.className)}>{sc.label}</Badge>
                    <span className={cn("flex items-center gap-1 text-xs font-medium", pc.className)}>
                      <PermIcon className="size-3.5" />
                      {pc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      avatarColor(selected.nome)
                    )}>
                      {initials(selected.nome)}
                    </div>
                    <div>
                      <SheetTitle className="text-base font-bold leading-snug">{selected.nome}</SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{selected.cargo}</p>
                    </div>
                  </div>
                </SheetHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                  {/* Informações */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Setor</p>
                          <p className="text-sm font-medium">{selected.setor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <Briefcase className="size-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cargo</p>
                          <p className="text-sm font-medium">{selected.cargo}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contato */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contato</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium break-all">{selected.email}</p>
                      </div>
                      {selected.telefone && (
                        <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                          <Phone className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium">{selected.telefone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <SheetFooter className="border-t bg-muted/30 px-5 py-4 gap-2">
                  {selected.status === "ativo" ? (
                    <Button variant="outline" className="w-full text-amber-600 hover:text-amber-600 border-amber-300"
                      onClick={() => toggleStatus(selected)}>
                      <XCircle className="size-4" />
                      Desativar Membro
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => toggleStatus(selected)}>
                      <CheckCircle2 className="size-4" />
                      Reativar Membro
                    </Button>
                  )}
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1"
                      onClick={() => { setSelected(null); openEdit(selected) }}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                    <Button variant="outline" className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(selected)}>
                      <Trash2 className="size-4" />
                      Remover
                    </Button>
                  </div>
                </SheetFooter>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </>
  )
}
