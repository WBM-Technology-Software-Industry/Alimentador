"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Monitor,
  X,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useAppData,
  type Order,
  type ProductionOrder,
  type ServiceOrder,
} from "@/app/dashboard/data-provider"

// ─── Constants ────────────────────────────────────────────────────────────────

const SLIDE_MS     = 10_000
const TOTAL_SLIDES = 3
const SLIDE_LABELS = ["Pedidos — Resumo", "Ordens de Produção", "Ordens de Serviço"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function isOverdue(dateStr: string, status: string): boolean {
  if (!dateStr || status === "concluido" || status === "cancelado") return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dateStr + "T00:00:00") < today
}

// ─── BigStatCard ─────────────────────────────────────────────────────────────

type StatColor = "neutral" | "amber" | "red" | "green"

const COLOR_PALETTE: Record<StatColor, { val: string; sub: string; dot: string }> = {
  neutral: { val: "text-foreground",  sub: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  amber:   { val: "text-amber-400",   sub: "text-amber-500/70",     dot: "bg-amber-400" },
  red:     { val: "text-red-400",     sub: "text-red-500/70",       dot: "bg-red-500" },
  green:   { val: "text-emerald-400", sub: "text-emerald-500/70",   dot: "bg-emerald-400" },
}

function BigStatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: StatColor
}) {
  const p = COLOR_PALETTE[color]
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 h-full flex flex-col overflow-hidden">
      {/* Label strip */}
      <div className={cn("flex items-center gap-2.5 px-8 pt-6 pb-2")}>
        <span className={cn("size-3 rounded-full shrink-0", p.dot)} />
        <p className="text-4xl font-semibold text-foreground uppercase tracking-widest">{label}</p>
      </div>
      {/* Number */}
      <div className="flex-1 flex items-center justify-center pb-4">
        <p className={cn("text-[10rem] font-bold tabular-nums leading-none", p.val)}>{value}</p>
      </div>
    </div>
  )
}

// ─── Slide 1: Pedidos — matriz 2×2 ───────────────────────────────────────────

function Slide1({ orders }: { orders: Order[] }) {
  const total     = orders.length
  const pendentes = orders.filter(o => o.status === "pendente").length
  const producao  = orders.filter(o => o.status === "producao" || o.status === "fabricacao").length
  const atrasados = orders.filter(o => isOverdue(o.dataPrazo, o.status)).length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 grid-rows-2 gap-5 flex-1 min-h-0">
        <BigStatCard label="Total"       value={total}     color="neutral"/>
        <BigStatCard label="Pendentes"   value={pendentes} color="amber"   />
        <BigStatCard label="Produção" value={producao}  color="neutral" />
        <BigStatCard
          label="Atrasados"
          value={atrasados}
          color={atrasados > 0 ? "red" : "green"}
         
        />
      </div>
    </div>
  )
}

// ─── Slide 2: OPs — linha horizontal ──────────────────────────────────────────

function Slide2({ ops }: { ops: ProductionOrder[] }) {
  const atrasadas = ops.filter(op => isOverdue(op.deliveryAt, op.status)).length
  const pendentes = ops.filter(op => op.status === "pendente").length
  const producao  = ops.filter(op => op.status === "producao" || op.status === "fabricacao").length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 grid-rows-2 gap-5 flex-1 min-h-0">
        <BigStatCard label="Total"       value={ops.length} color="neutral" />
        <BigStatCard label="Pendentes"   value={pendentes}  color="amber"   />
        <BigStatCard label="Produção" value={producao}   color="neutral" />
        <BigStatCard
          label="Atrasadas"
          value={atrasadas}
          color={atrasadas > 0 ? "red" : "green"}
         
        />
      </div>
    </div>
  )
}

// ─── Slide 3: OSs — linha horizontal ──────────────────────────────────────────

