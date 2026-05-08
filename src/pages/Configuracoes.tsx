import { useState } from 'react'
import { PawPrint, Weight, Save } from 'lucide-react'
import { useDeviceStore, type DeviceType } from '../store/deviceStore'

const deviceTypes: { value: DeviceType; label: string; icon: string; desc: string }[] = [
  { value: 'cao',   label: 'Cão',   icon: '🐾', desc: 'Alimentador para cães' },
  { value: 'peixe', label: 'Peixe', icon: '🐟', desc: 'Alimentador para piscicultura' },
]

export default function Configuracoes() {
  const { connected, deviceType, setDeviceType } = useDeviceStore()

  const [petName,   setPetName]   = useState(() => localStorage.getItem('pet_name')   ?? '')
  const [petBreed,  setPetBreed]  = useState(() => localStorage.getItem('pet_breed')  ?? '')
  const [petWeight, setPetWeight] = useState(() => localStorage.getItem('pet_weight') ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    localStorage.setItem('pet_name',   petName)
    localStorage.setItem('pet_breed',  petBreed)
    localStorage.setItem('pet_weight', petWeight)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Status */}
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
        connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-brand-600' : 'bg-red-400'}`} />
        <p className={`text-sm font-medium ${connected ? 'text-green-700' : 'text-red-600'}`}>
          {connected ? 'Alimentador conectado' : 'Alimentador desconectado'}
        </p>
      </div>

      {/* Tipo de dispositivo */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
        <h2 className="font-bold text-gray-800 text-sm">Tipo de Alimentador</h2>
        <div className="flex gap-3">
          {deviceTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => setDeviceType(t.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                deviceType === t.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className={`text-sm font-bold ${deviceType === t.value ? 'text-brand-700' : 'text-gray-600'}`}>
                {t.label}
              </span>
              <span className="text-xs text-gray-400 text-center leading-tight">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-4">
        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <PawPrint size={16} className="text-brand-600" />
          {deviceType === 'cao' ? 'Perfil do Pet' : 'Dados do Tanque'}
        </h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{deviceType === 'cao' ? 'Nome do cão' : 'Nome do tanque'}</label>
          <input value={petName} onChange={(e) => setPetName(e.target.value)}
            placeholder={deviceType === 'cao' ? 'Ex: Thor' : 'Ex: Tanque 1'}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{deviceType === 'cao' ? 'Raça' : 'Espécie'}</label>
          <input value={petBreed} onChange={(e) => setPetBreed(e.target.value)}
            placeholder={deviceType === 'cao' ? 'Ex: Golden Retriever' : 'Ex: Tilápia'}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 flex items-center gap-1">
            <Weight size={12} /> {deviceType === 'cao' ? 'Peso do cão (kg)' : 'Volume do tanque (L)'}
          </label>
          <input type="number" value={petWeight} onChange={(e) => setPetWeight(e.target.value)}
            placeholder={deviceType === 'cao' ? 'Ex: 28' : 'Ex: 5000'}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>

        <button onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-[#1A1A1A] font-bold py-3 rounded-xl text-sm">
          <Save size={16} />{saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-400">Alimentador WBM · v1.0.0</p>
        <p className="text-xs text-gray-400">WBM Technology · MQTT v5</p>
      </div>
    </div>
  )
}
