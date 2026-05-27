import { useState } from 'react'
import { useDeviceStore, type FishSchedule, type DeviceSchedule } from '../store/deviceStore'
import { publishCmd, publishCmdSequence } from '../mqtt/client'
import { CheckCircle2 } from 'lucide-react'

function pad(n: number) { return String(n).padStart(2, '0') }

const DEVICES = [
  { label: 'Alimentador 1', id: 'ALIMENTADOR_1' },
  { label: 'Alimentador 2', id: 'ALIMENTADOR_2' },
]

function DeviceIdConfig() {
  const { deviceId, brokerUrl, setBrokerConfig } = useDeviceStore()

  function handleSelect(id: string) {
    if (id === deviceId) return
    setBrokerConfig(brokerUrl, id)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
      <h2 className="text-gray-500 text-sm font-medium">Alimentador</h2>
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelect(d.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              deviceId === d.id
                ? 'bg-brand-600 text-[#1A1A1A]'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModoOperacao() {
  const { am, deviceId, connected, setTelemetry, manualGrams, setManualGrams, bumpLastFeedAt, setOptimisticFeed } = useDeviceStore()
  const [feedback, setFeedback] = useState<string | null>(null)

  function toggleMode(automatic: boolean) {
    const ok = publishCmd(deviceId, { am: automatic })
    if (ok) {
      setTelemetry({ am: automatic })
      setFeedback(automatic ? 'Modo Automático ativado!' : 'Modo Manual ativado!')
    } else {
      setFeedback('Dispositivo offline — tente novamente.')
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleSendQuantity() {
    publishCmd(deviceId, { sim: manualGrams })
    setOptimisticFeed({ id: `opt-${Date.now()}`, deviceId, grams: manualGrams, timestamp: Date.now(), source: 'manual' })
    bumpLastFeedAt()
    setFeedback(`Trato de ${manualGrams}g disparado!`)
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
      <h2 className="text-gray-500 text-sm font-medium">Modo de operação</h2>
      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
          feedback.includes('offline')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <CheckCircle2 size={14} />{feedback}
        </div>
      )}

      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          onClick={() => toggleMode(false)}
          disabled={!connected}
          className={`flex-1 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
            !am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => toggleMode(true)}
          disabled={!connected}
          className={`flex-1 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
            am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Automático
        </button>
      </div>

      {!am && (
        <>
          {false && null /* feedback já está acima */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Quantidade por trato manual (g)</label>
            <input
              type="number" min={1} value={manualGrams || ''}
              onChange={(e) => setManualGrams(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={handleSendQuantity}
            disabled={!connected}
            className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
          >
            Disparar trato manual
          </button>
        </>
      )}
    </div>
  )
}

function FishWindowConfig({ fs }: { fs: FishSchedule }) {
  const { connected, deviceId } = useDeviceStore()
  const [hl,  setHl]  = useState(fs.hl)
  const [hd,  setHd]  = useState(fs.hd)
  const [tc,  setTc]  = useState(fs.tc)
  const [qpc, setQpc] = useState(fs.qpc)
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    const ok = publishCmd(deviceId, { c_ps: updated })
    setFeedback(ok ? 'Enviado! Aguardando confirmação do dispositivo...' : 'Dispositivo offline.')
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <>
      {/* Resumo */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
        <h2 className="text-gray-500 text-sm font-medium">Janela de Alimentação</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Janela de Atividade</span>
          <span className="text-sm font-semibold text-gray-800">Das {pad(fs.hl)}h às {pad(fs.hd)}h</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Frequência de Tratos</span>
          <span className="text-sm font-semibold text-gray-800">A cada {fs.tc} minutos</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Quantidade por trato</span>
          <span className="text-sm font-semibold text-gray-800">{fs.qpc}g</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <h2 className="text-gray-500 text-sm font-medium">Configurar</h2>

        {feedback && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-sm">
            <CheckCircle2 size={14} />{feedback}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Início (hora)</label>
            <input type="number" min={0} max={23} value={hl || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setHl(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Fim (hora)</label>
            <input type="number" min={0} max={23} value={hd || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setHd(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Intervalo (min)</label>
            <input type="number" min={1} value={tc || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTc(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Quantidade (g)</label>
            <input type="number" min={1} value={qpc || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setQpc(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>

        <button onClick={handleSave} disabled={!connected}
          className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm">
          Salvar configuração
        </button>
      </div>
    </>
  )
}

type Slot = { time: string; grams: number }

function initSlots(schedules: DeviceSchedule[]): Slot[] {
  const sorted = [...schedules].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
  return Array.from({ length: 4 }, (_, i) => {
    const sc = sorted[i]
    return sc ? { time: `${pad(sc.h)}:${pad(sc.m)}`, grams: sc.q } : { time: '08:00', grams: 100 }
  })
}

function PetScheduleSection() {
  const { deviceData, deviceId } = useDeviceStore()
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
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
      <h2 className="text-gray-500 text-sm font-medium">Horários de Refeição</h2>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-sm">
          <CheckCircle2 size={14} />{feedback}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-col gap-2 border border-gray-100 rounded-xl p-3">
            <span className="text-sm font-semibold text-gray-700">Refeição {i + 1}</span>
            <div className="flex gap-2 min-w-0">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs text-gray-500">Horário</label>
                <input type="time" value={slot.time}
                  onChange={(e) => updateSlot(i, { time: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs text-gray-500">Gramas</label>
                <input type="number" min={1} value={slot.grams || ''}
                  onChange={(e) => updateSlot(i, { grams: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-brand-600 text-[#1A1A1A] font-medium text-sm">
        Salvar horários
      </button>
    </div>
  )
}

const DEVICE_TYPES = [
  { value: 'cao'   as const, icon: '🐾', label: 'Cão'   },
  { value: 'peixe' as const, icon: '🐟', label: 'Peixe' },
]

export default function Configuracao() {
  const { deviceType, setDeviceType, deviceData, deviceId, connected } = useDeviceStore()
  const fishSchedule = deviceData[deviceId]?.fishSchedule

  function handleSetProfile(value: 'cao' | 'peixe') {
    setDeviceType(value)
    publishCmd(deviceId, { pf: value === 'cao' ? 1 : 0 })
  }

  return (
    <div className="p-4 lg:p-6 lg:max-w-5xl lg:mx-auto flex flex-col gap-4">

      <DeviceIdConfig />

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        {/* Coluna esquerda: perfil + modo */}
        <div className="flex flex-col gap-4">
          {/* Perfil do dispositivo */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-gray-500 text-sm font-medium mb-3">Perfil do dispositivo</h2>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {DEVICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  disabled={!connected}
                  onClick={() => handleSetProfile(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                    deviceType === t.value
                      ? 'bg-brand-600 text-[#1A1A1A]'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <ModoOperacao />
        </div>

        {/* Coluna direita: agenda */}
        <div className="flex flex-col gap-4">
          {deviceType === 'peixe' && fishSchedule
            ? <FishWindowConfig key={deviceId} fs={fishSchedule} />
            : <PetScheduleSection key={deviceId} />
          }
        </div>
      </div>

    </div>
  )
}