function Slide3({ serviceOrders }: { serviceOrders: ServiceOrder[] }) {
  const atrasadas = serviceOrders.filter(os => isOverdue(os.dataPrevista, os.status)).length
  const pendentes = serviceOrders.filter(os => os.status === "pendente").length
  const andamento = serviceOrders.filter(os => os.status === "em_andamento").length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 grid-rows-2 gap-5 flex-1 min-h-0">
        <BigStatCard label="Total"        value={serviceOrders.length} color="neutral" />
        <BigStatCard label="Pendentes"    value={pendentes}            color="amber"   />
        <BigStatCard label="Produção" value={andamento}            color="neutral" />
        <BigStatCard
          label="Atrasadas"
          value={atrasadas}
          color={atrasadas > 0 ? "red" : "green"}
         
        />
      </div>
    </div>
  )
}

// ─── Monitor Panel Content ────────────────────────────────────────────────────

function MonitorPanelContent({ onClose }: { onClose: () => void }) {
  const { orders, ops, serviceOrders } = useAppData()
  const [slide, setSlide]       = React.useState(0)
  const [locked, setLocked]     = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const now = useNow()

  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  React.useEffect(() => {
    if (locked) return
    const start = Date.now()
    const progressId = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / SLIDE_MS) * 100))
    }, 80)
    const slideId = setTimeout(() => {
      setSlide(s => (s + 1) % TOTAL_SLIDES)
    }, SLIDE_MS)
    return () => { clearInterval(progressId); clearTimeout(slideId) }
  }, [locked, slide])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const goTo = (i: number) => { setProgress(0); setSlide(i) }
  const prev  = () => goTo((slide - 1 + TOTAL_SLIDES) % TOTAL_SLIDES)
  const next  = () => goTo((slide + 1) % TOTAL_SLIDES)

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden">

      {/* Progress bar */}
      <div className="h-[3px] bg-border shrink-0">
        {!locked && (
          <div className="h-full bg-primary transition-none" style={{ width: `${progress}%` }} />
        )}
      </div>

      {/* Header */}
      <div className="border-b shrink-0 bg-card/50">
        <div className="flex items-center justify-between px-8 py-3 gap-4 max-w-[1100px] mx-auto">
          <div className="flex items-center min-w-0">
            <span className="text-5xl font-mono font-bold tabular-nums shrink-0 text-foreground">
              {now.toLocaleTimeString("pt-BR")}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-4xl font-bold text-foreground">{SLIDE_LABELS[slide]}</span>
            <Button
              variant={locked ? "default" : "outline"}
              size="lg"
              className="gap-2 text-xl h-12 px-5"
              onClick={() => { setLocked(l => !l); setProgress(0) }}
            >
              {locked ? <Lock className="size-5" /> : <Unlock className="size-5" />}
              {locked ? "Travado" : "Travar"}
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} title="Fechar (Esc)">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Slides */}
      <div className="flex-1 min-h-0 py-6 relative flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden max-w-[900px] mx-auto w-full px-10">
          {slide === 0 && <Slide1 orders={orders} />}
          {slide === 1 && <Slide2 ops={ops} />}
          {slide === 2 && <Slide3 serviceOrders={serviceOrders} />}
        </div>

        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-4 rounded-full bg-background border border-border/60 shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-10 text-muted-foreground" />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-4 rounded-full bg-background border border-border/60 shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight className="size-10 text-muted-foreground" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-3 py-4 shrink-0 border-t border-border/40">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            title={SLIDE_LABELS[i]}
            className={cn(
              "rounded-full transition-all duration-300",
              i === slide
                ? "w-16 h-3 bg-primary"
                : "w-3 h-3 bg-muted-foreground/25 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Exported trigger button ──────────────────────────────────────────────────

export function MonitorPanelButton() {
  const [open, setOpen]       = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const onClose = React.useCallback(() => setOpen(false), [])

  return (
    <>
      <Button variant="outline" size="icon" title="Abrir monitor" onClick={() => setOpen(true)}>
        <Monitor className="size-4" />
      </Button>
      {mounted && open && createPortal(
        <MonitorPanelContent onClose={onClose} />,
        document.body
      )}
    </>
  )
}
