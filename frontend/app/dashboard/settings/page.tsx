"use client"

import * as React from "react"
import { Monitor, Sun, Moon, Plus, X, Settings2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
// ─── Theme hook ───────────────────────────────────────────────────────────────

type Theme = "system" | "light" | "dark"

function useThemeSetting() {
  const [theme, setTheme] = React.useState<Theme>("system")

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    setTheme(stored ?? "system")
  }, [])

  const applyTheme = React.useCallback((t: Theme) => {
    if (t === "dark") {
      document.documentElement.classList.add("dark")
    } else if (t === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [])

  const changeTheme = React.useCallback((t: Theme) => {
    if (t === "system") {
      localStorage.removeItem("theme")
    } else {
      localStorage.setItem("theme", t)
    }
    setTheme(t)
    applyTheme(t)
  }, [applyTheme])

  return { theme, changeTheme }
}

// ─── Setores (localStorage) ───────────────────────────────────────────────────

const SETORES_KEY = "wbm:setores"
const DEFAULT_SETORES = ["Mecânica", "CTO", "CEO", "CCO", "Software", "EletroEletrônica", "Vendas", "Gerente de Fábrica", "ADM"]

function loadSetores(): string[] {
  try {
    const stored = localStorage.getItem(SETORES_KEY)
    return stored ? (JSON.parse(stored) as string[]) : DEFAULT_SETORES
  } catch {
    return DEFAULT_SETORES
  }
}

function saveSetores(setores: string[]): void {
  localStorage.setItem(SETORES_KEY, JSON.stringify(setores))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, changeTheme } = useThemeSetting()

  // ── Setores ────────────────────────────────────────────────────────────────
  const [setores,    setSetores]    = React.useState<string[]>([])
  const [novoSetor,  setNovoSetor]  = React.useState("")
  const [loadingSet, setLoadingSet] = React.useState(true)

  React.useEffect(() => {
    setSetores(loadSetores())
    setLoadingSet(false)
  }, [])

  const handleAddSetor = React.useCallback(() => {
    const trimmed = novoSetor.trim()
    if (!trimmed || setores.includes(trimmed)) return
    const updated = [...setores, trimmed]
    saveSetores(updated)
    setSetores(updated)
    setNovoSetor("")
  }, [novoSetor, setores])

  const handleRemoveSetor = React.useCallback((setor: string) => {
    const updated = setores.filter(s => s !== setor)
    saveSetores(updated)
    setSetores(updated)
  }, [setores])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddSetor()
  }, [handleAddSetor])

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Personalize a aparência e os dados do sistema
        </p>
      </div>

      {/* Aparência */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Aparência</CardTitle>
          </div>
          <CardDescription>
            Escolha o tema de exibição do painel.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: "system", label: "Sistema",  icon: Monitor },
                { value: "light",  label: "Claro",    icon: Sun },
                { value: "dark",   label: "Escuro",   icon: Moon },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => changeTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent",
                  theme === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setores */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Setores</CardTitle>
          </div>
          <CardDescription>
            Setores disponíveis nos relatórios e na equipe.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="px-6 py-5 space-y-4">

          {/* Add */}
          <div className="flex gap-2">
            <Input
              placeholder="Novo setor…"
              value={novoSetor}
              onChange={e => setNovoSetor(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="sm"
              onClick={handleAddSetor}
              disabled={!novoSetor.trim() || setores.includes(novoSetor.trim())}
            >
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>

          {/* List */}
          {loadingSet ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {setores.map(setor => (
                <Badge
                  key={setor}
                  variant="secondary"
                  className="gap-1.5 pr-1 text-sm"
                >
                  {setor}
                  <button
                    type="button"
                    onClick={() => handleRemoveSetor(setor)}

                    className="rounded-sm opacity-60 hover:opacity-100 transition-opacity disabled:pointer-events-none"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {setores.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>
              )}
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  )
}
