import { useDeviceStore } from '../store/deviceStore'
import { useDeviceContext } from '../store/deviceContext'
import StockGauge from '../components/StockGauge'
import FeedButton from '../components/FeedButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Thermometer, Zap, Clock } from 'lucide-react'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function Dashboard() {
  const { eg, ep, cp, tp, voltage, al, am, er, ts, feedHistory, schedules } = useDeviceStore()
  const ctx = useDeviceContext()

  const lastFeed = feedHistory[0]

  const hhmm = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`
  const nextSchedule = [...schedules]
    .map((s) => ({ ...s, time: `${pad(s.h)}:${pad(s.m)}` }))
    .filter((s) => s.time > hhmm)
    .sort((a, b) => a.time.localeCompare(b.time))[0]

  return (
    <div className="p-4 flex flex-col gap-4">

      {(al || am || er > 0) && (
        <div className="flex flex-col gap-2">
          {al && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-sm">
              <AlertTriangle size={16} />{ctx.alertLowStock}
            </div>
          )}
          {am && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-yellow-700 text-sm">
              <AlertTriangle size={16} />{ctx.alertMotor}
            </div>
          )}
          {er > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-orange-700 text-sm">
              <AlertTriangle size={16} />Erro no dispositivo (código {er}).
            </div>
          )}
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
        <div className="grid grid-cols-3 gap-3">
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
          <div className="flex flex-col items-center gap-1">
            <Clock size={18} className="text-brand-600" />
            <p className="text-xs font-bold text-gray-800 text-center leading-tight">{ts || '—'}</p>
            <p className="text-xs text-gray-400">Última sync</p>
          </div>
        </div>
      </div>
    </div>
  )
}
