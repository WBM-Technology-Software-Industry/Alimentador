import { useEffect, useRef, useState } from 'react'
import { Utensils, Square, RefreshCw } from 'lucide-react'
import { publishCmd } from '../mqtt/client'
import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'
import { notify } from '../store/notificationStore'

export default function FeedButton() {
  const {
    connected, deviceId, al,
    addFeedEntry, manualGrams,
    deviceType, fishSchedule, setFishSchedule,
    schedules, setSchedules,
  } = useDeviceStore()
  const ctx = useDeviceContext()

  const [continuous, setContinuous] = useState(false)
  const continuousRef = useRef(false)
  const prevAlRef = useRef(al)

  useEffect(() => { continuousRef.current = continuous }, [continuous])

  // Quando motor para e modo contínuo está ativo, re-dispara após 1.5s
  useEffect(() => {
    if (prevAlRef.current === true && al === false && continuousRef.current) {
      const t = setTimeout(() => triggerFeed(), 1500)
      return () => clearTimeout(t)
    }
    prevAlRef.current = al
  }, [al])

  function triggerFeed() {
    if (!connected) return

    // Atualiza a quantidade definida no dispositivo conforme o modo ativo
    if (deviceType === 'peixe' && fishSchedule) {
      const updated = { ...fishSchedule, qpc: manualGrams }
      setFishSchedule(updated)
      publishCmd(deviceId, { c_ps: updated })
    } else if (deviceType === 'cao' && schedules.length > 0) {
      // Atualiza o primeiro slot do agendamento pet com a nova quantidade
      const updated = schedules.map((s, i) => i === 0 ? { ...s, q: manualGrams } : s)
      setSchedules(updated)
      publishCmd(deviceId, { c_pt: updated })
    }

    publishCmd(deviceId, { st: 1 })
    addFeedEntry({ id: String(Date.now()), timestamp: Date.now(), grams: manualGrams, source: 'manual' })
    notify.info('Alimentando...')
  }

  function handleStop() {
    setContinuous(false)
    publishCmd(deviceId, { st: 0 })
  }

  if (al) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium animate-pulse">
          <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
          Alimentando...
          {continuous && <span className="text-xs text-gray-400 ml-1">— contínuo</span>}
        </div>
        <button
          onClick={handleStop}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-lg active:scale-95 transition-all"
        >
          <Square size={20} fill="white" />
          Parar agora
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Modo contínuo */}
      <button
        onClick={() => setContinuous(c => !c)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
          continuous
            ? 'bg-brand-50 border-brand-300 text-brand-700'
            : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}
      >
        <RefreshCw size={12} />
        Contínuo {continuous ? '(ativo)' : ''}
      </button>

      <button
        onClick={triggerFeed}
        disabled={!connected}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:text-gray-500 text-[#1A1A1A] font-bold py-4 px-10 rounded-2xl text-lg shadow-lg active:scale-95 transition-all"
      >
        <Utensils size={22} />
        {ctx.feedLabel}
      </button>
      {!connected && <p className="text-xs text-gray-400">Dispositivo offline</p>}
    </div>
  )
}
