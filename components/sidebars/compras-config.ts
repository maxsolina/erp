import {
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Package,
  Plane,
  Receipt,
  RefreshCw,
  Ship,
  Tag,
  Truck,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Compras — Package, accent blue (replica monolito).

export const comprasSidebarConfig: SidebarConfig = {
  permModule: "compras",
  title: "Compras",
  icon: Package,
  accent: "blue",
  sections: [
    {
      id: "proveedores",
      label: "Proveedores",
      icon: Building2,
      items: [
        { label: "Proveedores", href: "/proveedores", permKey: "proveedores", icon: Building2 },
        { label: "Cuenta Corriente", href: "/?module=compras&view=cta_cte_proveedores", matchView: "cta_cte_proveedores", permKey: "cta_cte_proveedores", icon: CreditCard },
        { label: "Historial", href: "/?module=compras&view=historial_proveedores", matchView: "historial_proveedores", permKey: "historial_proveedores", icon: Clock },
        { label: "Conciliación de Deuda", href: "/compras/conciliacion-deuda", permKey: "conciliacion_deuda", icon: RefreshCw },
      ],
    },
    {
      id: "compras",
      label: "Compras",
      icon: Package,
      items: [
        { label: "Órdenes de Compra", href: "/compras/oc", permKey: "ordenes_compra", icon: FileText },
        { label: "Recepciones", href: "/compras/recepciones", permKey: "recepciones", icon: Truck },
      ],
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      icon: Receipt,
      items: [
        { label: "Facturas de Compra", href: "/compras/facturas", permKey: "facturas_compra", icon: Receipt },
        { label: "Notas de Crédito", href: "/compras/nc", permKey: "nc_compra", icon: FileText },
        { label: "Notas de Débito", href: "/compras/nd", permKey: "nd_compra", icon: FileText },
        { label: "Legajos de Importación", href: "/compras/legajos", permKey: "legajos_importacion", icon: Ship },
        { label: "Despachos Simples", href: "/compras/despachos-simples", permKey: "despachos_simples", icon: Plane },
      ],
    },
    {
      id: "pagos",
      label: "Pagos",
      icon: DollarSign,
      items: [
        { label: "Órdenes de Pago", href: "/compras/op", permKey: "ordenes_pago", icon: DollarSign },
      ],
    },
    {
      id: "config",
      label: "Configuración",
      icon: Tag,
      items: [
        { label: "Categorías de Proveedores", href: "/compras/categorias-proveedores", permKey: "cat_proveedores", icon: Tag },
      ],
    },
  ],
}
