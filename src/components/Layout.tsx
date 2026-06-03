import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, History, Settings, Sun, Moon, LogOut } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'
import { useAuthStore } from '../store/authStore'
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
  { to: '/',             icon: LayoutDashboard, label: 'Início'    },
  { to: '/estoque',      icon: Package,         label: 'Estoque'   },
  { to: '/configuracao', icon: Settings,        label: 'Config'    },
  { to: '/historico',    icon: History,         label: 'Histórico' },
]

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
  const connected = useDeviceStore((s) => s.connected)
  const { dark, toggle } = useDarkMode()
  const { email, clearAuth } = useAuthStore()
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
      <div className="hidden lg:flex fixed top-0 left-0 h-full z-40 bg-gray-200 dark:bg-gray-800">
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
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 truncate group-data-[collapsed=true]:hidden">{email}</span>
              <button
                onClick={() => setConfirmLogout(true)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={13} />
                <span className="group-data-[collapsed=true]:hidden">Sair</span>
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
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
            <span className={`text-xs font-medium ${connected ? 'text-brand-600' : 'text-red-500'}`}>
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Header desktop */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
          <img src={wbmLogo} alt="WBM Technology" className="h-8 w-auto" />
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-xs">{dark ? 'Claro' : 'Escuro'}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
              <span className={`text-xs font-semibold ${connected ? 'text-brand-600' : 'text-red-500'}`}>
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
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
        </footer>
      </div>

      {/* ── Bottom nav (mobile) ────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex z-50 rounded-t-3xl">
        {nav.map(({ to, icon: Icon, label }) => (
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
            <span>{label}</span>
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
