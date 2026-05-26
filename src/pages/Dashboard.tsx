import { useDeviceStore } from '../store/deviceStore'
import StockGauge from '../components/StockGauge'
import { connectMqtt } from '../mqtt/client'

const ERROR_LABELS: Record<number, string> = {
  1:  'Motor desconectado ou fusível queimado.',
  2:  'Motor travado por objeto estranho ou ração úmida.',
  3:  'Sensor capacitivo detectou falta de ração.',
  4:  'Tensão baixa — verifique a alimentação elétrica.',
  6:  'Alerta de nível de ração baixo — reabasteça assim que possível.',
  11: 'Motor ligado por tempo excessivo sem atingir o peso.',
}

const DEVICES = [
  { label: 'Alimentador 1', id: 'ALIMENTADOR_1' },
  { label: 'Alimentador 2', id: 'ALIMENTADOR_2' },
]

function FeederLevelCard({ label, id, active, onClick }: { label: string; id: string; active: boolean; onClick: () => void }) {
  const deviceData = useDeviceStore((s) => s.deviceData)
  const data = deviceData[id]
  const ep = data?.ep ?? 0
  const eg = data?.eg ?? 0
  const cp = data?.cp ?? 10000
  const hasData = !!data

  const color = ep > 50 ? '#28CC08' : ep > 20 ? '#f59e0b' : '#ef4444'

  return (
    <button
      onClick={onClick}
      className={`flex-1 bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left transition-all ${
        active ? 'ring-2 ring-brand-500' : 'opacity-70'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${active ? 'text-brand-600' : 'text-gray-600'}`}>{label}</span>
        {hasData
          ? <span className="text-xs font-bold" style={{ color }}>{Math.round(ep)}%</span>
          : <span className="text-xs text-gray-300">—</span>
        }
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${ep}%`, backgroundColor: color }}
        />
      </div>

      {hasData ? (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{(eg / 1000).toFixed(2)} kg</span>
          <span>de {(cp / 1000).toFixed(1)} kg</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300 text-center">Aguardando dados...</span>
      )}
    </button>
  )
}

export default function Dashboard() {
  const { tp, er, eg, ep, cp, deviceId, brokerUrl, setBrokerConfig, setConnected } = useDeviceStore()

  function handleSelectDevice(id: string) {
    if (id === deviceId) return
    setBrokerConfig(brokerUrl, id)
    setConnected(false)
    connectMqtt(brokerUrl, id)
  }

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* Nível dos alimentadores */}
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

      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <StockGauge ep={ep} eg={eg} cp={cp} />
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${ep}%`, backgroundColor: ep > 50 ? '#28CC08' : ep > 20 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Temperatura</span>
          <span className="text-sm font-semibold text-gray-800">{tp}°C</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Erro</span>
          {er > 0
            ? <span className="text-sm font-semibold text-red-600">{ERROR_LABELS[er] ?? `Código ${er}`}</span>
            : <span className="text-sm font-semibold text-gray-400">Nenhum</span>
          }
        </div>
      </div>

    </div>
  )
}
