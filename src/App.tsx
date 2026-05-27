import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Historico from './pages/Historico'
import Configuracao from './pages/Configuracao'
import { useDeviceStore } from './store/deviceStore'
import { connectMqtt } from './mqtt/client'
import { api } from './api/client'

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
const DEVICE_ID  = import.meta.env.VITE_DEVICE_ID as string
const ALL_DEVICES = ['ALIMENTADOR_1', 'ALIMENTADOR_2']

function AppInner() {
  return (
    <Layout>
      <Routes>
        <Route path="/"             element={<Dashboard />} />
        <Route path="/estoque"      element={<Estoque />} />
        <Route path="/historico"    element={<Historico />} />
        <Route path="/configuracao" element={<Configuracao />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const setBrokerConfig = useDeviceStore((s) => s.setBrokerConfig)
  const setDeviceData   = useDeviceStore((s) => s.setDeviceData)
  const connected       = useDeviceStore((s) => s.connected)
  const deviceData      = useDeviceStore((s) => s.deviceData)

  // Se já tem cache local, não bloqueia com loading screen
  const hasCachedData   = Object.keys(deviceData).length > 0
  const [loading, setLoading] = useState(!hasCachedData)

  useEffect(() => {
    setBrokerConfig(BROKER_URL, DEVICE_ID)
    connectMqtt(BROKER_URL, DEVICE_ID)

    // Pré-carrega o último dado de cada dispositivo direto da API —
    // chega antes do MQTT e torna a tela inicial imediata
    ALL_DEVICES.forEach((id) => {
      api.latestTelemetry(id)
        .then((t) => {
          if (!t) return
          setDeviceData(id, {
            eg: t.eg ?? 0,
            ep: t.ep ?? 0,
            cp: t.cp ?? 10000,
            tp: t.tp ?? 0,
            er: t.er ?? 0,
          })
          setLoading(false)
        })
        .catch(() => {/* mantém o cache local */})
    })

    // Fallback: esconde loading após 2 s mesmo sem resposta
    const timeout = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timeout)
  }, [setBrokerConfig, setDeviceData])

  useEffect(() => {
    if (connected) setLoading(false)
  }, [connected])

  return (
    <HashRouter>
      {loading && <LoadingScreen />}
      <AppInner />
    </HashRouter>
  )
}
