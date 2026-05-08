import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, CalendarClock, History } from 'lucide-react'
import { useDeviceStore, type DeviceType } from '../store/deviceStore'
import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Início'    },
  { to: '/estoque',   icon: Package,         label: 'Estoque'   },
  { to: '/agenda',    icon: CalendarClock,   label: 'Agenda'    },
  { to: '/historico', icon: History,         label: 'Histórico' },
]

const types: { value: DeviceType; icon: string; label: string }[] = [
  { value: 'cao',   icon: '🐾', label: 'Cão'   },
  { value: 'peixe', icon: '🐟', label: 'Peixe' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const connected    = useDeviceStore((s) => s.connected)
  const deviceType   = useDeviceStore((s) => s.deviceType)
  const setDeviceType = useDeviceStore((s) => s.setDeviceType)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-[#1A1A1A] px-4 py-2 flex items-center justify-between gap-3 shadow-md">
        <img src={wbmLogo} alt="WBM Technology" className="h-9 w-auto shrink-0" />

        {/* Tipo de alimentador */}
        <div className="flex bg-[#2a2a2a] rounded-full p-0.5 gap-0.5">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setDeviceType(t.value)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                deviceType === t.value
                  ? 'bg-brand-600 text-[#1A1A1A]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-brand-500' : 'text-red-400'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#1A1A1A] border-t border-[#2a2a2a] flex z-50">
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
