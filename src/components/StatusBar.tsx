import { useDeviceStore } from '../store/deviceStore'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'

const DEVICE_LABELS: Record<string, string> = {
  ALIMENTADOR_1: 'Alimentador 1',
  ALIMENTADOR_2: 'Alimentador 2',
}

const STATUS_ICON = {
  confirmed: <CheckCircle2 size={11} className="text-green-500 shrink-0" />,
  sent:      <Clock        size={11} className="text-amber-500 shrink-0 animate-pulse" />,
  timeout:   <XCircle      size={11} className="text-red-400 shrink-0" />,
}

const STATUS_TEXT = {
  confirmed: 'text-green-600 dark:text-green-400',
  sent:      'text-amber-600 dark:text-amber-400',
  timeout:   'text-red-500 dark:text-red-400',
}

export default function StatusBar() {
  const deviceId   = useDeviceStore((s) => s.deviceId)
  const deviceType = useDeviceStore((s) => s.deviceType)
  const al         = useDeviceStore((s) => s.al)
  const cmdLog     = useDeviceStore((s) => s.cmdLog)

  const deviceLabel = DEVICE_LABELS[deviceId] ?? (deviceId || '—')
  const profile     = deviceType === 'peixe' ? '🐟 Peixe' : '🐾 Cão'
  const operation   = al ? 'Alimentando...' : 'Aguardando'

  const recent = cmdLog.slice(0, 3)

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-1.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar text-xs shrink-0">
      <span className="font-semibold text-gray-700 dark:text-gray-200 shrink-0">{deviceLabel}</span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{profile}</span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <span className={`font-medium shrink-0 ${al ? 'text-brand-600 animate-pulse' : 'text-gray-400'}`}>
        {operation}
      </span>

      {recent.length > 0 && (
        <>
          <span className="text-gray-200 dark:text-gray-600 mx-1 shrink-0">|</span>
          {recent.map((cmd) => (
            <div key={cmd.id} className="flex items-center gap-1 shrink-0">
              {STATUS_ICON[cmd.status]}
              <span className={STATUS_TEXT[cmd.status]}>{cmd.label}</span>
              <span className="text-gray-300 dark:text-gray-500 ml-0.5">
                {format(new Date(cmd.timestamp), 'HH:mm')}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
