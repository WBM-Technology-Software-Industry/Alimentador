import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

/* ─── Context ─────────────────────────────────────────────── */

type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

/* ─── Provider ────────────────────────────────────────────── */

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

/* ─── Root ────────────────────────────────────────────────── */

export const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const { collapsed } = useSidebar()
  return (
    <aside
      ref={ref}
      data-collapsed={collapsed}
      className={cn(
        'group flex flex-col h-full bg-gray-100 border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
})
Sidebar.displayName = 'Sidebar'

/* ─── Header ──────────────────────────────────────────────── */

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-2 px-4 py-4 border-b border-gray-200', className)}
    {...props}
  />
))
SidebarHeader.displayName = 'SidebarHeader'

/* ─── Content ─────────────────────────────────────────────── */

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto px-2 py-3', className)}
    {...props}
  />
))
SidebarContent.displayName = 'SidebarContent'

/* ─── Footer ──────────────────────────────────────────────── */

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-4 py-4 border-t border-gray-200', className)}
    {...props}
  />
))
SidebarFooter.displayName = 'SidebarFooter'

/* ─── Group / Label ───────────────────────────────────────── */

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-0.5', className)} {...props} />
))
SidebarGroup.displayName = 'SidebarGroup'

export const SidebarGroupLabel = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500',
      'group-data-[collapsed=true]:hidden',
      className,
    )}
    {...props}
  />
))
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

/* ─── Menu / Item ─────────────────────────────────────────── */

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn('flex flex-col gap-0.5 list-none m-0 p-0', className)} {...props} />
))
SidebarMenu.displayName = 'SidebarMenu'

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
))
SidebarMenuItem.displayName = 'SidebarMenuItem'

/* ─── MenuButton ──────────────────────────────────────────── */

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, asChild, isActive, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          'text-gray-500 hover:text-gray-800 hover:bg-gray-200',
          isActive && 'bg-brand-600 text-[#1A1A1A] hover:bg-brand-600 hover:text-[#1A1A1A]',
          'group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-2',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    )
  },
)
SidebarMenuButton.displayName = 'SidebarMenuButton'

/* ─── Trigger (collapse toggle) ───────────────────────────── */

export function SidebarTrigger({ className }: { className?: string }) {
  const { collapsed, setCollapsed } = useSidebar()
  return (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors',
        className,
      )}
      aria-label="Toggle sidebar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={cn('transition-transform duration-300', collapsed ? 'rotate-180' : '')}
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
        <path d="m16 15-3-3 3-3" />
      </svg>
    </button>
  )
}
