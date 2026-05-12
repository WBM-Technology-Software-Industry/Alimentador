import { useDeviceStore } from '../store/deviceStore'
import StockGauge from '../components/StockGauge'
import type { DeviceType } from '../store/deviceStore'

const ERROR_LABELS: Record<number, string> = {
  1:  'Motor desconectado ou fusível queimado.',
  2:  'Motor travado por objeto estranho ou ração úmida.',
  3:  'Sensor capacitivo detectou falta de ração.',
  6:  'Nível de ração baixo — reabasteça em breve.',
  11: 'Motor ligado por tempo excessivo sem atingir o peso.',
}

function ModeAnimation({ deviceType }: { deviceType: DeviceType }) {
  if (deviceType === 'peixe') {
    return (
      <div className="relative w-full bg-blue-50 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-1" style={{ height: '9rem' }}>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-blue-100 rounded-b-2xl opacity-60" />
        <div className="absolute bottom-3 left-0 right-0 h-5 bg-blue-200 rounded-b-2xl opacity-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute animate-bubble rounded-full border-2 border-blue-300"
            style={{ width: 10, height: 10, left: `${25 + i * 25}%`, bottom: '30%', animationDelay: `${i * 0.6}s` }} />
        ))}
        <span className="animate-swim text-5xl select-none z-10">🐟</span>
        <span className="text-xs font-medium text-blue-400 z-10">Modo Piscicultura</span>
      </div>
    )
  }

  return (
    <div className="relative w-full bg-amber-50 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3" style={{ height: '9rem' }}>
      {/* tigela */}
      <div className="flex flex-col items-center gap-2 z-10">
        <div className="flex gap-2 items-end" style={{ height: 32 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-kibble rounded-full bg-amber-600"
              style={{ width: 12, height: 12, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        <div style={{
          width: 64, height: 28,
          background: '#d97706',
          borderRadius: '0 0 40px 40px',
        }} />
      </div>
      <span className="text-xs font-medium text-amber-500">Modo Pet</span>
    </div>
  )
}

export default function Dashboard() {
  const { tp, er, deviceType, eg, ep, cp } = useDeviceStore()

  return (
    <div className="p-4 flex flex-col gap-4">

      <ModeAnimation deviceType={deviceType} />

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
