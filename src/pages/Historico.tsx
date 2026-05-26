import { useEffect, useState } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import { api, type ApiFeedEntry } from '../api/client'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, Hand } from 'lucide-react'

type Entry = {
  id: string | number
  timestamp: number
  grams: number
  source: 'manual' | 'scheduled'
}

function groupByDay(entries: Entry[]) {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const d = new Date(e.timestamp)
    const key = isToday(d) ? 'Hoje' : isYesterday(d) ? 'Ontem' : format(d, "d 'de' MMMM", { locale: ptBR })
    map.set(key, [...(map.get(key) ?? []), e])
  }
  return map
}

export default function Historico() {
  const { deviceId, feedHistory } = useDeviceStore()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!deviceId) return
    setLoading(true)
    api.history(deviceId)
      .then((data: ApiFeedEntry[]) => {
        setEntries(data.map(e => ({
          id: e.id,
          timestamp: new Date(e.timestamp).getTime(),
          grams: e.grams,
          source: e.source,
        })))
      })
      .catch(() => {
        // API indisponível — usa histórico local do store
        setEntries(feedHistory.map(e => ({ ...e })))
      })
      .finally(() => setLoading(false))
  }, [deviceId, feedHistory])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-gray-400 px-4">
        <span className="text-sm">Carregando...</span>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-gray-400 px-4">
        <span className="text-5xl">🍖</span>
        <p className="text-sm font-medium">Nenhuma alimentação registrada</p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {Array.from(groupByDay(entries).entries()).map(([day, dayEntries]) => (
        <div key={day}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{day}</p>
          <div className="flex flex-col gap-2">
            {dayEntries.map((e) => (
              <div key={e.id} className="bg-white rounded-xl shadow px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    e.source === 'manual' ? 'bg-brand-100' : 'bg-blue-50'}`}>
                    {e.source === 'manual'
                      ? <Hand size={15} className="text-brand-700" />
                      : <CalendarClock size={15} className="text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.grams > 0 ? `${e.grams}g` : '—'}</p>
                    <p className="text-xs text-gray-400">{e.source === 'manual' ? 'Manual' : 'Agendado'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 tabular-nums">
                  {format(new Date(e.timestamp), 'HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
