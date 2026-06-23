import { useState } from 'react'
import { Save, User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Configuracoes() {
  const { name: storedName, setAuth, token, email } = useAuthStore()

  const [displayName, setDisplayName] = useState(storedName ?? '')
  const [nameSaved,   setNameSaved]   = useState(false)

  function handleSaveName() {
    if (!displayName.trim()) return
    setAuth(token ?? '', email ?? '', displayName.trim())
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Nome do usuário */}
      <div className={`bg-white rounded-2xl shadow p-4 flex flex-col gap-3 ${!storedName ? 'ring-2 ring-orange-400' : ''}`}>
        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <User size={16} className="text-brand-600" />
          Seu nome
          {!storedName && <span className="text-xs text-orange-500 font-medium">— necessário para o histórico</span>}
        </h2>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            placeholder="Ex: Hitalo"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={handleSaveName}
            disabled={!displayName.trim()}
            className="px-4 py-2 rounded-xl bg-brand-600 text-[#1A1A1A] font-bold text-sm disabled:opacity-40"
          >
            {nameSaved ? 'Salvo!' : <span className="flex items-center gap-1"><Save size={14} />Salvar</span>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-400">ControlFeed · v1.0.0</p>
        <p className="text-xs text-gray-400">WBM Technology · MQTT v5</p>
      </div>
    </div>
  )
}
