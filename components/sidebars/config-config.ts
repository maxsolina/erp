import { Building2, Settings, Users } from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Configuración — Settings, accent sky.

export const configSidebarConfig: SidebarConfig = {
  permModule: "configuracion",
  title: "Configuración",
  icon: Settings,
  accent: "sky",
  sections: [
    {
      id: "general",
      label: "General",
      icon: Building2,
      items: [
        { label: "Sucursales", href: "/sucursales", permKey: "sucursales", icon: Building2 },
      ],
    },
    {
      id: "usuarios",
      label: "Usuarios y Permisos",
      icon: Users,
      items: [
        { label: "Usuarios", href: "/usuarios", permKey: "usuarios", icon: Users },
      ],
    },
  ],
}
