import {
  Archive,
  BarChart3,
  Box,
  ClipboardList,
  Hash,
  Home,
  MapPin,
  Minus,
  Package,
  Plus,
  Repeat,
  Settings,
  Smartphone,
  Truck,
  Warehouse,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Stock — Warehouse, accent orange.

export const stockSidebarConfig: SidebarConfig = {
  permModule: "stock",
  title: "Stock",
  icon: Warehouse,
  accent: "orange",
  sections: [
    {
      id: "principal",
      label: "Principal",
      icon: Home,
      items: [
        { label: "Dashboard", href: "/stock", icon: Home },
      ],
    },
    {
      id: "catalogos",
      label: "Productos",
      icon: Box,
      items: [
        { label: "Productos", href: "/productos", permKey: "productos", icon: Box },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones",
      icon: Truck,
      items: [
        { label: "Transferencias Internas", href: "/stock/transferencias", permKey: "transferencias", icon: Repeat },
        { label: "Pedidos de Abastecimiento", href: "/stock/pedidos-abastecimiento", permKey: "pedidos_abastecimiento", icon: ClipboardList },
      ],
    },
    {
      id: "trazabilidad",
      label: "Trazabilidad",
      icon: Hash,
      items: [
        { label: "Tracking de Series", href: "/stock/lotes-series", permKey: "lotes_series", icon: Hash },
        { label: "IMEI en Stock", href: "/stock/imei", permKey: "lotes_stock", icon: Smartphone },
      ],
    },
    {
      id: "control",
      label: "Control de Inventario",
      icon: Archive,
      items: [
        { label: "Control de Inventario", href: "/stock/control-inventario", permKey: "control_inventario", icon: Archive },
        { label: "Ajustes Positivos", href: "/stock/ajustes/positivos", permKey: "ajustes_positivos", icon: Plus },
        { label: "Ajustes Negativos", href: "/stock/ajustes/negativos", permKey: "ajustes_negativos", icon: Minus },
      ],
    },
    {
      id: "informes",
      label: "Informes",
      icon: BarChart3,
      items: [
        { label: "Cubo de Stock", href: "/stock/cubo", permKey: "cubo_stock", icon: BarChart3 },
        { label: "Stock Reservado", href: "/stock/reservado", permKey: "stock_reservado", icon: Package },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      items: [
        { label: "Depósitos", href: "/stock/config/depositos", permKey: "config_depositos", icon: Warehouse },
        { label: "Ubicaciones", href: "/stock/config/ubicaciones", permKey: "config_ubicaciones", icon: MapPin },
      ],
    },
  ],
}
