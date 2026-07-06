import { useState } from 'react'
import { useDeviceStore, type FishSchedule } from '../store/deviceStore'
import { publishCmd } from '../mqtt/client'
import { CmdStatusBadge, useLastCmd } from '../components/StatusBar'

function pad(n: number) { return String(n).padStart(2, '0') }

const DEVICES = [
  { label: 'Alimentador 1', id: 'ALIMENTADOR_1' },
  { label: 'Alimentador 2', id: 'ALIMENTADOR_2' },
]

function FishConfigCard({ deviceId, label }: { deviceId: string; label: string }) {
  const { deviceData, connected } = useDeviceStore()
  const live = deviceData[deviceId]?.fishSchedule

  const [hl,  setHl]  = useState(live?.hl  ?? 8)
  const [hd,  setHd]  = useState(live?.hd  ?? 18)
  const [tc,  setTc]  = useState(live?.tc  ?? 10)
  const [qpc, setQpc] = useState(live?.qpc ?? 100)

  const [sentAt,  setSentAt]  = useState<number | null>(null)
  const [offline, setOffline] = useState(false)
  const lastCmd = useLastCmd('config', sentAt)

  const isSynced = live != null
    && live.hl === hl && live.hd === hd && live.tc === tc && live.qpc === qpc

  const confirmedText = live
    ? `Dispositivo: ${live.qpc}g a cada ${live.tc}min — das ${pad(live.hl)}h às ${pad(live.hd)}h`
    : 'Confirmado!'

  async function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    const ok = await publishCmd(deviceId, { c_ps: updated })
    setOffline(!ok)
    if (ok) setSentAt(Date.now())
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        {live && (
          isSynced
            ? <span className="text-xs font-semibold text-green-600">✓ Sincronizado</span>
            : <span className="text-xs font-semibold text-amber-500">⚠ Alterações</span>
        )}
      </div>

      {live && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500">
          Dispositivo: <span className="font-semibold text-gray-700">{live.qpc}g</span> a cada{' '}
          <span className="font-semibold text-gray-700">{live.tc}min</span> — das{' '}
          <span className="font-semibold text-gray-700">{pad(live.hl)}h</span> às{' '}
          <span className="font-semibold text-gray-700">{pad(live.hd)}h</span>
        </div>
      )}

      <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wide">Configurar</h3>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Início (hora)</label>
          <input type="number" min={0} max={23} value={hl || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setHl(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Fim (hora)</label>
          <input type="number" min={0} max={23} value={hd || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setHd(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Intervalo (min)</label>
          <input type="number" min={1} value={tc || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setTc(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Quantidade (g)</label>
          <input type="number" min={1} value={qpc || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQpc(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
      </div>

      <CmdStatusBadge cmd={lastCmd} offline={offline} confirmedText={confirmedText} />

      <button
        onClick={handleSave}
        disabled={!connected}
        className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
      >
        Salvar configuração
      </button>
    </div>
  )
}

export default function Agenda() {
  return (
    <div className="p-4 lg:p-6 lg:max-w-5xl lg:mx-auto flex flex-col gap-4">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        {DEVICES.map((d) => (
          <FishConfigCard key={d.id} deviceId={d.id} label={d.label} />
        ))}
      </div>
    </div>
  )
}
