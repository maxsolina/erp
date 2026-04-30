import { type SidebarConfig } from "./_shared"

// Sidebar de Servicio Técnico (Taller) — replica /servicio-tecnico/layout.tsx.

export const tallerSidebarConfig: SidebarConfig = {
  permModule: "servicio_tecnico",
  title: "Servicio Técnico",
  sections: [
    {
      id: "principal",
      label: "Principal",
      items: [
        { label: "Dashboard", href: "/servicio-tecnico" },
        { label: "Órdenes de Trabajo", href: "/servicio-tecnico/ot", permKey: "ordenes_trabajo" },
      ],
    },
    {
      id: "catalogos",
      label: "Catálogos",
      items: [
        { label: "Técnicos", href: "/servicio-tecnico/tecnicos", permKey: "tecnicos" },
        { label: "Equipos", href: "/servicio-tecnico/equipos", permKey: "equipos" },
        { label: "Fallas", href: "/servicio-tecnico/fallas", permKey: "fallas" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Áreas de Reparación", href: "/servicio-tecnico/areas", permKey: "areas" },
        { label: "Categorías Reparación", href: "/servicio-tecnico/categorias", permKey: "categorias_reparacion" },
        { label: "Tipos de OT", href: "/servicio-tecnico/tipos-ot", permKey: "tipos_ot" },
        { label: "Fallas por Equipos", href: "/servicio-tecnico/fallas-equipo", permKey: "fallas_equipo" },
        { label: "Turnos de Técnicos", href: "/servicio-tecnico/turnos", permKey: "turnos" },
        { label: "Feriados", href: "/servicio-tecnico/feriados", permKey: "feriados" },
        { label: "Controles / Checklist", href: "/servicio-tecnico/controles", permKey: "controles" },
        { label: "Motivos de Cierre", href: "/servicio-tecnico/motivos-cierre", permKey: "motivos_cierre" },
      ],
    },
    {
      id: "vistas",
      label: "Vistas Técnico",
      items: [
        { label: "Kanban Técnicos", href: "/servicio-tecnico/kanban", permKey: "kanban" },
      ],
    },
  ],
}
