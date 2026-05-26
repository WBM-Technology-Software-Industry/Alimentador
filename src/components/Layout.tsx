import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, History, Settings } from 'lucide-react'
import { useDeviceStore } from '../store/deviceStore'
import NotificationToast from './NotificationToast'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from './ui/sidebar'
import { Separator } from './ui/separator'
import { TooltipProvider } from './ui/tooltip'
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
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 flex">

          {/* ── Sidebar (desktop) ──────────────────────── */}
          <div className="hidden lg:flex fixed top-0 left-0 h-full z-40">
            <Sidebar>
              <SidebarHeader>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2 overflow-hidden">
                    <img src={wbmLogo} alt="WBM Technology" className="h-7 w-auto group-data-[collapsed=true]:hidden" />
                    <img src={controlFeedLogo} alt="Control Feed" className="h-4 w-auto group-data-[collapsed=true]:hidden" />
                  </div>
                  <SidebarTrigger />
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
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
                  <span className={`text-xs font-medium group-data-[collapsed=true]:hidden ${connected ? 'text-brand-400' : 'text-red-400'}`}>
                    {connected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </SidebarFooter>
            </Sidebar>
          </div>

          {/* ── Content area ───────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-screen lg:ml-56 transition-all duration-300">

            {/* Header (mobile) */}
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

            {/* Desktop top bar */}
            <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={controlFeedLogo} alt="Control Feed" className="h-5 w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-400'}`} />
                <span className={`text-xs font-semibold ${connected ? 'text-brand-600' : 'text-red-500'}`}>
                  {connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </header>

            <NotificationToast />

            <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
              {children}
            </main>

            {/* Desktop footer */}
            <footer className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3">
                <img src={wbmLogo} alt="WBM Technology" className="h-6 w-auto" />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-gray-400">ControlFeed — Sistema de Alimentação Automática</span>
              </div>
              <span className="text-xs text-gray-300">v1.0.0</span>
            </footer>
          </div>

          {/* ── Bottom nav (mobile) ────────────────────── */}
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
      </SidebarProvider>
    </TooltipProvider>
  )
}
