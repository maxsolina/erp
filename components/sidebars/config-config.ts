import { type SidebarConfig } from "./_shared"

// Sidebar de Configuración — replica el config sidebar de app/(dashboard)/page.tsx (~2615-2643).

export const configSidebarConfig: SidebarConfig = {
  permModule: "configuracion",
  title: "Configuración",
  sections: [
    {
      id: "general",
      label: "General",
      items: [
        { label: "Sucursales", href: "/sucursales", permKey: "sucursales" },
      ],
    },
    {
      id: "usuarios",
      label: "Usuarios y Permisos",
      items: [
        { label: "Usuarios", href: "/usuarios", permKey: "usuarios" },
      ],
    },
  ],
}
