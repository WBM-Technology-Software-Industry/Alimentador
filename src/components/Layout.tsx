import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, History, Settings } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'
import NotificationToast from './NotificationToast'
import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'
import controlFeedLogo from '../assets/Logo ControlFeed.png'

export default function Layout({ children }: { children: React.ReactNode }) {
  const connected = useDeviceStore((s) => s.connected)
  const nav = [
    { to: '/',          icon: LayoutDashboard, label: 'Início'    },
    { to: '/estoque',   icon: Package,         label: 'Estoque'   },
    { to: '/configuracao', icon: Settings, label: 'Config'     },
    { to: '/historico',   icon: History,   label: 'Histórico'  },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-[#1A1A1A] px-4 py-2 flex items-center justify-between gap-3 shadow-md rounded-b-3xl">
        <img src={wbmLogo} alt="WBM Technology" className="h-9 w-auto shrink-0" />

        <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto" />

        {/* Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-brand-500' : 'text-red-400'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      <NotificationToast />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#1A1A1A] border-t border-[#2a2a2a] flex z-50 rounded-t-3xl">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'
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
