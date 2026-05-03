import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Home,
  Kanban,
  Layers,
  MapPin,
  Settings,
  Smartphone,
  Tag,
  Users,
  Wrench,
  XCircle,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Servicio Técnico — Wrench, accent rose.

export const tallerSidebarConfig: SidebarConfig = {
  permModule: "servicio_tecnico",
  title: "Servicio Técnico",
  icon: Wrench,
  accent: "rose",
  sections: [
    {
      id: "principal",
      label: "Principal",
      icon: Home,
      items: [
        { label: "Dashboard", href: "/servicio-tecnico", icon: Home },
        { label: "Órdenes de Trabajo", href: "/servicio-tecnico/ot", permKey: "ordenes_trabajo", icon: ClipboardList },
      ],
    },
    {
      id: "catalogos",
      label: "Catálogos",
      icon: Layers,
      items: [
        { label: "Técnicos", href: "/servicio-tecnico/tecnicos", permKey: "tecnicos", icon: Users },
        { label: "Equipos", href: "/servicio-tecnico/equipos", permKey: "equipos", icon: Smartphone },
        { label: "Fallas", href: "/servicio-tecnico/fallas", permKey: "fallas", icon: AlertTriangle },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      items: [
        { label: "Áreas de Reparación", href: "/servicio-tecnico/areas", permKey: "areas", icon: MapPin },
        { label: "Categorías Reparación", href: "/servicio-tecnico/categorias", permKey: "categorias_reparacion", icon: Tag },
        { label: "Tipos de OT", href: "/servicio-tecnico/tipos-ot", permKey: "tipos_ot", icon: Layers },
        { label: "Fallas por Equipos", href: "/servicio-tecnico/fallas-equipo", permKey: "fallas_equipo", icon: AlertTriangle },
        { label: "Turnos de Técnicos", href: "/servicio-tecnico/turnos", permKey: "turnos", icon: Calendar },
        { label: "Feriados", href: "/servicio-tecnico/feriados", permKey: "feriados", icon: Calendar },
        { label: "Controles / Checklist", href: "/servicio-tecnico/controles", permKey: "controles", icon: CheckSquare },
        { label: "Motivos de Cierre", href: "/servicio-tecnico/motivos-cierre", permKey: "motivos_cierre", icon: XCircle },
      ],
    },
    {
      id: "vistas",
      label: "Vistas Técnico",
      icon: Kanban,
      items: [
        { label: "Kanban Técnicos", href: "/servicio-tecnico/kanban", permKey: "kanban", icon: Kanban },
      ],
    },
  ],
}
