import { useState } from 'react'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useDeviceStore, type DeviceSchedule, type FishSchedule } from '../store/deviceStore'
import { publishCmd } from '../mqtt/client'

function pad(n: number) { return String(n).padStart(2, '0') }

// ─── Perfil Cão (c_pt) ───────────────────────────────────────────────────────

function ScheduleCard({ sc, onRemove }: { sc: DeviceSchedule; onRemove: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xl font-bold text-gray-800">{pad(sc.h)}:{pad(sc.m)}</p>
        <p className="text-sm text-gray-500">{sc.q}g</p>
      </div>
      <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-2">
        <Trash2 size={18} />
      </button>
    </div>
  )
}

function AddModal({ onClose }: { onClose: (sc?: DeviceSchedule) => void }) {
  const [time, setTime]   = useState('08:00')
  const [grams, setGrams] = useState(100)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => onClose()}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-gray-800 text-lg">Novo horário</h2>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Horário</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Quantidade (g)</label>
            <input type="number" min={1} value={grams} onChange={(e) => setGrams(parseInt(e.target.value) || 0)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onClose()} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm">Cancelar</button>
          <button
            onClick={() => { const [h, m] = time.split(':').map(Number); onClose({ h, m, q: grams }) }}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-[#1A1A1A] font-bold text-sm"
          >Adicionar</button>
        </div>
      </div>
    </div>
  )
}

function AgendaCao() {
  const { schedules, setSchedules, deviceId, connected } = useDeviceStore()
  const [showModal, setShowModal] = useState(false)
  const [feedback, setFeedback]   = useState<string | null>(null)

  function syncToDevice(updated: DeviceSchedule[]) {
    setSchedules(updated)
    const ok = publishCmd(deviceId, { c_pt: updated })
    setFeedback(ok ? 'Agendamentos salvos no dispositivo!' : 'Dispositivo offline — salvo localmente.')
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-800 text-base">Horários de Alimentação</h1>
          <p className="text-xs text-gray-400">Até 4 horários fixos por dia</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!connected || schedules.length >= 4}
          className="flex items-center gap-1 bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] text-sm font-medium px-3 py-2 rounded-xl"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
          <CheckCircle2 size={16} />{feedback}
        </div>
      )}

      {schedules.length === 0
        ? <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <span className="text-5xl">🕐</span>
            <p className="text-sm">Nenhum horário no dispositivo</p>
          </div>
        : <div className="flex flex-col gap-3">
            {schedules.map((sc, i) => (
              <ScheduleCard key={`${sc.h}-${sc.m}`} sc={sc}
                onRemove={() => syncToDevice(schedules.filter((_, idx) => idx !== i))} />
            ))}
          </div>
      }

      {showModal && <AddModal onClose={(sc) => { setShowModal(false); if (sc) syncToDevice([...schedules, sc].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))) }} />}
    </div>
  )
}

// ─── Perfil Peixe (c_ps) ─────────────────────────────────────────────────────

function AgendaPeixe() {
  const { fishSchedule, setFishSchedule, deviceId, connected } = useDeviceStore()
  const [feedback, setFeedback] = useState<string | null>(null)

  const [qpc, setQpc] = useState(fishSchedule?.qpc ?? 500)
  const [tc,  setTc]  = useState(fishSchedule?.tc  ?? 120)
  const [hl,  setHl]  = useState(fishSchedule?.hl  ?? 7)
  const [hd,  setHd]  = useState(fishSchedule?.hd  ?? 19)

  const tratosPorDia = tc > 0 ? Math.floor(((hd - hl) * 60) / tc) : 0

  function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    setFishSchedule(updated)
    const ok = publishCmd(deviceId, { c_ps: updated })
    setFeedback(ok ? 'Configuração salva no dispositivo!' : 'Dispositivo offline — salvo localmente.')
    setTimeout(() => setFeedback(null), 3000)
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
        <p className="text-xs text-gray-400">O dispositivo calcula o próximo trato pelo intervalo</p>
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
