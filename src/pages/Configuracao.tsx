import { useState } from 'react'
import { useDeviceStore, type FishSchedule, type DeviceSchedule } from '../store/deviceStore'
import { publishCmd } from '../mqtt/client'
import { notify } from '../store/notificationStore'
import { CheckCircle2, Trash2, Plus, FlaskConical } from 'lucide-react'
import FeedButton from '../components/FeedButton'

function pad(n: number) { return String(n).padStart(2, '0') }

function ModoOperacao() {
  const {
    am, deviceId, connected, setTelemetry,
    manualGrams, setManualGrams,
    deviceType, fishSchedule, setFishSchedule,
    schedules, setSchedules,
  } = useDeviceStore()
  const [feedback, setFeedback] = useState<string | null>(null)

  function toggleMode(automatic: boolean) {
    setTelemetry({ am: automatic })
    publishCmd(deviceId, { am: automatic })
  }

  function handleSendQuantity() {
    if (deviceType === 'peixe' && fishSchedule) {
      const updated = { ...fishSchedule, qpc: manualGrams }
      setFishSchedule(updated)
      publishCmd(deviceId, { c_ps: updated })
    } else if (deviceType === 'cao' && schedules.length > 0) {
      const updated = schedules.map((s, i) => i === 0 ? { ...s, q: manualGrams } : s)
      setSchedules(updated)
      publishCmd(deviceId, { c_pt: updated })
    }
    setFeedback('Quantidade enviada!')
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
      <h2 className="text-gray-500 text-sm font-medium">Modo de operação</h2>
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          onClick={() => toggleMode(false)}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            !am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => toggleMode(true)}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Automático
        </button>
      </div>

      {!am && (
        <>
          {feedback && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-sm">
              <CheckCircle2 size={14} />{feedback}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Quantidade por trato manual (g)</label>
            <input
              type="number" min={1} value={manualGrams}
              onChange={(e) => setManualGrams(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={handleSendQuantity}
            disabled={!connected}
            className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
          >
            Enviar quantidade
          </button>
        </>
      )}
    </div>
  )
}

function FishWindowConfig({ fs }: { fs: FishSchedule }) {
  const { connected, deviceId, setFishSchedule } = useDeviceStore()
  const [hl,  setHl]  = useState(fs.hl)
  const [hd,  setHd]  = useState(fs.hd)
  const [tc,  setTc]  = useState(fs.tc)
  const [qpc, setQpc] = useState(fs.qpc)
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    setFishSchedule(updated)
    const ok = publishCmd(deviceId, { c_ps: updated })
    setFeedback(ok ? 'Configuração enviada!' : 'Dispositivo offline — salvo localmente.')
    setTimeout(() => setFeedback(null), 3000)
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
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-gray-500">Início (hora)</label>
            <input type="number" min={0} max={23} value={hl}
              onChange={(e) => setHl(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-gray-500">Fim (hora)</label>
            <input type="number" min={0} max={23} value={hd}
              onChange={(e) => setHd(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-gray-500">Intervalo (min)</label>
            <input type="number" min={1} value={tc}
              onChange={(e) => setTc(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-gray-500">Quantidade (g)</label>
            <input type="number" min={1} value={qpc}
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

function PetScheduleSection() {
  const { schedules, setSchedules, deviceId } = useDeviceStore()
  const [time,  setTime]  = useState('08:00')
  const [grams, setGrams] = useState(100)
  const [feedback, setFeedback] = useState<string | null>(null)

  function sync(updated: DeviceSchedule[]) {
    setSchedules(updated)
    const ok = publishCmd(deviceId, { c_pt: updated })
    setFeedback(ok ? 'Salvo no dispositivo!' : 'Dispositivo offline — salvo localmente.')
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleAdd() {
    if (schedules.length >= 4) return
    const [h, m] = time.split(':').map(Number)
    const updated = [...schedules, { h, m, q: grams }]
      .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
    sync(updated)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
      <h2 className="text-gray-500 text-sm font-medium">Horários de Refeição</h2>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-sm">
          <CheckCircle2 size={14} />{feedback}
        </div>
      )}

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">Nenhum horário cadastrado</p>
      ) : (
        <div className="flex flex-col gap-2">
          {schedules.map((sc, i) => (
            <div key={`${sc.h}-${sc.m}`} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-gray-800">{pad(sc.h)}:{pad(sc.m)}</span>
              <span className="text-sm text-gray-500">{sc.q}g</span>
              <button onClick={() => sync(schedules.filter((_, idx) => idx !== i))}
                className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Horário</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Gramas</label>
            <input type="number" min={1} value={grams} onChange={(e) => setGrams(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={schedules.length >= 4}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-medium text-sm">
          <Plus size={16} /> Adicionar
        </button>
      </div>
      {schedules.length >= 4 && (
        <p className="text-xs text-gray-400 text-center">Máximo de 4 horários atingido</p>
      )}
    </div>
  )
}

const DEVICE_TYPES = [
  { value: 'cao'   as const, icon: '🐾', label: 'Cão'   },
  { value: 'peixe' as const, icon: '🐟', label: 'Peixe' },
]

export default function Configuracao() {
  const { deviceType, setDeviceType, fishSchedule, addFeedEntry, am } = useDeviceStore()

  return (
    <div className="p-4 flex flex-col gap-4">


      {/* Perfil do dispositivo */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-gray-500 text-sm font-medium mb-3">Perfil do dispositivo</h2>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {DEVICE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setDeviceType(t.value)}
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

      {!am && (
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col items-center gap-4">
          <FeedButton />
        </div>
      )}

      {deviceType === 'peixe' && fishSchedule
        ? <FishWindowConfig fs={fishSchedule} />
        : <PetScheduleSection />
      }

      {/* Simulação */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-gray-400" />
          <h2 className="text-gray-500 text-sm font-medium">Simulação</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => notify.success('Dispositivo conectado.')}
            className="py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
            Conectado
          </button>
          <button onClick={() => notify.warning('Dispositivo desconectado.')}
            className="py-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
            Desconectado
          </button>
          <button onClick={() => notify.info('Alimentando...')}
            className="py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
            Alimentando
          </button>
          <button onClick={() => notify.warning('Conexão offline.')}
            className="py-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
            Offline
          </button>
        </div>

        <p className="text-xs text-gray-400 font-medium mt-1">Histórico</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => addFeedEntry({ id: String(Date.now()), timestamp: Date.now(), grams: fishSchedule?.qpc ?? 100, source: 'manual' })}
            className="py-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">
            Feed Manual
          </button>
          <button
            onClick={() => addFeedEntry({ id: String(Date.now()), timestamp: Date.now() - 3600000, grams: 200, source: 'scheduled' })}
            className="py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
            Feed Agendado
          </button>
        </div>

        <p className="text-xs text-gray-400 font-medium mt-1">Erros</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => notify.error('Motor desconectado ou fusível queimado.')}
            className="py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            Corrente Zero
          </button>
          <button onClick={() => notify.error('Motor travado por objeto estranho ou ração úmida.')}
            className="py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            Corrente Alta
          </button>
          <button onClick={() => notify.error('Sensor capacitivo detectou falta de ração.')}
            className="py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            Vazio
          </button>
          <button onClick={() => notify.error('Motor ligado por tempo excessivo sem atingir o peso.')}
            className="py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            Timeout
          </button>
        </div>
      </div>

    </div>
  )
}
