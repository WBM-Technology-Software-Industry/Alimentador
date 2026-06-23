import { User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Configuracoes() {
  const { name } = useAuthStore()

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <User size={16} className="text-brand-600" />
          Conta
        </h2>
        <p className="text-sm font-semibold text-gray-800">{name ?? '—'}</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-400">ControlFeed · v1.0.0</p>
        <p className="text-xs text-gray-400">WBM Technology · MQTT v5</p>
      </div>
    </div>
  )
}
