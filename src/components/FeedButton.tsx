import { Utensils, Square } from 'lucide-react'
import { publishCmd } from '../mqtt/client'
import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'
import { notify } from '../store/notificationStore'

export default function FeedButton() {
  const { connected, deviceId, al, addFeedEntry, manualGrams } = useDeviceStore()
  const ctx = useDeviceContext()

  function handleFeed() {
    if (!connected) return
    publishCmd(deviceId, { st: 1 })
    notify.info('Alimentando...')
    addFeedEntry({ id: String(Date.now()), timestamp: Date.now(), grams: manualGrams, source: 'manual' })
  }

  function handleStop() {
    publishCmd(deviceId, { st: 0 })
  }

  if (al) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium animate-pulse">
          <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
          Alimentando...
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
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleFeed}
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
