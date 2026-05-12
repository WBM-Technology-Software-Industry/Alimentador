import { useState } from 'react'
import { RotateCcw, Plus, SlidersHorizontal, Database, CheckCircle2 } from 'lucide-react'
import { publishCmd } from '../mqtt/client'
import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'

type Feedback = { ok: boolean; msg: string } | null

function ActionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-brand-600" />
        <div>
          <p className="font-semibold text-gray-800 text-sm">{title}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function GramsInput({ placeholder, onConfirm, confirmLabel = 'Confirmar' }: {
  placeholder: string; onConfirm: (v: number) => void; confirmLabel?: string
}) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-2">
      <input
        type="number" min={1} placeholder={placeholder} value={val}
        onChange={(e) => setVal(e.target.value)}
        className="min-w-0 flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
      <button
        onClick={() => { const n = parseInt(val); if (!isNaN(n) && n > 0) { onConfirm(n); setVal('') } }}
        className="shrink-0 bg-brand-600 hover:bg-brand-700 text-[#1A1A1A] font-medium text-sm px-4 rounded-xl"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

export default function Estoque() {
  const { connected, deviceId } = useDeviceStore()
  const ctx = useDeviceContext()
  const [feedback, setFeedback] = useState<Feedback>(null)

  function send(payload: object, msg: string) {
    if (!connected) { setFeedback({ ok: false, msg: 'Dispositivo offline.' }); return }
    const ok = publishCmd(deviceId, payload)
    setFeedback({ ok, msg: ok ? msg : 'Falha ao enviar.' })
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="p-4 flex flex-col gap-4">

      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
          feedback.ok ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {feedback.ok && <CheckCircle2 size={16} />}{feedback.msg}
        </div>
      )}

      <ActionCard icon={RotateCcw} title="Enchi o reservatório" description={`Define ${ctx.foodLabel} como 100% cheio`}>
        <button
          onClick={() => send({ rs: 1 }, 'Reservatório marcado como cheio!')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-[#1A1A1A] font-medium py-2 rounded-xl text-sm"
        >
          Reservatório cheio (100%)
        </button>
      </ActionCard>

      <ActionCard icon={Plus} title={`Adicionar ${ctx.foodLabel}`} description="Soma ao estoque atual">
        <GramsInput placeholder="Quantidade em gramas" onConfirm={(v) => send({ ad: v }, `+${v}g adicionado!`)} confirmLabel="Adicionar" />
      </ActionCard>

      <ActionCard icon={SlidersHorizontal} title="Ajustar estoque" description="Sobrescreve com valor exato medido">
        <GramsInput placeholder="Valor exato em gramas" onConfirm={(v) => send({ eg: v }, `Estoque ajustado para ${v}g!`)} confirmLabel="Ajustar" />
      </ActionCard>

      <ActionCard icon={Database} title="Alterar capacidade total" description="Mudei o reservatório para outro tamanho">
        <GramsInput placeholder="Nova capacidade em gramas" onConfirm={(v) => send({ cp: v }, `Capacidade definida para ${v}g!`)} confirmLabel="Salvar" />
      </ActionCard>
    </div>
  )
}
