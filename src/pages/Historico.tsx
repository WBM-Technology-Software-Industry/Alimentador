import { useEffect, useState, useMemo } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import { api, type ApiFeedEntry } from '../api/client'
import { format, isToday, isYesterday, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, Hand, Trash2, Calendar, RefreshCw } from 'lucide-react'

type Entry = {
  id: string | number
  timestamp: number
  grams: number
  source: 'manual' | 'scheduled'
  deviceId: string
}

const DEVICE_LABELS: Record<string, string> = {
  ALIMENTADOR_1: 'Alimentador 1',
  ALIMENTADOR_2: 'Alimentador 2',
}

type Period = 'today' | '7d' | '30d' | 'all'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d',   label: '7 dias' },
  { value: '30d',  label: '30 dias' },
  { value: 'all',  label: 'Tudo' },
]

function applyFilter(entries: Entry[], period: Period, customDate: string | null): Entry[] {
  if (customDate) {
    const date = new Date(customDate + 'T00:00:00')
    const from = startOfDay(date).getTime()
    const to   = endOfDay(date).getTime()
    return entries.filter(e => e.timestamp >= from && e.timestamp <= to)
  }
  if (period === 'all') return entries
  const cutoff = period === 'today'
    ? startOfDay(new Date()).getTime()
    : subDays(new Date(), period === '7d' ? 7 : 30).getTime()
  return entries.filter(e => e.timestamp >= cutoff)
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
  const { deviceId, deviceData, setDeviceData, clearFeedHistory, lastFeedAt, optimisticFeed } = useDeviceStore()
  const cachedEntries = deviceData[deviceId]?.historyCache ?? []
  const [entries, setEntries] = useState<Entry[]>(cachedEntries)
  const [loading, setLoading] = useState(cachedEntries.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('7d')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  function fetchHistory(silent = true) {
    if (!deviceId) return
    if (!silent && entries.length === 0) setLoading(true)
    else setRefreshing(true)
    api.history(deviceId)
      .then((data: ApiFeedEntry[]) => {
        const mapped = data.map(e => ({
          id: e.id,
          timestamp: new Date(e.timestamp).getTime(),
          grams: e.grams,
          source: e.source,
          deviceId: e.deviceId,
        }))
        // Persist to localStorage so next mount is instant
        setDeviceData(deviceId, { historyCache: mapped })
        // Read fresh from store to avoid stale closure
        const { optimisticFeed: opt, setOptimisticFeed: clearOpt } = useDeviceStore.getState()
        if (opt && opt.deviceId === deviceId) {
          const confirmed = mapped.some(e =>
            e.grams === opt.grams &&
            e.timestamp >= opt.timestamp - 10_000
          )
          if (confirmed) {
            clearOpt(null)
            setEntries(mapped)
          } else {
            setEntries([opt, ...mapped])
          }
        } else {
          setEntries(mapped)
        }
      })
      .catch(() => {/* mantém os dados em cache */})
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  // Inject optimistic entry immediately whenever it changes
  useEffect(() => {
    if (!optimisticFeed || optimisticFeed.deviceId !== deviceId) return
    setEntries(prev => prev.some(e => e.id === optimisticFeed.id) ? prev : [optimisticFeed, ...prev])
  }, [optimisticFeed, deviceId])

  useEffect(() => {
    fetchHistory(false)
    const interval = setInterval(() => fetchHistory(true), 10000)
    return () => clearInterval(interval)
  }, [deviceId])

  useEffect(() => {
    if (lastFeedAt > 0) fetchHistory(true)
  }, [lastFeedAt])

  const filtered = useMemo(() => applyFilter(entries, period, customDate), [entries, period, customDate])

  function selectPeriod(p: Period) {
    setPeriod(p)
    setCustomDate(null)
  }

  function selectDate(value: string) {
    setCustomDate(value || null)
  }

  async function handleClear() {
    try { await api.clearHistory(deviceId) } catch { /* API indisponível */ }
    clearFeedHistory()
    setDeviceData(deviceId, { historyCache: [] })
    setEntries([])
    setConfirming(false)
  }

  return (
    <div className="p-4 lg:p-6 lg:max-w-3xl lg:mx-auto flex flex-col gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Histórico de tratos</span>
        <button
          onClick={() => fetchHistory(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={(refreshing || loading) ? 'animate-spin' : ''} />
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => selectPeriod(p.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                !customDate && period === p.value
                  ? 'bg-brand-600 text-[#1A1A1A]'
                  : 'bg-white text-gray-500 shadow'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2 bg-white rounded-xl shadow px-3 py-2 ${customDate ? 'ring-2 ring-brand-500' : ''}`}>
          <Calendar size={15} className={customDate ? 'text-brand-600' : 'text-gray-400'} />
          <input
            type="date"
            value={customDate ?? ''}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => selectDate(e.target.value)}
            className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
          />
          {customDate && (
            <button onClick={() => setCustomDate(null)} className="text-xs text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Confirmação de limpeza */}
      {confirming && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-700">Limpar todo o histórico?</p>
          <p className="text-xs text-red-500">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <button onClick={handleClear}
              className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">
              Confirmar
            </button>
            <button onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-gray-400">
          <span className="text-5xl">🍖</span>
          <p className="text-sm font-medium">Nenhuma alimentação neste período</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
              Limpar histórico
            </button>
          </div>

          {Array.from(groupByDay(filtered).entries()).map(([day, dayEntries]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{day}</p>
              <div className="flex flex-col gap-2">
                {dayEntries.map((e) => (
                  <div key={e.id} className="bg-white rounded-xl shadow px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        e.source === 'manual' ? 'bg-brand-100' : 'bg-blue-50'}`}>
                        {e.source === 'manual'
                          ? <Hand size={15} className="text-brand-700" />
                          : <CalendarClock size={15} className="text-blue-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{e.grams > 0 ? `${e.grams}g dispensados` : '—'}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {e.source === 'manual' ? 'Manual' : 'Automático'} · {DEVICE_LABELS[e.deviceId] ?? e.deviceId}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 tabular-nums shrink-0">
                      {format(new Date(e.timestamp), 'HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
