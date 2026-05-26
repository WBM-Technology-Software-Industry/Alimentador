import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, History, Settings } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'
import NotificationToast from './NotificationToast'
import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'
import controlFeedLogo from '../assets/Logo ControlFeed.png'

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'Início'    },
  { to: '/estoque',      icon: Package,         label: 'Estoque'   },
  { to: '/configuracao', icon: Settings,        label: 'Config'    },
  { to: '/historico',    icon: History,         label: 'Histórico' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const connected = useDeviceStore((s) => s.connected)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sidebar (desktop) ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-56 bg-gray-800 z-40 shadow-xl">
        <div className="px-5 py-5 flex flex-col gap-3 border-b border-gray-700">
          <img src={wbmLogo} alt="WBM Technology" className="h-8 w-auto" />
          <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-[#1A1A1A]'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-700 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-brand-400' : 'text-red-400'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </aside>

      {/* ── Header (mobile) ───────────────────────────── */}
      <header className="lg:hidden bg-gray-200 px-4 py-2 flex items-center justify-between gap-3 shadow-md rounded-b-3xl">
        <img src={wbmLogo} alt="WBM Technology" className="h-9 w-auto shrink-0" />
        <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto" />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-brand-600' : 'text-red-500'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────── */}
      <div className="lg:ml-56 flex flex-col min-h-screen">
        <NotificationToast />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile) ───────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-200 border-t border-gray-300 flex z-50 rounded-t-3xl">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
