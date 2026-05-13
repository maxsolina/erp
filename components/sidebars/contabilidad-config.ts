import {
  BookOpen,
  Calculator,
  Calendar,
  ClipboardList,
  Coins,
  DollarSign,
  FileText,
  Globe,
  Layers,
  PieChart,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Contabilidad — Calculator, accent indigo.

export const contabilidadSidebarConfig: SidebarConfig = {
  permModule: "contabilidad",
  title: "Contabilidad",
  icon: Calculator,
  accent: "indigo",
  sections: [
    {
      id: "asientos",
      label: "Asientos",
      icon: FileText,
      items: [
        { label: "Asientos Automáticos", href: "/contabilidad/asientos-automaticos", icon: FileText },
        { label: "Asientos Manuales", href: "/contabilidad/asientos-manuales", icon: ClipboardList },
      ],
    },
    {
      id: "informes",
      label: "Informes",
      icon: BookOpen,
      items: [
        { label: "Libro Mayor", href: "/contabilidad/libro-mayor", icon: BookOpen },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones",
      icon: Layers,
      items: [
        { label: "Facturaciones", href: "/contabilidad/facturaciones", icon: FileText },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      items: [
        { label: "Plan de Cuentas", href: "/contabilidad/plan-cuentas", icon: Layers },
        { label: "Tipos de Cuenta", href: "/contabilidad/tipos-cuenta", icon: Layers },
        { label: "Diarios", href: "/contabilidad/diarios", icon: BookOpen },
        { label: "Valores de Caja", href: "/contabilidad/valores-caja", icon: Wallet },
        { label: "Períodos", href: "/contabilidad/periodos", icon: Calendar },
        { label: "Años Fiscales", href: "/contabilidad/anos-fiscales", icon: Calendar },
        { label: "Monedas", href: "/contabilidad/monedas", icon: Coins },
        { label: "Tipos de Cotización", href: "/contabilidad/tipos-cotizacion", icon: DollarSign },
      ],
    },
  ],
}
