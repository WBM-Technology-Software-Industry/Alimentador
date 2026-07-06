import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, History, Settings, Sun, Moon, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useDeviceStore } from '../store/deviceStore'
import { api } from '../api/client'
import NotificationToast from './NotificationToast'
import StatusBar from './StatusBar'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'
import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'
import controlFeedLogo from '../assets/Logo ControlFeed.png'

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'Início',        short: 'Início'    },
  { to: '/estoque',      icon: Package,         label: 'Estoque',       short: 'Estoque'   },
  { to: '/historico',    icon: History,         label: 'Histórico',     short: 'Histórico' },
  { to: '/configuracao', icon: Settings,        label: 'Configurações', short: 'Config'    },
]

const OFFLINE_THRESHOLD_MS = 90_000

// Pílula de conexão ao vivo para o cabeçalho desktop — reflete o estado real
// do stream (SSE) e do último contato do device ativo.
function ConnectionPill() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const connected  = useDeviceStore((s) => s.connected)
  const deviceId   = useDeviceStore((s) => s.deviceId)
  const lastSeen   = useDeviceStore((s) => s.deviceData[deviceId]?.lastSeen ?? 0)
  const deviceStale = lastSeen > 0 && Date.now() - lastSeen > OFFLINE_THRESHOLD_MS

  const state = !connected ? 'off' : deviceStale ? 'stale' : 'live'
  const cfg = {
    live:  { dot: 'bg-brand-500', pulse: true,  text: 'Ao vivo',        cls: 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-900/40' },
    stale: { dot: 'bg-amber-500', pulse: false, text: 'Sem sinal',      cls: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40' },
    off:   { dot: 'bg-gray-400',  pulse: false, text: 'Desconectado',   cls: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600' },
  }[state]

  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {cfg.text}
    </span>
  )
}

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return { dark, toggle: () => setDark(d => !d) }
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const { dark, toggle } = useDarkMode()
  const { name, email, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)

  async function handleLogout() {
    await api.logout().catch(() => {})
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">

      {/* ── Sidebar (desktop) ──────────────────────── */}
      <div className="hidden lg:flex fixed top-0 left-0 h-full z-40 bg-white dark:bg-gray-800">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between min-w-0">
              <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto group-data-[collapsed=true]:hidden" />
              <SidebarTrigger className="shrink-0" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {nav.map(({ to, icon: Icon, label }) => (
                <SidebarMenuItem key={to}>
                  <NavLink to={to} end={to === '/'} className="block w-full">
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} asChild={false}>
                        <Icon size={18} className="shrink-0" />
                        <span className="group-data-[collapsed=true]:hidden">{label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center gap-2.5 group-data-[collapsed=true]:justify-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-sm font-bold uppercase">
                {(name ?? email ?? '?').charAt(0)}
              </div>
              <div className="flex flex-col min-w-0 group-data-[collapsed=true]:hidden">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate leading-tight">{name ?? '—'}</span>
                <span className="text-xs text-gray-400 truncate leading-tight">{email}</span>
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                aria-label="Sair da conta"
                className="ml-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group-data-[collapsed=true]:hidden"
              >
                <LogOut size={15} />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* ── Content — margin ajusta com o collapse ─ */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden ${
          collapsed ? 'lg:ml-16' : 'lg:ml-56'
        }`}
      >
        {/* Header mobile */}
        <header className="lg:hidden bg-gray-200 dark:bg-gray-800 px-4 py-2 flex items-center justify-between gap-3 shadow-md rounded-b-3xl">
          <img src={wbmLogo} alt="WBM Technology" className="h-9 w-auto shrink-0" />
          <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto" />
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Header desktop */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <img src={wbmLogo} alt="WBM Technology" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <ConnectionPill />
            <button
              onClick={toggle}
              aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <NotificationToast />
        <StatusBar />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
          {children}
        </main>

        {/* Footer desktop */}
        <footer className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-400">ControlFeed — Sistema de Alimentação Automática</span>
          <span className="text-xs text-gray-300 dark:text-gray-600">WBM Technology · {new Date().getFullYear()}</span>
        </footer>
      </div>

      {/* ── Bottom nav (mobile) ────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex z-50 rounded-t-3xl">
        {nav.map(({ to, icon: Icon, short }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`
            }
          >
            <Icon size={20} />
            <span>{short}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setConfirmLogout(true)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </nav>

      {/* Modal de confirmação de logout */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Sair da conta?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Você precisará fazer login novamente para acessar o sistema.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Sair
              </button>
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppShell>{children}</AppShell>
      </SidebarProvider>
    </TooltipProvider>
  )
}
