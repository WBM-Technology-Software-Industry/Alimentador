"use client"

import * as React from "react"
import {
  Package,
  Users,
  Shield,
  Building2,
  Hammer,
  LifeBuoy,
  LayoutDashboard,
  UserCircle,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  teams: [
    { name: "WBM Technology", logo: Shield, plan: "Enterprise" },
    { name: "WBM Labs", logo: Building2, plan: "Startup" },
  ],
  navMain: [
    {
      title: "Início",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Pedidos",
      href: "/dashboard/pedidos",
      icon: Package,
      items: [
        { title: "Todos os Pedidos", href: "/dashboard/pedidos" },
        { title: "Concluídos",       href: "/dashboard/pedidos/concluidos" },
        { title: "Entregues",        href: "/dashboard/pedidos/entregues" },
      ],
    },
    {
      title: "Ordens",
      href: "/dashboard/ops",
      icon: Hammer,
      items: [
        { title: "Ordens de Produção", href: "/dashboard/ops" },
        { title: "Ordens de Serviço",  href: "/dashboard/os" },
      ],
    },
    {
      title: "Equipe",
      href: "/dashboard/team",
      icon: Users,
    },
    {
      title: "Suporte",
      href: "/dashboard/suporte",
      icon: LifeBuoy,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const name     = user?.displayName ?? user?.email?.split("@")[0] ?? "Usuário"
  const email    = user?.email ?? ""
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "U"
  const authUser = { name, email, role: "Administrador", initials, avatarUrl: user?.avatarUrl }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={authUser} />
        <p className="px-2 pb-1 text-[10px] text-muted-foreground/50 text-center select-none">
          v1.0.0
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
