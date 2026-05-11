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

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID as string

function AppInner() {
  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/estoque"   element={<Estoque />} />
        <Route path="/historico"   element={<Historico />} />
        <Route path="/configuracao" element={<Configuracao />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const setBrokerConfig = useDeviceStore((s) => s.setBrokerConfig)
  const connected = useDeviceStore((s) => s.connected)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setBrokerConfig(BROKER_URL, DEVICE_ID)
    connectMqtt(BROKER_URL, DEVICE_ID)

    const timeout = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timeout)
  }, [setBrokerConfig])

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
