import { type SidebarConfig } from "./_shared"

// Sidebar de Stock — replica el sidebar de app/(dashboard)/stock/layout.tsx.

export const stockSidebarConfig: SidebarConfig = {
  permModule: "stock",
  title: "Stock",
  sections: [
    {
      id: "principal",
      label: "Principal",
      items: [
        { label: "Dashboard", href: "/stock" },
      ],
    },
    {
      id: "catalogos",
      label: "Productos",
      items: [
        { label: "Productos", href: "/productos", permKey: "productos" },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones",
      items: [
        { label: "Transferencias Internas", href: "/stock/transferencias", permKey: "transferencias" },
        { label: "Pedidos de Abastecimiento", href: "/stock/pedidos-abastecimiento", permKey: "pedidos_abastecimiento" },
      ],
    },
    {
      id: "trazabilidad",
      label: "Trazabilidad",
      items: [
        { label: "Lotes y Series", href: "/stock/lotes-series", permKey: "lotes_series" },
        { label: "IMEI en Stock", href: "/stock/imei", permKey: "lotes_stock" },
      ],
    },
    {
      id: "control",
      label: "Control de Inventario",
      items: [
        { label: "Control de Inventario", href: "/stock/control-inventario", permKey: "control_inventario" },
        { label: "Ajustes Positivos", href: "/stock/ajustes/positivos", permKey: "ajustes_positivos" },
        { label: "Ajustes Negativos", href: "/stock/ajustes/negativos", permKey: "ajustes_negativos" },
      ],
    },
    {
      id: "informes",
      label: "Informes",
      items: [
        { label: "Cubo de Stock", href: "/stock/cubo", permKey: "cubo_stock" },
        { label: "Stock Reservado", href: "/stock/reservado", permKey: "stock_reservado" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Depósitos", href: "/stock/config/depositos", permKey: "config_depositos" },
        { label: "Ubicaciones", href: "/stock/config/ubicaciones", permKey: "config_ubicaciones" },
        { label: "Categorías de Ubicaciones", href: "/stock/config/categorias", permKey: "config_categorias" },
        { label: "Tipos de Operación", href: "/stock/config/tipos-operacion", permKey: "config_tipos_operacion" },
        { label: "Posiciones de Ubicaciones", href: "/stock/config/posiciones", permKey: "config_posiciones" },
        { label: "Rutas", href: "/stock/config/rutas", permKey: "config_rutas" },
        { label: "Reglas", href: "/stock/config/reglas", permKey: "config_reglas" },
      ],
    },
  ],
}
