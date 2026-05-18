"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Clock,
  AlertCircle,
  Factory,
  PackageSearch,
  Hash,
  Package,
  Link2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, Label as RechartsLabel } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useAppData,
  type Prioridade,
  type OrderStatus,
  type Order,
  type OrderItem,
} from "../data-provider";

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso + "T00:00:00"));
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getDeliveryState(order: Order): "overdue" | "urgent" | "normal" {
  if (order.status === "cancelado" || order.status === "concluido")
    return "normal";
  if (!order.dataPrazo) return "normal";
  const d = daysUntil(order.dataPrazo);
  if (d < 0) return "overdue";
  if (d <= 2) return "urgent";
  return "normal";
}

function totalQty(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pendente: { label: "Pendente", variant: "secondary" },
  fabricacao: {
    label: "Em Fabricação",
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700",
  },
  producao: { label: "Em Produção", variant: "default" },
  concluido: {
    label: "Concluído",
    variant: "outline",
    className:
      "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700",
  },
  cancelado: { label: "Cancelado", variant: "destructive" },
  entregue: {
    label: "Entregue",
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700",
  },
};

const prioridadeConfig: Record<
  Prioridade,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  urgente: { label: "Urgente", variant: "destructive" },
  alta: {
    label: "Alta",
    variant: "outline",
    className:
      "border-orange-500 text-orange-600 dark:text-orange-400 dark:border-orange-600",
  },
  media: {
    label: "Média",
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
  },
  baixa: { label: "Baixa", variant: "outline" },
};

const opStatusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pendente: { label: "Pendente", variant: "secondary" },
  fabricacao: {
    label: "Em Fabricação",
    variant: "outline",
    className:
      "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700",
  },
  producao: { label: "Em Produção", variant: "default" },
  concluido: {
    label: "Concluído",
    variant: "outline",
    className:
      "border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700",
  },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

// ─── PedidoRow (memoized — prevents table re-render when modal state changes) ─

