import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'
import StockGauge from '../components/StockGauge'
import FeedButton from '../components/FeedButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Thermometer, Zap, Clock, RefreshCcw } from 'lucide-react'

function pad(n: number) { return String(n).padStart(2, '0') }

const ERROR_LABELS: Record<number, string> = {
  1:  'Corrente zero — motor não responde.',
  2:  'Corrente alta / obstrução no mecanismo.',
  3:  'Reservatório vazio.',
  11: 'Timeout no comando.',
}

export default function Dashboard() {
  const { eg, ep, cp, tp, voltage, am, er, ts, feedHistory, schedules } = useDeviceStore()
  const ctx = useDeviceContext()

  const lastFeed = feedHistory[0]

  const hhmm = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`
  const nextSchedule = [...schedules]
    .map((s) => ({ ...s, time: `${pad(s.h)}:${pad(s.m)}` }))
    .filter((s) => s.time > hhmm)
    .sort((a, b) => a.time.localeCompare(b.time))[0]

  return (
    <div className="p-4 flex flex-col gap-4">

      {er > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-sm">
          <AlertTriangle size={16} />
          {ERROR_LABELS[er] ?? `Erro no dispositivo (código ${er}).`}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-5 flex flex-col items-center gap-2">
        <h2 className="text-gray-500 text-sm font-medium self-start">{ctx.stockLabel}</h2>
        <div className="relative flex items-center justify-center w-full py-2">
          <StockGauge ep={ep} eg={eg} cp={cp} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 flex flex-col items-center gap-4">
        <h2 className="text-gray-500 text-sm font-medium self-start">Alimentar</h2>
        <FeedButton />
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-white rounded-2xl shadow px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Última refeição</p>
            {lastFeed
              ? <p className="text-base font-bold text-gray-800 mt-0.5">{lastFeed.grams}g</p>
              : <p className="text-sm text-gray-400 mt-0.5">Nenhuma ainda</p>}
          </div>
          {lastFeed && (
            <p className="text-sm text-gray-500 tabular-nums">
              {format(new Date(lastFeed.timestamp), "HH:mm 'de' dd/MM", { locale: ptBR })}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Próxima refeição</p>
            {nextSchedule
              ? <p className="text-base font-bold text-gray-800 mt-0.5">{nextSchedule.q}g</p>
              : <p className="text-sm text-gray-400 mt-0.5">Nenhuma hoje</p>}
          </div>
          {nextSchedule && (
            <p className="text-base font-bold text-brand-600">{nextSchedule.time}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-gray-500 text-sm font-medium mb-3">Dispositivo</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col items-center gap-1">
            <Thermometer size={18} className="text-orange-400" />
            <p className="text-base font-bold text-gray-800">{tp}°C</p>
            <p className="text-xs text-gray-400">Temperatura</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap size={18} className="text-yellow-400" />
            <p className="text-base font-bold text-gray-800">{voltage.toFixed(1)}V</p>
            <p className="text-xs text-gray-400">Tensão</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <RefreshCcw size={14} className="text-brand-600" />
              Modo automático
            </span>
            <span className={`font-medium ${am ? 'text-brand-600' : 'text-gray-400'}`}>
              {am ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {ts && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock size={14} className="text-gray-400" />
                Última sync
              </span>
              <span className="text-gray-600 tabular-nums text-xs">{ts}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
