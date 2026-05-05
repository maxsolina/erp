import {
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Informes — BarChart3, accent slate (gris) — heredamos "sky" porque
// no tenemos slate en el palette (queda gris-azulado, similar al card del dashboard).

export const informesSidebarConfig: SidebarConfig = {
  permModule: "reportes",
  title: "Informes",
  icon: BarChart3,
  accent: "sky",
  sections: [
    {
      id: "ventas",
      label: "Ventas",
      icon: BarChart3,
      items: [
        { label: "Cubo de Ventas", href: "/informes", icon: BarChart3 },
      ],
    },
    {
      id: "contabilidad",
      label: "Contabilidad",
      icon: TrendingUp,
      items: [
        { label: "Balance Sumas y Saldos", href: "/informes/balance-sumas-saldos", icon: TrendingUp },
        { label: "Balance General", href: "/informes/balance-general", icon: PieChart },
        { label: "Estado de Resultados", href: "/informes/estado-resultados", icon: TrendingUp },
      ],
    },
  ],
}