const PedidoRow = React.memo(function PedidoRow({
  order,
  onSelect,
}: {
  order: Order;
  onSelect: (order: Order) => void;
}) {
  const delivState = getDeliveryState(order);
  const days = order.dataPrazo ? daysUntil(order.dataPrazo) : null;
  const items = order.items ?? [];
  const firstItem = items[0];
  const extraCount = items.length - 1;

  return (
    <TableRow
      className={cn(
        "cursor-pointer",
        delivState === "overdue" && "bg-destructive/5 hover:bg-destructive/10",
        delivState === "urgent" &&
          "bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
      )}
      onClick={() => onSelect(order)}
    >
      <TableCell className="pl-4 font-mono text-xs font-medium">
        {order.numero ?? "—"}
      </TableCell>
      <TableCell className="font-medium text-sm max-w-[200px]">
        <span className="truncate block">{order.cliente}</span>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[240px]">
        {firstItem ? (
          <span className="flex items-center gap-1.5">
            <span className="truncate">{firstItem.name}</span>
            <span className="text-muted-foreground/50 shrink-0">
              ×{firstItem.quantity}
            </span>
            {extraCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1 shrink-0"
              >
                +{extraCount}
              </Badge>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </TableCell>
      {/* Entrada */}
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground">
          {order.dataEntrada ? formatDate(order.dataEntrada) : "—"}
        </span>
      </TableCell>
      {/* Prazo */}
      <TableCell>
        {!order.dataPrazo ? (
          <span className="text-xs text-muted-foreground/50">—</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatDate(order.dataPrazo)}
          </span>
        )}
      </TableCell>
      {/* Dias Corridos */}
      <TableCell className="hidden sm:table-cell">
        {!order.dataPrazo ||
        order.status === "concluido" ||
        order.status === "cancelado" ? (
          <span className="text-xs text-muted-foreground/50">—</span>
        ) : days! < 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            Atrasado {Math.abs(days!)}d
          </span>
        ) : days === 0 ? (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Vence hoje
          </span>
        ) : (
          <span
            className={cn(
              "text-xs font-medium",
              days! <= 2
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
            )}
          >
            {days}d restantes
          </span>
        )}
      </TableCell>
    </TableRow>
  );
});

// ─── PedidosMainContent (memoized — skips re-render when modals open) ──────────

type PedidosStats = {
  total: number;
  pendentes: number;
  fabricacao: number;
  producao: number;
  concluidos: number;
  cancelados: number;
  atrasados: number;
};

const PedidosMainContent = React.memo(function PedidosMainContent({
  stats,
  filtered,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  setSelected,
}: {
  stats: PedidosStats;
  filtered: Order[];
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setSelected: (order: Order) => void;
}) {
  const chartConfig = {
    pendente: { label: "Pendentes", color: "var(--color-amber-500)" },
    fabricacao: { label: "Em Fabricação", color: "var(--color-blue-500)" },
    producao: { label: "Em Produção", color: "var(--color-primary)" },
    concluido: { label: "Concluídos", color: "var(--color-emerald-500)" },
    cancelado: { label: "Cancelados", color: "var(--color-destructive)" },
  } satisfies ChartConfig;

  const chartData = [
    { status: "pendente", value: stats.pendentes, fill: "var(--chart-2)" },
    { status: "fabricacao", value: stats.fabricacao, fill: "var(--chart-1)" },
    { status: "producao", value: stats.producao, fill: "var(--chart-4)" },
    { status: "concluido", value: stats.concluidos, fill: "var(--chart-3)" },
    { status: "cancelado", value: stats.cancelados, fill: "var(--chart-5)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-7xl mx-auto w-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestão de Pedidos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Acompanhe e gerencie todos os pedidos em produção
          </p>
        </div>
      </div>

      {/* Stats — Donut Chart */}
      <Card className="shrink-0">
        <CardHeader className="pb-0 pt-5 px-5">
          <CardTitle className="text-base font-semibold">Visão Geral</CardTitle>
          <CardDescription>Distribuição dos pedidos por status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 px-5 pb-5 pt-2">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[160px] shrink-0"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="status"
                innerRadius={50}
                outerRadius={72}
                strokeWidth={2}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <RechartsLabel
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null;
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {stats.total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          pedidos
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-8 gap-y-2.5 w-full sm:w-auto">
            {[
              {
                label: "Pendentes",
                value: stats.pendentes,
                color: "bg-[var(--chart-2)]",
              },
              {
                label: "Em Fabricação",
                value: stats.fabricacao,
                color: "bg-[var(--chart-1)]",
              },
              {
                label: "Em Produção",
                value: stats.producao,
                color: "bg-[var(--chart-4)]",
              },
              {
                label: "Concluídos",
                value: stats.concluidos,
                color: "bg-[var(--chart-3)]",
              },
              {
                label: "Cancelados",
                value: stats.cancelados,
                color: "bg-[var(--chart-5)]",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    item.color,
                  )}
                />
                <span className="text-sm text-muted-foreground flex-1">
                  {item.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
            {stats.atrasados > 0 && (
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1 mt-1 pt-2 border-t">
                <AlertCircle className="size-3.5 text-destructive shrink-0" />
                <span className="text-xs text-destructive font-medium">
                  {stats.atrasados} atrasado{stats.atrasados !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nº, cliente ou item…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs + Table */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 min-h-0"
      >
        <div className="overflow-x-auto -mx-0.5 px-0.5 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="all" className="gap-1.5">
              Todos
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 min-w-4"
              >
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pendente" className="gap-1.5">
              Pendentes
              {stats.pendentes > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1.5 min-w-4"
                >
                  {stats.pendentes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fabricacao" className="gap-1.5">
              Fabricação
              {stats.fabricacao > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 min-w-4 border-blue-500 text-blue-600 dark:text-blue-400"
                >
                  {stats.fabricacao}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="producao">Produção</TabsTrigger>
            <TabsTrigger value="concluido">Concluídos</TabsTrigger>
            <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
          </TabsList>
        </div>

        {[
          "all",
          "pendente",
          "fabricacao",
          "producao",
          "concluido",
          "cancelado",
        ].map((tab) => (
          <TabsContent key={tab} value={tab} className="flex-1 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Pedidos
                </CardTitle>
                <CardDescription>
                  {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{" "}
                  encontrado{filtered.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <div className="overflow-auto h-full">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="w-[120px] pl-4">
                          Nº Pedido
                        </TableHead>
                        <TableHead className="min-w-[140px]">Cliente</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[180px]">
                          Itens
                        </TableHead>
                        <TableHead className="hidden md:table-cell w-[115px]">
                          Entrada
                        </TableHead>
                        <TableHead className="w-[100px]">Prazo</TableHead>
                        <TableHead className="hidden sm:table-cell w-[110px]">
                          Dias Corridos
                        </TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="py-16 text-center">
                              <PackageSearch className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum pedido encontrado
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Tente ajustar o filtro ou a busca
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((order) => (
                          <PedidoRow
                            key={order.id}
                            order={order}
                            onSelect={setSelected}
                          />
                        ))
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
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const {
    orders,
    concluidos,
    ops,
    vincular,
    desvincular,
  } = useAppData();
  const [linkPopoverOpen, setLinkPopoverOpen] = React.useState(false);
  const [linkSearch, setLinkSearch] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [selected, setSelected] = React.useState<Order | null>(null);
  const deferredSelected = React.useDeferredValue(selected);

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelectOrder = React.useCallback((order: Order) => {
    setSelected(order);
  }, []);

  // Stats
  const stats = React.useMemo(() => {
    const total = orders.length;
    const pendentes = orders.filter((o) => o.status === "pendente").length;
    const fabricacao = orders.filter((o) => o.status === "fabricacao").length;
    const producao = orders.filter((o) => o.status === "producao").length;
    const cancelados = orders.filter((o) => o.status === "cancelado").length;
    const atrasados = orders.filter(
      (o) => getDeliveryState(o) === "overdue",
    ).length;
    return {
      total,
      pendentes,
      fabricacao,
      producao,
      concluidos: concluidos.length,
      cancelados,
      atrasados,
    };
  }, [orders, concluidos]);

  // Fonte correta por aba — evita mistura entre etapa 20 e etapa 50
  const tabSource = activeTab === "concluido" ? concluidos : orders;

  // Filtered + sorted
  const filtered = React.useMemo(() => {
    return tabSource
      .filter((o) => (activeTab === "all" ? true : o.status === activeTab))
      .filter((o) => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          (o.numero ?? "").toLowerCase().includes(q) ||
          (o.cliente ?? "").toLowerCase().includes(q) ||
          (o.items ?? []).some((it) => it.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ord = { overdue: 0, urgent: 1, normal: 2 };
        const diff = ord[getDeliveryState(a)] - ord[getDeliveryState(b)];
        if (diff !== 0) return diff;
        return (a.dataPrazo ?? "").localeCompare(b.dataPrazo ?? "");
      });
  }, [tabSource, debouncedSearch, activeTab]);

  return (
    <>
      <PedidosMainContent
        stats={stats}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelected={handleSelectOrder}
      />

      {/* ── Sheet: detalhes do pedido ─────────────────────────────────────── */}
      <Sheet
        modal={false}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent
          showOverlay={false}
          className="w-full sm:max-w-md p-0 gap-0"
        >
          <SheetTitle className="sr-only">Detalhes do pedido</SheetTitle>
          {deferredSelected &&
            (() => {
              const selected = deferredSelected;
              const s = statusConfig[selected.status] ?? {
                label: selected.status,
                variant: "secondary" as const,
              };
              const p = prioridadeConfig[selected.prioridade] ?? {
                label: selected.prioridade,
                variant: "outline" as const,
              };
              const delivState = getDeliveryState(selected);
              const items = selected.items ?? [];
              const total = totalQty(items);

              return (
                <>
                  {/* Header */}
                  <SheetHeader className="px-5 pt-5 pb-4 border-b gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={s.variant} className={cn(s.className)}>
                        {s.label}
                      </Badge>
                      <Badge
                        variant={p.variant}
                        className={cn("text-xs", p.className)}
                      >
                        {p.label}
                      </Badge>
                      {delivState === "overdue" && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="size-3" />
                          Atrasado
                        </Badge>
                      )}
                      {delivState === "urgent" && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs border-amber-500 text-amber-600 dark:text-amber-400"
                        >
                          <Clock className="size-3" />
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold leading-snug">
                        {selected.cliente}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Hash className="size-3 text-muted-foreground" />
                        <p className="text-xs font-mono text-muted-foreground">
                          {selected.numero}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Hash className="size-3 text-muted-foreground/50" />
                        <p className="text-xs font-mono text-muted-foreground/70">
                          {selected.numeroCliente || (
                            <span className="italic text-muted-foreground/40">
                              sem nº cliente
                            </span>
                          )}
                          {selected.numeroCliente && (
                            <span className="ml-1 text-[10px] text-muted-foreground/50">
                              (cliente)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Itens */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Itens
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {total} unidade{total !== 1 ? "s" : ""} no total
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.length > 0 ? (
                          items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="size-3.5 text-muted-foreground shrink-0" />
                                <p className="text-sm">{item.name}</p>
                              </div>
                              <span className="text-xs font-mono font-semibold text-muted-foreground">
                                ×{item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground/50">
                            Nenhum item cadastrado
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Datas */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Datas
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                            Entrada
                          </p>
                          <p className="text-sm font-medium">
                            {formatDate(selected.dataEntrada)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2.5",
                            delivState === "overdue"
                              ? "bg-destructive/10"
                              : delivState === "urgent"
                                ? "bg-amber-50 dark:bg-amber-950/30"
                                : "bg-muted/50",
                          )}
                        >
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                            Prazo
                          </p>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              delivState === "overdue" && "text-destructive",
                              delivState === "urgent" &&
                                "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {formatDate(selected.dataPrazo)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dados Adicionais para Nota Fiscal */}
                    {selected.dadosAdicionais && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Dados Adicionais para Nota Fiscal
                        </p>
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                            {selected.dadosAdicionais}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* OPs Vinculadas */}
                    {(() => {
                      const linkedOPs = ops.filter((op) =>
                        op.linkedOrders?.includes(selected.id),
                      );
                      const available = ops.filter(op =>
                        !op.linkedOrders?.includes(selected.id) &&
                        (linkSearch === "" || op.numero?.includes(linkSearch) || op.items?.[0]?.name?.toLowerCase().includes(linkSearch.toLowerCase()))
                      );
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <Factory className="size-3.5 text-muted-foreground" />
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                OPs Vinculadas
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {linkedOPs.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {linkedOPs.length}
                                </Badge>
                              )}
                              <Popover open={linkPopoverOpen} onOpenChange={open => { setLinkPopoverOpen(open); if (!open) setLinkSearch("") }}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" className="size-6">
                                    <Plus className="size-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2" align="end">
                                  <Input
                                    placeholder="Buscar OP..."
                                    value={linkSearch}
                                    onChange={e => setLinkSearch(e.target.value)}
                                    className="h-8 text-xs mb-2"
                                  />
                                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                                    {available.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-3">Nenhuma OP disponível</p>
                                    ) : available.map(op => (
                                      <button
                                        key={op.id}
                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs flex flex-col"
                                        onClick={() => { vincular(selected.id, op.id); setLinkPopoverOpen(false); setLinkSearch("") }}
                                      >
                                        <span className="font-mono font-medium">{op.numero ?? op.id}</span>
                                        {op.items?.[0]?.name && <span className="text-muted-foreground truncate">{op.items[0].name}</span>}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          {linkedOPs.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-6 flex flex-col items-center gap-2 text-center">
                              <Factory className="size-6 text-muted-foreground/30" />
                              <p className="text-xs text-muted-foreground">
                                Nenhuma OP vinculada
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-lg border overflow-hidden">
                              {linkedOPs.map((op, i) => {
                                const cfg = opStatusConfig[op.status] ?? {
                                  label: op.status,
                                  variant: "secondary" as const,
                                };
                                return (
                                  <div
                                    key={op.id}
                                    className={cn(
                                      "flex items-center justify-between px-3 py-2.5",
                                      i !== linkedOPs.length - 1 && "border-b",
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                                      <span className="font-mono text-xs font-medium">
                                        {op.numero ?? op.id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge
                                        variant={cfg.variant}
                                        className={cn("text-[10px] h-5", cfg.className)}
                                      >
                                        {cfg.label}
                                      </Badge>
                                      <button
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => desvincular(selected.id, op.id)}
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </>
  );
}
