import { useState } from 'react'
import { useDeviceStore, type FishSchedule, type DeviceSchedule } from '../store/deviceStore'
import { publishCmd, publishCmdSequence } from '../mqtt/client'
import { CmdStatusBadge, useLastCmd } from '../components/StatusBar'

function pad(n: number) { return String(n).padStart(2, '0') }

const DEVICES = [
  { label: 'Alimentador 1', id: 'ALIMENTADOR_1' },
  { label: 'Alimentador 2', id: 'ALIMENTADOR_2' },
]

function DeviceIdConfig() {
  const { deviceId, brokerUrl, setBrokerConfig } = useDeviceStore()

  function handleSelect(id: string) {
    if (id === deviceId) return
    setBrokerConfig(brokerUrl, id)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
      <h2 className="text-gray-500 text-sm font-medium">Alimentador</h2>
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelect(d.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              deviceId === d.id
                ? 'bg-brand-600 text-[#1A1A1A]'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModoOperacao() {
  const { am, deviceId, connected, setTelemetry, manualGrams, setManualGrams, setOptimisticFeed, deviceData } = useDeviceStore()
  const [sentAt,  setSentAt]  = useState<number | null>(null)
  const [offline, setOffline] = useState(false)
  const lastCmd = useLastCmd('mode', sentAt)

  const deviceAm  = deviceData[deviceId]?.am ?? null
  const lastSeen  = deviceData[deviceId]?.lastSeen ?? 0
  const deviceAl  = (deviceData[deviceId]?.al && Date.now() - lastSeen < 90_000) ?? false
  const deviceEp  = deviceData[deviceId]?.ep ?? null
  const isEmpty   = deviceEp !== null && deviceEp === 0

  // O firmware volta para am:true durante/após o sim — ignorar mismatch enquanto alimentando
  // ou quando o usuário acabou de disparar um trato manual (am local = false mas device = true por causa do sim)
  const modeMismatch = deviceAm !== null && deviceAm !== am && !deviceAl
  const revertedToAuto = !am && deviceAm === true && !deviceAl  // usuário quer manual mas device voltou ao auto após trato

  const isSending = lastCmd?.status === 'sent'
  const isTimeout = lastCmd?.status === 'timeout'

  function toggleMode(automatic: boolean) {
    const ok = publishCmd(deviceId, { am: automatic })
    setOffline(!ok)
    if (ok) { setTelemetry({ am: automatic }); setSentAt(Date.now()) }
  }

  function handleSendQuantity() {
    publishCmd(deviceId, { sim: manualGrams })
    setOptimisticFeed({ id: `opt-${Date.now()}`, deviceId, grams: manualGrams, timestamp: Date.now(), source: 'manual' })
  }

  function handleReconfirmManual() {
    const ok = publishCmd(deviceId, { am: false })
    setOffline(!ok)
    if (ok) { setTelemetry({ am: false }); setSentAt(Date.now()) }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
      <h2 className="text-gray-500 text-sm font-medium">Modo de operação</h2>

      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          onClick={() => toggleMode(false)}
          disabled={!connected}
          className={`flex-1 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
            !am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => toggleMode(true)}
          disabled={!connected}
          className={`flex-1 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
            am ? 'bg-brand-600 text-[#1A1A1A]' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Automático
        </button>
      </div>

      {/* Indicador unificado */}
      {offline ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-xs font-medium">
          <span>✗</span> Dispositivo offline — verifique a conexão.
        </div>
      ) : isSending ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
          <span className="animate-pulse">⏳</span> Enviado — aguardando confirmação do dispositivo...
        </div>
      ) : isTimeout ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-xs font-medium">
          <span>✗</span> Dispositivo não respondeu. Verifique a conexão.
        </div>
      ) : deviceAl ? (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-700 text-xs font-medium">
          <span className="animate-pulse">●</span> Alimentando...
        </div>
      ) : revertedToAuto ? (
        <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
          <span>⚠ O dispositivo voltou para Automático após o trato (comportamento do firmware).</span>
          <button
            onClick={handleReconfirmManual}
            disabled={!connected}
            className="self-start bg-amber-600 text-white rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Confirmar Manual novamente
          </button>
        </div>
      ) : deviceAm === null ? (
        <p className="text-xs text-gray-400 italic">Aguardando dado do dispositivo...</p>
      ) : modeMismatch ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
          <span>⚠</span>
          Dispositivo está em modo <strong>{deviceAm ? 'Automático' : 'Manual'}</strong> — diferente do selecionado aqui.
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-xs font-medium">
          <span>✓</span>
          Dispositivo em modo <strong>{deviceAm ? 'Automático' : 'Manual'}</strong>.
        </div>
      )}

      {!am && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Quantidade por trato manual (g)</label>
            <input
              type="number" min={1} value={manualGrams || ''}
              onChange={(e) => setManualGrams(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          {isEmpty && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs font-medium">
              <span>⚠</span> Estoque vazio — abasteça antes de disparar.
            </div>
          )}
          <button
            onClick={handleSendQuantity}
            disabled={!connected || isEmpty || deviceAl}
            className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm"
          >
            {deviceAl ? 'Dispensando...' : 'Disparar trato manual'}
          </button>
        </>
      )}
    </div>
  )
}

