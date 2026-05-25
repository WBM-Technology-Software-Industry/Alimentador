import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { publishCmd, publishCmdSequence } from '../mqtt/client'

function pad(n: number) { return String(n).padStart(2, '0') }

// ─── Perfil Cão (c_pt) ───────────────────────────────────────────────────────

type Slot = { time: string; grams: number }

function initSlots(schedules: DeviceSchedule[]): Slot[] {
  const sorted = [...schedules].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
  return Array.from({ length: 4 }, (_, i) => {
    const sc = sorted[i]
    return sc ? { time: `${pad(sc.h)}:${pad(sc.m)}`, grams: sc.q } : { time: '08:00', grams: 100 }
  })
}

function AgendaCao() {
  const { deviceData, deviceId, connected } = useDeviceStore()
  const received = deviceData[deviceId]
  const [slots, setSlots] = useState<Slot[]>(() => initSlots(received?.schedules ?? []))
  const [feedback, setFeedback] = useState<string | null>(null)

  function updateSlot(i: number, partial: Partial<Slot>) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, ...partial } : s))
  }

  function handleSave() {
    const updated: DeviceSchedule[] = slots
      .map(s => { const [h, m] = s.time.split(':').map(Number); return { h, m, q: s.grams } })
      .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
    const ok = publishCmdSequence(deviceId, [{ pf: 1 }, { am: true }, { c_pt: updated }])
    setFeedback(ok ? 'Enviado! Aguardando confirmação do dispositivo...' : 'Dispositivo offline.')
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-bold text-gray-800 text-base">Horários de Refeição</h1>
        <p className="text-xs text-gray-400">
          {received?.schedules?.length
            ? `Último dado recebido do dispositivo`
            : 'Aguardando dados do dispositivo...'}
        </p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
          <CheckCircle2 size={16} />{feedback}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {slots.map((slot, i) => (
          <div key={i} className="bg-white rounded-2xl shadow px-4 py-3 flex flex-col gap-3">
            <span className="text-sm font-semibold text-gray-700">Refeição {i + 1}</span>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Horário</label>
                <input type="time" value={slot.time}
                  onChange={(e) => updateSlot(i, { time: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Quantidade (g)</label>
                <input type="number" min={1} value={slot.grams}
                  onChange={(e) => updateSlot(i, { grams: parseInt(e.target.value) || 0 })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!connected}
        className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
      >
        Salvar horários
      </button>
    </div>
  )
}

// ─── Perfil Peixe (c_ps) ─────────────────────────────────────────────────────

function AgendaPeixe() {
  const { deviceData, deviceId, connected } = useDeviceStore()
  const received = deviceData[deviceId]?.fishSchedule
  const [feedback, setFeedback] = useState<string | null>(null)

  const [qpc, setQpc] = useState(received?.qpc ?? 500)
  const [tc,  setTc]  = useState(received?.tc  ?? 120)
  const [hl,  setHl]  = useState(received?.hl  ?? 7)
  const [hd,  setHd]  = useState(received?.hd  ?? 19)

  const tratosPorDia = tc > 0 ? Math.floor(((hd - hl) * 60) / tc) : 0

  function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    const ok = publishCmd(deviceId, { c_ps: updated })
    setFeedback(ok ? 'Enviado! Aguardando confirmação do dispositivo...' : 'Dispositivo offline.')
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo visual */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Janela de Atividade</span>
          <span className="text-sm font-semibold text-gray-800">Das {pad(hl)}h às {pad(hd)}h</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Frequência de Tratos</span>
          <span className="text-sm font-semibold text-gray-800">A cada {tc} minutos</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Quantidade por trato</span>
          <span className="text-sm font-semibold text-gray-800">{qpc}g</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Tratos por dia</span>
          <span className="text-sm font-semibold text-gray-800">~{tratosPorDia}x</span>
        </div>
      </div>

      <div>
        <h1 className="font-bold text-gray-800 text-base">Agenda de Piscicultura</h1>
        <p className="text-xs text-gray-400">
          {received ? 'Último dado recebido do dispositivo' : 'Aguardando dados do dispositivo...'}
        </p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
          <CheckCircle2 size={16} />{feedback}
        </div>
      )}

      {/* Formulário de edição */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <h2 className="text-xs text-gray-500 font-medium uppercase tracking-wide">Editar configuração</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Quantidade por trato (g)</label>
          <input type="number" min={1} value={qpc} onChange={(e) => setQpc(parseInt(e.target.value) || 0)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Frequência — a cada quantos minutos</label>
          <input type="number" min={1} value={tc} onChange={(e) => setTc(parseInt(e.target.value) || 0)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Início (hora)</label>
            <input type="number" min={0} max={23} value={hl} onChange={(e) => setHl(parseInt(e.target.value) || 0)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Fim (hora)</label>
            <input type="number" min={0} max={23} value={hd} onChange={(e) => setHd(parseInt(e.target.value) || 0)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!connected}
        className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
      >
        Salvar configuração
      </button>
    </div>
  )
}

// ─── Exportação ───────────────────────────────────────────────────────────────

export default function Agenda() {
  const deviceType = useDeviceStore((s) => s.deviceType)
  return (
    <div className="p-4">
      {deviceType === 'peixe' ? <AgendaPeixe /> : <AgendaCao />}
    </div>
  )
}
