"use client"

import * as React from "react"
import {
  Package,
  Hammer,
  Wrench,
  Activity,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
  Label as RechartsLabel,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useAppData } from "./data-provider"
import { MensagemDaSemana } from "@/components/mensagem-semana"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthKey(dateStr?: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr.length > 10 ? dateStr : dateStr + "T00:00:00")
  if (isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function buildMonthBuckets(n: number): { key: string; label: string }[] {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "")
      .replace(" de ", "/")
    result.push({ key, label })
  }
  return result
}

function isOverdue(dateStr: string | undefined, status: string, doneStatuses: string[]): boolean {
  if (!dateStr || doneStatuses.includes(status)) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dateStr + "T00:00:00") < today
}

// ─── DonutCard ────────────────────────────────────────────────────────────────

const donutStatusConfig = {
  pendente:    { label: "Pendente",      color: "var(--chart-2)" },
  fabricacao:  { label: "Em Fabricação", color: "var(--chart-1)" },
  producao:    { label: "Em Produção",   color: "var(--chart-4)" },
  em_andamento:{ label: "Em Andamento",  color: "var(--chart-4)" },
  concluido:   { label: "Concluído",     color: "var(--chart-3)" },
  cancelado:   { label: "Cancelado",     color: "var(--chart-5)" },
  atrasado:    { label: "Atrasados",     color: "hsl(var(--destructive))" },
} as const

const donutChartConfig = Object.fromEntries(
  Object.entries(donutStatusConfig).map(([k, v]) => [k, { label: v.label, color: v.color }])
) satisfies ChartConfig

function DonutCard({
  title,
  description,
  total,
  label,
  slices,
}: {
  title: string
  description: string
  total: number
  label: string
  slices: { key: string; value: number }[]
}) {
  const data = slices.filter(s => s.value > 0)
  return (
    <Card>
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center gap-4 px-5 pb-5 pt-2">
        <ChartContainer config={donutChartConfig} className="aspect-square h-[140px] shrink-0">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={44} outerRadius={64} strokeWidth={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={donutStatusConfig[entry.key as keyof typeof donutStatusConfig]?.color ?? "var(--chart-1)"} />
              ))}
              <RechartsLabel
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{total}</tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-[11px]">{label}</tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 w-full sm:w-auto">
          {slices.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: donutStatusConfig[s.key as keyof typeof donutStatusConfig]?.color ?? "var(--chart-1)" }} />
              <span className="text-xs text-muted-foreground flex-1">{donutStatusConfig[s.key as keyof typeof donutStatusConfig]?.label ?? s.key}</span>
              <span className="text-xs font-semibold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { orders, ops, serviceOrders, dataLoading } = useAppData()

  if (dataLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <svg className="animate-spin size-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm">Carregando indicadores…</p>
        </div>
      </div>
    )
  }

  // ── KPIs — Pedidos ──────────────────────────────────────────────────────
  const pedidosTotal      = orders.length
  const pedidosPendentes  = orders.filter(o => o.status === "pendente").length
  const pedidosProducao   = orders.filter(o => o.status === "fabricacao" || o.status === "producao").length
  const pedidosAtrasados  = orders.filter(o => isOverdue(o.dataPrazo, o.status, ["concluido", "cancelado"])).length
  const pedidosConcluidos = orders.filter(o => o.status === "concluido").length

  // ── KPIs — OPs ──────────────────────────────────────────────────────────
  const opsTotal          = ops.length
  const opsPendentes      = ops.filter(o => o.status === "pendente").length
  const opsEmAndamento    = ops.filter(o => o.status === "fabricacao" || o.status === "producao").length
  const opsAtrasadas      = ops.filter(o => isOverdue(o.deliveryAt, o.status, ["concluido", "cancelado"])).length
  const opsConcluidas     = ops.filter(o => o.status === "concluido").length

  // ── KPIs — OS ───────────────────────────────────────────────────────────
  const osTotal           = serviceOrders.length
  const osPendentes       = serviceOrders.filter(o => o.status === "pendente").length
  const osEmAndamento     = serviceOrders.filter(o => o.status === "em_andamento").length
  const osAtrasadas       = serviceOrders.filter(o => isOverdue(o.dataPrevista, o.status, ["concluido", "cancelado"])).length

  // ── Chart data (últimos 6 meses) ─────────────────────────────────────────
  const buckets   = buildMonthBuckets(6)
  const chartData = buckets.map(({ key, label }) => ({
    mes:     label,
    Pedidos: orders.filter(o => getMonthKey(o.dataEntrada || o.criadoEm) === key).length,
    OPs:     ops.filter(o => getMonthKey(o.openedAt) === key).length,
    OS:      serviceOrders.filter(o => getMonthKey(o.dataAbertura || o.criadoEm) === key).length,
  }))

  const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" } as const
  const gridStyle = { stroke: "hsl(var(--border))", strokeOpacity: 0.6 }

  return (
    <div className="space-y-7">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Indicadores em tempo real de toda a operação
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Activity className="size-3.5" />
          Ao vivo
        </div>
      </div>

      {/* ── Mensagem da Semana ───────────────────────────────────────── */}
      <MensagemDaSemana />

      {/* ── Donuts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DonutCard
          title="Pedidos"
          description="Distribuição por status"
          total={pedidosTotal}
          label="pedidos"
          slices={[
            { key: "pendente",   value: pedidosPendentes  },
            { key: "producao",   value: pedidosProducao   },
            { key: "concluido",  value: pedidosConcluidos },
            { key: "atrasado",   value: pedidosAtrasados  },
          ]}
        />
        <DonutCard
          title="Ordens de Produção"
          description="Distribuição por status"
          total={opsTotal}
          label="OPs"
          slices={[
            { key: "pendente",   value: opsPendentes   },
            { key: "fabricacao", value: opsEmAndamento },
            { key: "concluido",  value: opsConcluidas  },
            { key: "atrasado",   value: opsAtrasadas   },
          ]}
        />
        <DonutCard
          title="Ordens de Serviço"
          description="Distribuição por status"
          total={osTotal}
          label="OS"
          slices={[
            { key: "pendente",      value: osPendentes   },
            { key: "em_andamento",  value: osEmAndamento },
            { key: "atrasado",      value: osAtrasadas   },
          ]}
        />
      </div>

      {/* ── Gráficos individuais ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Pedidos por mês */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-[#16a34a]" />
              <CardTitle className="text-sm font-semibold">Pedidos por Mês</CardTitle>
            </div>
            <CardDescription className="text-xs">Pedidos criados nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridStyle} />
                <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                <Bar dataKey="Pedidos" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* OPs por mês */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-[#2563eb]" />
              <CardTitle className="text-sm font-semibold">OPs por Mês</CardTitle>
            </div>
            <CardDescription className="text-xs">Ordens de Produção criadas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} {...gridStyle} />
                <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                <Bar dataKey="OPs" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ── Gráfico comparativo ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Produção por Período</CardTitle>
          <CardDescription className="text-xs">
            Comparativo de Pedidos, OPs e OS criados por mês — últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gOPs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gOS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d97706" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} {...gridStyle} />
              <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Area type="monotone" dataKey="Pedidos" stroke="#16a34a" fill="url(#gPedidos)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="OPs"     stroke="#2563eb" fill="url(#gOPs)"     strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="OS"      stroke="#d97706" fill="url(#gOS)"      strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  )
}
