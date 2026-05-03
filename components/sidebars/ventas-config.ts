import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Layers,
  Package,
  Receipt,
  RefreshCw,
  Repeat,
  Smartphone,
  Tag,
  Truck,
  Users,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Ventas — replica la estética del monolito (DollarSign emerald).
// Icons + secciones colapsables.

export const ventasSidebarConfig: SidebarConfig = {
  permModule: "ventas",
  title: "Ventas",
  icon: DollarSign,
  accent: "emerald",
  sections: [
    {
      id: "clientes",
      label: "Clientes",
      icon: Users,
      items: [
        { label: "Clientes", href: "/ventas/clientes", permKey: "listado", icon: Users },
        { label: "Conciliación de Deuda", href: "/ventas/conciliacion", permKey: "conciliacion", icon: RefreshCw },
        { label: "Ajustes de Cliente", href: "/ventas/ajustes", permKey: "ajustes", icon: Edit },
      ],
    },
    {
      id: "ventas",
      label: "Ventas",
      icon: FileText,
      items: [
        { label: "Notas de Venta", href: "/ventas/nv", permKey: "notas_venta", icon: FileText },
        { label: "Toma de Equipo", href: "/toma-equipo", permKey: "toma_equipo", icon: Repeat },
        { label: "Seña de Equipo", href: "/ventas/senia-equipo", permKey: "senia_equipo", icon: Banknote },
      ],
    },
    {
      id: "logistica",
      label: "Logística",
      icon: Truck,
      items: [
        { label: "Órdenes de Entrega", href: "/ventas/oe", permKey: "ordenes_entrega", icon: Truck },
        { label: "Remitos", href: "/ventas/remitos", permKey: "remitos", icon: Package },
      ],
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      icon: Receipt,
      items: [
        { label: "Facturas", href: "/ventas/facturas", permKey: "facturas", icon: Receipt },
        { label: "Notas de Débito", href: "/ventas/nd", permKey: "notas_debito", icon: ArrowRight },
        { label: "Notas de Crédito", href: "/ventas/nc", permKey: "notas_credito", icon: ArrowLeft },
      ],
    },
    {
      id: "cobranzas",
      label: "Cobranzas",
      icon: CreditCard,
      items: [
        { label: "Recibos", href: "/ventas/recibos", permKey: "recibos", icon: CreditCard },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Tag,
      items: [
        { label: "Listas de Precios", href: "/listas-precios", permKey: "listas_precios", icon: Tag },
        { label: "Versiones de Lista", href: "/listas-precios/versiones", permKey: "listas_precios", icon: Layers },
        { label: "Categorías de Clientes", href: "/ventas/categorias-cliente", permKey: "categorias_cliente", icon: Users },
        { label: "Criterios para cotizador", href: "/ventas/criterios-cotizador", permKey: "criterios_cotizador", icon: Smartphone },
      ],
    },
    {
      id: "config_notas_credito",
      label: "Notas de Crédito",
      icon: FileText,
      items: [
        { label: "Categorías", href: "/ventas/nc-categorias", permKey: "nc_categorias", icon: Tag },
      ],
    },
  ],
}