function FishWindowConfig({ fs }: { fs: FishSchedule }) {
  const { connected, deviceId, deviceData } = useDeviceStore()
  const [hl,  setHl]  = useState(fs.hl)
  const [hd,  setHd]  = useState(fs.hd)
  const [tc,  setTc]  = useState(fs.tc)
  const [qpc, setQpc] = useState(fs.qpc)
  const [sentAt,  setSentAt]  = useState<number | null>(null)
  const [offline, setOffline] = useState(false)
  const lastCmd = useLastCmd('config', sentAt)

  // Dado ao vivo do dispositivo (atualiza com cada status MQTT)
  const live = deviceData[deviceId]?.fishSchedule
  const isSynced = live !== null && live !== undefined
    && live.qpc === qpc && live.tc === tc && live.hl === hl && live.hd === hd
  const confirmedText = live
    ? `Dispositivo: ${live.qpc}g a cada ${live.tc}min — das ${pad(live.hl)}h às ${pad(live.hd)}h`
    : 'Confirmado pelo dispositivo!'

  function handleSave() {
    const updated: FishSchedule = { qpc, tc, hl, hd }
    const ok = publishCmd(deviceId, { c_ps: updated })
    setOffline(!ok)
    if (ok) setSentAt(Date.now())
  }

  return (
    <>
      {/* Valor atual no dispositivo */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-500 text-sm font-medium">Valor atual no dispositivo</h2>
          {live && (isSynced
            ? <span className="text-xs font-semibold text-green-600">✓ Sincronizado</span>
            : <span className="text-xs font-semibold text-amber-500">⚠ Com alterações</span>
          )}
        </div>
        {live ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Janela de Atividade</span>
              <span className="text-sm font-semibold text-gray-800">Das {pad(live.hl)}h às {pad(live.hd)}h</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Frequência de Tratos</span>
              <span className="text-sm font-semibold text-gray-800">A cada {live.tc} minutos</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Quantidade por trato</span>
              <span className="text-sm font-semibold text-gray-800">{live.qpc}g</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">Aguardando dados do dispositivo...</p>
        )}
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <h2 className="text-gray-500 text-sm font-medium">Configurar</h2>

        <CmdStatusBadge cmd={lastCmd} offline={offline} confirmedText={confirmedText} />

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Início (hora)</label>
            <input type="number" min={0} max={23} value={hl || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setHl(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Fim (hora)</label>
            <input type="number" min={0} max={23} value={hd || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setHd(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Intervalo (min)</label>
            <input type="number" min={1} value={tc || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTc(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-xs text-gray-500">Quantidade (g)</label>
            <input type="number" min={1} value={qpc || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setQpc(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
        </div>

        <button onClick={handleSave} disabled={!connected}
          className="w-full py-3 rounded-2xl bg-brand-600 disabled:bg-gray-300 text-[#1A1A1A] font-bold text-sm">
          Salvar configuração
        </button>
      </div>
    </>
  )
}

type Slot = { time: string; grams: number }

function initSlots(schedules: DeviceSchedule[]): Slot[] {
  const sorted = [...schedules].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
  return Array.from({ length: 4 }, (_, i) => {
    const sc = sorted[i]
    return sc ? { time: `${pad(sc.h)}:${pad(sc.m)}`, grams: sc.q } : { time: '08:00', grams: 100 }
  })
}

function PetScheduleSection() {
  const { deviceData, deviceId } = useDeviceStore()
  const received = deviceData[deviceId]
  const deviceSchedules = received?.schedules ?? []
  const [slots, setSlots] = useState<Slot[]>(() => initSlots(deviceSchedules))
  const [sentAt,  setSentAt]  = useState<number | null>(null)
  const [offline, setOffline] = useState(false)
  const lastCmd = useLastCmd('config', sentAt)

  const confirmedText = deviceSchedules.length > 0
    ? `Dispositivo: ${deviceSchedules.map(s => `${pad(s.h)}:${pad(s.m)} / ${s.q}g`).join(' · ')}`
    : 'Confirmado pelo dispositivo!'

  const isSynced = deviceSchedules.length > 0 && (() => {
    const sorted = [...deviceSchedules].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
    return sorted.every((s, i) => {
      const [h, m] = slots[i]?.time.split(':').map(Number) ?? [0, 0]
      return s.h === h && s.m === m && s.q === (slots[i]?.grams ?? 0)
    }) && sorted.length === slots.length
  })()

  function updateSlot(i: number, partial: Partial<Slot>) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, ...partial } : s))
  }

  function handleSave() {
    const updated: DeviceSchedule[] = slots
      .map(s => { const [h, m] = s.time.split(':').map(Number); return { h, m, q: s.grams } })
      .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))
    const ok = publishCmdSequence(deviceId, [{ pf: 1 }, { am: true }, { c_pt: updated }])
    setOffline(!ok)
    if (ok) setSentAt(Date.now())
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
      <h2 className="text-gray-500 text-sm font-medium">Horários de Refeição</h2>

      {/* Dado atual do dispositivo */}
      {deviceSchedules.length > 0 ? (
        <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor atual no dispositivo</span>
            {isSynced
              ? <span className="text-xs font-semibold text-green-600">✓ Sincronizado</span>
              : <span className="text-xs font-semibold text-amber-500">⚠ Com alterações</span>
            }
          </div>
          {deviceSchedules.map((s, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-500">Refeição {i + 1}</span>
              <span className="font-semibold text-gray-700">{pad(s.h)}:{pad(s.m)} — {s.q}g</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Aguardando dados do dispositivo...</p>
      )}

      <CmdStatusBadge cmd={lastCmd} offline={offline} confirmedText={confirmedText} />

      <div className="flex flex-col gap-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-col gap-2 border border-gray-100 rounded-xl p-3">
            <span className="text-sm font-semibold text-gray-700">Refeição {i + 1}</span>
            <div className="flex gap-2 min-w-0">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs text-gray-500">Horário</label>
                <input type="time" value={slot.time}
                  onChange={(e) => updateSlot(i, { time: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs text-gray-500">Gramas</label>
                <input type="number" min={1} value={slot.grams || ''}
                  onChange={(e) => updateSlot(i, { grams: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-brand-600 text-[#1A1A1A] font-medium text-sm">
        Salvar horários
      </button>
    </div>
  )
}

const DEVICE_TYPES = [
  { value: 'cao'   as const, icon: '🐾', label: 'Cão'   },
  { value: 'peixe' as const, icon: '🐟', label: 'Peixe' },
]

export default function Configuracao() {
  const { deviceType, setDeviceType, deviceData, deviceId, connected } = useDeviceStore()
  const fishSchedule    = deviceData[deviceId]?.fishSchedule
  const devicePf        = deviceData[deviceId]?.pf   // pf real do dispositivo (null = não recebido ainda)
  const deviceProfile   = devicePf === null || devicePf === undefined ? null : devicePf === 1 ? 'cao' : 'peixe'
  const profileMismatch = deviceProfile !== null && deviceProfile !== deviceType

  function handleSetProfile(value: 'cao' | 'peixe') {
    setDeviceType(value)
    publishCmd(deviceId, { pf: value === 'cao' ? 1 : 0 })
  }

  return (
    <div className="p-4 lg:p-6 lg:max-w-5xl lg:mx-auto flex flex-col gap-4">

      <DeviceIdConfig />

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        {/* Coluna esquerda: perfil + modo */}
        <div className="flex flex-col gap-4">
          {/* Perfil do dispositivo */}
          <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
            <h2 className="text-gray-500 text-sm font-medium">Perfil do dispositivo</h2>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {DEVICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  disabled={!connected}
                  onClick={() => handleSetProfile(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                    deviceType === t.value
                      ? 'bg-brand-600 text-[#1A1A1A]'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            {/* Indicador do perfil real do dispositivo */}
            {deviceProfile === null ? (
              <p className="text-xs text-gray-400 italic">Aguardando dado do dispositivo...</p>
            ) : profileMismatch ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
                <span>⚠</span>
                Dispositivo está em modo <strong>{deviceProfile === 'cao' ? '🐾 Cão' : '🐟 Peixe'}</strong> — diferente do selecionado aqui.
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-green-700 text-xs font-medium">
                <span>✓</span>
                Dispositivo confirmado em modo <strong>{deviceType === 'cao' ? '🐾 Cão' : '🐟 Peixe'}</strong>.
              </div>
            )}
          </div>

          <ModoOperacao />
        </div>

        {/* Coluna direita: agenda */}
        <div className="flex flex-col gap-4">
          {deviceType === 'peixe' && fishSchedule
            ? <FishWindowConfig key={deviceId} fs={fishSchedule} />
            : <PetScheduleSection key={deviceId} />
          }
        </div>
      </div>

    </div>
  )
}
