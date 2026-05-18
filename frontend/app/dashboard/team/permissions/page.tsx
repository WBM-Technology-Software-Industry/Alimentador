"use client"

import * as React from "react"
import { ShieldCheck, FilePen, Eye, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useAppData, type MemberPermissao } from "../../data-provider"

// ─── Config ───────────────────────────────────────────────────────────────────

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

const permissaoConfig: Record<MemberPermissao, { label: string; icon: React.ElementType; description: string; badgeClass: string }> = {
  admin: {
    label: "Administrador",
    icon: ShieldCheck,
    description: "Acesso total — gerencia membros, permissões e todas as funcionalidades.",
    badgeClass: "border-primary text-primary",
  },
  editor: {
    label: "Editor",
    icon: FilePen,
    description: "Pode criar e editar pedidos e OPs, mas não gerencia a equipe.",
    badgeClass: "border-blue-500 text-blue-600 dark:text-blue-400",
  },
  viewer: {
    label: "Visualizador",
    icon: Eye,
    description: "Apenas visualização — sem permissão para criar ou editar.",
    badgeClass: "border-muted-foreground text-muted-foreground",
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { members, updateMember } = useAppData()

  const [updating, setUpdating] = React.useState<string | null>(null)

  const handleChange = React.useCallback(async (id: string, permissao: MemberPermissao) => {
    setUpdating(id)
    try {
      await updateMember(id, { permissao })
    } finally {
      setUpdating(null)
    }
  }, [updateMember])

  const countByPermissao = React.useMemo(() => ({
    admin:  members.filter(m => m.permissao === "admin").length,
    editor: members.filter(m => m.permissao === "editor").length,
    viewer: members.filter(m => m.permissao === "viewer").length,
  }), [members])

  const summaryCards = (["admin", "editor", "viewer"] as MemberPermissao[]).map(p => {
    const cfg = permissaoConfig[p]
    const Icon = cfg.icon
    return { ...cfg, key: p, count: countByPermissao[p], Icon }
  })

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Defina o nível de acesso de cada membro da equipe
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        {summaryCards.map(c => (
          <Card key={c.key} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
                  <c.Icon className="size-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className={cn("text-xs", c.badgeClass)}>{c.label}</Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{c.count}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Membros da Equipe</CardTitle>
          <CardDescription>
            {members.length} membro{members.length !== 1 ? "s" : ""} — altere a permissão diretamente na linha
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <div className="overflow-auto h-full">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                <TableRow>
                  <TableHead className="pl-4 w-[220px]">Membro</TableHead>
                  <TableHead className="min-w-[140px]">Cargo</TableHead>
                  <TableHead className="w-[140px]">Setor</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[200px]">Permissão</TableHead>
                </TableRow>
              </thead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="py-16 text-center">
                        <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Nenhum membro cadastrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  [...members].sort((a, b) => a.nome.localeCompare(b.nome)).map(m => (
                    <TableRow key={m.id}>
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
                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={m.status === "ativo" ? "outline" : "secondary"}
                          className={cn(
                            "text-[10px] h-5",
                            m.status === "ativo" && "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700"
                          )}
                        >
                          {m.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {/* Permissão */}
                      <TableCell>
                        <Select
                          value={m.permissao}
                          disabled={updating === m.id}
                          onValueChange={val => handleChange(m.id, val as MemberPermissao)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
