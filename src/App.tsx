import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Historico from './pages/Historico'
import Configuracao from './pages/Configuracao'
import Login from './pages/Login'
import { useDeviceStore } from './store/deviceStore'
import { getScopedAccountAccess, useAuthStore } from './store/authStore'
import { connectMqtt } from './mqtt/client'
import { api } from './api/client'

const BROKER_URL      = import.meta.env.VITE_MQTT_BROKER_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/mqtt`
const MQTT_USERNAME   = import.meta.env.VITE_MQTT_USERNAME as string | undefined
const MQTT_PASSWORD   = import.meta.env.VITE_MQTT_PASSWORD as string | undefined

function PrivateRoutes() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
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
  const setDeviceName   = useDeviceStore((s) => s.setDeviceName)
  const connected       = useDeviceStore((s) => s.connected)
  const deviceData      = useDeviceStore((s) => s.deviceData)
  const deviceId        = useDeviceStore((s) => s.deviceId)
  const token           = useAuthStore((s) => s.token)
  const email           = useAuthStore((s) => s.email)
  const devices         = useAuthStore((s) => s.devices)
  const profiles        = useAuthStore((s) => s.profiles)
  const setDevices      = useAuthStore((s) => s.setDevices)

  const hasCachedData   = Object.keys(deviceData).length > 0
  const [loading, setLoading] = useState(!hasCachedData && !!token)
  const scopedAccess    = getScopedAccountAccess(email, devices, profiles)
  const visibleDevices  = scopedAccess.devices

  useEffect(() => {
    if (!token) return
    connectMqtt(BROKER_URL, { username: MQTT_USERNAME, password: MQTT_PASSWORD })

    // Garante que o device ativo pertença à conta logada — corrige deviceId
    // desatualizado (conta anterior) e define o primeiro device como padrão.
    const activeDeviceId = visibleDevices.includes(deviceId) ? deviceId : (visibleDevices[0] ?? deviceId)
    setBrokerConfig(BROKER_URL, activeDeviceId)

    api.getLabels()
      .then((labels) => { Object.entries(labels).forEach(([id, name]) => setDeviceName(id, name)) })
      .catch(() => {})

    visibleDevices.forEach((id) => {
      // Semente de lastSeen a partir do banco — evita exibir timestamp desatualizado após F5
      api.lastSeen(id)
        .then((r) => setDeviceData(id, { lastSeen: new Date(r.lastSeen).getTime() }))
        .catch(() => {})

      api.latestTelemetry(id)
        .then((t) => {
          if (!t) return
          setDeviceData(id, {
            eg:       t.eg ?? 0,
            ep:       t.ep ?? 0,
            cp:       t.cp ?? 10000,
            tp:       t.tp ?? 0,
            er:       t.er ?? 0,
            al:       t.al ?? false,
            am:       t.am ?? null,
            pf:       t.pf ?? null,
            lastSeen: new Date(t.timestamp).getTime(),
          })
          setLoading(false)
        })
        .catch(() => {})
    })

    const timeout = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timeout)
  }, [token, email, visibleDevices, setBrokerConfig, setDeviceData, setDeviceName])

  useEffect(() => {
    const scoped = getScopedAccountAccess(email, devices, profiles)
    if (scoped.devices.join(',') !== devices.join(',') || scoped.profiles.join(',') !== profiles.join(',')) {
      setDevices(scoped.devices, scoped.profiles)
    }
  }, [email, devices, profiles, setDevices])

  useEffect(() => {
    if (connected) setLoading(false)
  }, [connected])

  return (
    <HashRouter>
      {loading && <LoadingScreen />}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/*"     element={<PrivateRoutes />} />
      </Routes>
    </HashRouter>
  )
}
