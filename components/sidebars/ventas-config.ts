import { type SidebarConfig } from "./_shared"

// Sidebar de Ventas — replica menuSections de components/ventas-module.tsx (~2480-2547).
// Items migrados → ruta top-level. Items todavía en el monolito → /?module=ventas&view=<id>.

export const ventasSidebarConfig: SidebarConfig = {
  permModule: "ventas",
  title: "Ventas",
  sections: [
    {
      id: "clientes",
      label: "Clientes",
      items: [
        { label: "Clientes", href: "/ventas/clientes", permKey: "listado" },
        { label: "Conciliación de Deuda", href: "/ventas/conciliacion", permKey: "conciliacion" },
        { label: "Ajustes de Cliente", href: "/?module=ventas&view=ajustes", matchView: "ajustes", permKey: "ajustes" },
      ],
    },
    {
      id: "ventas",
      label: "Ventas",
      items: [
        { label: "Notas de Venta", href: "/?module=ventas&view=notas_venta", matchView: "notas_venta", permKey: "notas_venta" },
        { label: "Toma de Equipo", href: "/toma-equipo", permKey: "toma_equipo" },
        { label: "Seña de Equipo", href: "/?module=ventas&view=senia_equipo", matchView: "senia_equipo", permKey: "senia_equipo" },
      ],
    },
    {
      id: "logistica",
      label: "Logística",
      items: [
        { label: "Órdenes de Entrega", href: "/?module=ventas&view=ordenes_entrega", matchView: "ordenes_entrega", permKey: "ordenes_entrega" },
        { label: "Remitos", href: "/?module=ventas&view=remitos", matchView: "remitos", permKey: "remitos" },
      ],
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      items: [
        { label: "Facturas", href: "/?module=ventas&view=facturas", matchView: "facturas", permKey: "facturas" },
        { label: "Notas de Débito", href: "/?module=ventas&view=notas_debito", matchView: "notas_debito", permKey: "notas_debito" },
        { label: "Notas de Crédito", href: "/?module=ventas&view=notas_credito", matchView: "notas_credito", permKey: "notas_credito" },
      ],
    },
    {
      id: "cobranzas",
      label: "Cobranzas",
      items: [
        { label: "Recibos", href: "/?module=ventas&view=recibos", matchView: "recibos", permKey: "recibos" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Listas de Precios", href: "/listas-precios", permKey: "listas_precios" },
        { label: "Versiones de Lista", href: "/listas-precios/versiones", permKey: "listas_precios" },
        { label: "Categorías de Clientes", href: "/?module=ventas&view=categorias_cliente", matchView: "categorias_cliente", permKey: "categorias_cliente" },
        { label: "Criterios para cotizador", href: "/?module=ventas&view=criterios_cotizador", matchView: "criterios_cotizador", permKey: "criterios_cotizador" },
      ],
    },
    {
      id: "config_notas_credito",
      label: "Notas de Crédito",
      items: [
        { label: "Categorías", href: "/?module=ventas&view=nc_categorias", matchView: "nc_categorias", permKey: "nc_categorias" },
      ],
    },
  ],
}
