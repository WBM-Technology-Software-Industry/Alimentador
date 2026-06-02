import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import controlFeedLogo from '../assets/Logo ControlFeed.png'
import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'

const BASE = import.meta.env.VITE_API_URL ?? ''

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth }             = useAuthStore()
  const navigate                = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Credenciais inválidas.')
        return
      }
      const data = await res.json()
      setAuth(data.token, data.email)
      navigate('/', { replace: true })
    } catch {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logos */}
        <div className="flex flex-col items-center gap-3">
          <img src={controlFeedLogo} alt="ControlFeed" className="h-10 w-auto" />
          <img src={wbmLogo} alt="WBM Technology" className="h-6 w-auto opacity-60" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <h1 className="text-base font-bold text-gray-800 text-center">Entrar</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-[#1A1A1A] text-sm font-bold transition-all hover:brightness-95 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">ControlFeed — Sistema de Alimentação Automática</p>
      </div>
    </div>
  )
}
