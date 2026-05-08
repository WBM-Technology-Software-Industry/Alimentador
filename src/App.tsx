import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Agenda from './pages/Agenda'
import Historico from './pages/Historico'
import { useDeviceStore } from './store/deviceStore'
import { connectMqtt } from './mqtt/client'

// Em produção usa o próprio host (Hostinger). Em dev usa o .env
const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID as string

function AppInner() {
  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/estoque"   element={<Estoque />} />
        <Route path="/agenda"    element={<Agenda />} />
        <Route path="/historico" element={<Historico />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const setBrokerConfig = useDeviceStore((s) => s.setBrokerConfig)

  useEffect(() => {
    setBrokerConfig(BROKER_URL, DEVICE_ID)
    connectMqtt(BROKER_URL, DEVICE_ID)
  }, [setBrokerConfig])

  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  )
}
