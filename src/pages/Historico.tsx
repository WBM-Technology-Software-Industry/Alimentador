import { useDeviceStore, type FeedEntry } from '../store/deviceStore'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, Hand } from 'lucide-react'

type Entry = FeedEntry

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
  const { feedHistory } = useDeviceStore()

  if (feedHistory.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-gray-400 px-4">
        <span className="text-5xl">🍖</span>
        <p className="text-sm font-medium">Nenhuma alimentação registrada</p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {Array.from(groupByDay(feedHistory).entries()).map(([day, entries]) => (
        <div key={day}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{day}</p>
          <div className="flex flex-col gap-2">
            {entries.map((e) => (
              <div key={e.id} className="bg-white rounded-xl shadow px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    e.source === 'manual' ? 'bg-brand-100' : 'bg-blue-50'}`}>
                    {e.source === 'manual'
                      ? <Hand size={15} className="text-brand-700" />
                      : <CalendarClock size={15} className="text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.grams}g</p>
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
