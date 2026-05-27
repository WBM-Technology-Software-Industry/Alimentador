import { useDeviceStore, type CmdLogEntry, type CmdType } from '../store/deviceStore'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'

// ─── Hook reutilizável ───────────────────────────────────────────────────────

export function useLastCmd(type: CmdType, sentAt: number | null): CmdLogEntry | null {
  const cmdLog = useDeviceStore((s) => s.cmdLog)
  if (!sentAt) return null
  return cmdLog.find((c) => c.type === type && c.timestamp >= sentAt - 200) ?? null
}

// ─── Badge de status por página ─────────────────────────────────────────────

export function CmdStatusBadge({
  cmd,
  offline = false,
  confirmedText,
}: {
  cmd: CmdLogEntry | null
  offline?: boolean
  confirmedText?: string
}) {
  if (offline) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-sm">
        <XCircle size={14} />
        Dispositivo offline — verifique a conexão.
      </div>
    )
  }
  if (!cmd) return null

  const cfg = {
    sent:      { cls: 'bg-amber-50 border-amber-200 text-amber-700', Icon: Clock,        spin: true,  text: 'Enviado — aguardando confirmação do dispositivo...' },
    confirmed: { cls: 'bg-green-50 border-green-200 text-green-700', Icon: CheckCircle2, spin: false, text: confirmedText ?? 'Confirmado pelo dispositivo!' },
    timeout:   { cls: 'bg-red-50 border-red-200 text-red-700',       Icon: XCircle,      spin: false, text: 'Dispositivo não respondeu. Verifique a conexão.' },
  }[cmd.status]

  return (
    <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm ${cfg.cls}`}>
      <cfg.Icon size={14} className={cfg.spin ? 'animate-pulse' : ''} />
      {cfg.text}
    </div>
  )
}

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
  const deviceData = useDeviceStore((s) => s.deviceData)
  const cmdLog     = useDeviceStore((s) => s.cmdLog)

  const deviceLabel = DEVICE_LABELS[deviceId] ?? (deviceId || '—')
  const profile     = deviceType === 'peixe' ? '🐟 Peixe' : '🐾 Cão'

  // Todos os dispositivos que estão alimentando agora
  const feedingDevices = Object.entries(deviceData)
    .filter(([, d]) => d.al)
    .map(([id]) => DEVICE_LABELS[id] ?? id)

  const recent = cmdLog.slice(0, 3)

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-1.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar text-xs shrink-0">
      <span className="font-semibold text-gray-700 dark:text-gray-200 shrink-0">{deviceLabel}</span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{profile}</span>
      <span className="text-gray-300 dark:text-gray-600">·</span>

      {feedingDevices.length > 0 ? (
        <span className="font-semibold text-brand-600 animate-pulse shrink-0">
          {feedingDevices.join(' e ')} alimentando...
        </span>
      ) : (
        <span className="text-gray-400 shrink-0">Aguardando</span>
      )}

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
