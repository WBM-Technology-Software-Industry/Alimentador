import { useState } from 'react'
import { Utensils, Loader2 } from 'lucide-react'
import { publishCmd } from '../mqtt/client'
import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'

const PORTIONS = [50, 100, 150, 200]

export default function FeedButton() {
  const { connected, deviceId, addFeedEntry } = useDeviceStore()
  const ctx = useDeviceContext()
  const [loading, setLoading] = useState(false)
  const [grams, setGrams] = useState(100)
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleFeed() {
    if (!connected || loading) return
    setLoading(true)
    const ok = publishCmd(deviceId, { fd: grams })
    if (ok) {
      addFeedEntry({ id: crypto.randomUUID(), timestamp: Date.now(), grams, source: 'manual' })
      setFeedback(`${grams}g enviado!`)
    } else {
      setFeedback('Falha ao enviar comando.')
    }
    setTimeout(() => { setLoading(false); setFeedback(null) }, 2000)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {PORTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setGrams(p)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              grams === p
                ? 'bg-brand-600 text-[#1A1A1A]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p}g
          </button>
        ))}
      </div>

      <button
        onClick={handleFeed}
        disabled={!connected || loading}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:text-gray-500 text-[#1A1A1A] font-bold py-4 px-10 rounded-2xl text-lg shadow-lg active:scale-95 transition-all"
      >
        {loading ? <Loader2 size={22} className="animate-spin" /> : <Utensils size={22} />}
        {ctx.feedLabel}
      </button>

      {feedback && <p className="text-sm text-brand-600 font-medium">{feedback}</p>}
      {!connected && <p className="text-xs text-gray-400">Dispositivo offline</p>}
    </div>
  )
}
