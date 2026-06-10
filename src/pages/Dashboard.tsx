import { useDeviceStore } from '../store/deviceStore'
import StockGauge from '../components/StockGauge'
import { publishCmd } from '../mqtt/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'

const ERROR_LABELS: Record<number, string> = {
  1:  'Motor desconectado ou fusível queimado.',
  2:  'Motor travado por objeto estranho ou ração úmida.',
  3:  'Alimentador vazio.',
  4:  'Tensão baixa — verifique a alimentação elétrica.',
  6:  'Alerta de nível baixo.',
  11: 'Motor ligado por tempo excessivo sem atingir o peso.',
}

const DEVICES = [
  { label: 'Alimentador 1', id: 'ALIMENTADOR_1' },
  { label: 'Alimentador 2', id: 'ALIMENTADOR_2' },
]

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function FeederLevelCard({ label, id, active, onClick }: {
  label: string; id: string; active: boolean; onClick: () => void
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const data     = useDeviceStore((s) => s.deviceData[id])
  const ep       = data?.ep ?? 0
  const eg       = data?.eg ?? 0
  const hasData  = !!data
  const lastSeen = data?.lastSeen ?? 0
  const isOffline = lastSeen > 0 && Date.now() - lastSeen > OFFLINE_THRESHOLD_MS
  const color    = isOffline ? '#9ca3af' : ep > 50 ? '#28CC08' : ep > 20 ? '#f59e0b' : '#ef4444'

  return (
    <button
      onClick={onClick}
      className={`flex-1 bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left transition-all ${
        active ? 'ring-2 ring-brand-500' : 'opacity-70'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${active ? 'text-brand-600' : 'text-gray-600'}`}>{label}</span>
        {!hasData
          ? <Skeleton className="w-8 h-3" />
          : isOffline
            ? <span className="text-xs font-bold text-gray-400">Offline</span>
            : <span className="text-xs font-bold" style={{ color }}>{Math.round(ep)}%</span>
        }
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        {hasData
          ? <div className="h-full rounded-full transition-all duration-500" style={{ width: isOffline ? '100%' : `${ep}%`, backgroundColor: color }} />
          : <div className="h-full w-full animate-pulse bg-gray-200 rounded-full" />
        }
      </div>
      {hasData ? (
        <div className="flex justify-between text-xs text-gray-400">
          {isOffline
            ? <span className="text-gray-400">Sem comunicação</span>
            : <><span>{(eg / 1000).toFixed(3)} kg</span><span>{Math.round(ep)}%</span></>
          }
        </div>
      ) : (
        <div className="flex justify-between">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-16 h-3" />
        </div>
      )}
    </button>
  )
}

const OFFLINE_THRESHOLD_MS = 90_000  // 90 segundos (1 ciclo de 60s + 30s de margem)

export default function Dashboard() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const { deviceId, brokerUrl, setBrokerConfig, deviceData } = useDeviceStore()
  const active = deviceData[deviceId]
  const hasData = !!active
  const eg = active?.eg ?? 0
  const ep = active?.ep ?? 0
  const tp = active?.tp ?? 0
  const er = active?.er ?? 0
  const al       = active?.al ?? false
  const lastSeen = active?.lastSeen ?? 0
  const isOffline = lastSeen > 0 && Date.now() - lastSeen > OFFLINE_THRESHOLD_MS

  function handleSelectDevice(id: string) {
    if (id === deviceId) return
    setBrokerConfig(brokerUrl, id)
  }

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4 lg:max-w-5xl lg:mx-auto">

      {/* Feeder selector cards */}
      <div className="flex gap-3">
        {DEVICES.map((d) => (
          <FeederLevelCard
            key={d.id}
            label={d.label}
            id={d.id}
            active={d.id === deviceId}
            onClick={() => handleSelectDevice(d.id)}
          />
        ))}
      </div>

      {/* Main panel — single col mobile, two col desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">

        {/* Gauge card */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
          {hasData ? (
            <StockGauge ep={ep} eg={eg} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton className="w-36 h-36 rounded-full" />
              <Skeleton className="w-24 h-4" />
            </div>
          )}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            {hasData
              ? <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${ep}%`, backgroundColor: ep > 50 ? '#28CC08' : ep > 20 ? '#f59e0b' : '#ef4444' }} />
              : <div className="h-full w-full animate-pulse bg-gray-200 rounded-full" />
            }
          </div>
        </div>

        {/* Telemetry card */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4 justify-center">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Status</span>
            {hasData ? (
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${al ? 'text-brand-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${al ? 'bg-brand-500 animate-pulse' : 'bg-gray-300'}`} />
                  {al ? 'Alimentando' : 'Parado'}
                </span>
                {al && (
                  <button
                    onClick={() => publishCmd(deviceId, { sm: 0 })}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    Parar
                  </button>
                )}
              </div>
            ) : <Skeleton className="w-20 h-4" />}
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Temperatura</span>
            {hasData
              ? <span className="text-sm font-semibold text-gray-800">{tp}°C</span>
              : <Skeleton className="w-12 h-4" />
            }
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Estoque atual</span>
            {hasData
              ? <span className="text-sm font-semibold text-gray-800">{(eg / 1000).toFixed(3)} kg</span>
              : <Skeleton className="w-16 h-4" />
            }
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Erro</span>
            {!hasData
              ? <Skeleton className="w-20 h-4" />
              : er > 0
                ? <span className="text-sm font-semibold text-red-600">{ERROR_LABELS[er] ?? `Código ${er}`}</span>
                : <span className="text-sm font-semibold text-gray-400">Nenhum</span>
            }
          </div>
          <hr className="border-gray-100" />
          {isOffline && (
            <>
              <hr className="border-gray-100" />
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-red-600">Sem comunicação</span>
                  <span className="text-xs text-red-400">
                    Última atualização: {format(new Date(lastSeen), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </>
          )}
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Última atualização</span>
            {!hasData || lastSeen === 0
              ? <Skeleton className="w-24 h-4" />
              : <span className={`text-sm font-semibold ${isOffline ? 'text-red-500' : 'text-gray-600'}`}>
                  {format(new Date(lastSeen), "dd/MM HH:mm:ss", { locale: ptBR })}
                </span>
            }
          </div>
        </div>

      </div>
    </div>
  )
}
