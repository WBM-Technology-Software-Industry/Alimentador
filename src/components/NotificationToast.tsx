import { useState, useEffect } from 'react'
import { useNotificationStore, type Notification, type NotificationType } from '../store/notificationStore'
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react'

const styles: Record<NotificationType, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  icon: CheckCircle2  },
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    icon: AlertCircle   },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: AlertTriangle },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: Info          },
}

function Toast({ n }: { n: Notification }) {
  const remove = useNotificationStore((s) => s.remove)
  const [exiting, setExiting] = useState(false)

  function dismiss() {
    setExiting(true)
    setTimeout(() => remove(n.id), 180)
  }

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), 3700)
    return () => clearTimeout(t)
  }, [])

  const s = styles[n.type]
  const Icon = s.icon

  return (
    <div className={`flex items-center gap-3 ${s.bg} border ${s.border} rounded-2xl px-4 py-3 shadow-lg pointer-events-auto
      ${exiting ? 'animate-toast-out' : 'animate-toast-in'}`}>
      <Icon size={16} className={`${s.text} shrink-0`} />
      <span className={`text-sm flex-1 ${s.text}`}>{n.message}</span>
      <button onClick={dismiss} className={`${s.text} opacity-60 hover:opacity-100`}>
        <X size={14} />
      </button>
    </div>
  )
}

export default function NotificationToast() {
  const notifications = useNotificationStore((s) => s.notifications)

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 flex flex-col gap-2 z-[100] pointer-events-none">
      {notifications.map((n) => <Toast key={n.id} n={n} />)}
    </div>
  )
}
