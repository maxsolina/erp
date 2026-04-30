import { type SidebarConfig } from "./_shared"

// Sidebar de Ventas — todos los items apuntan a rutas top-level migradas.
// Las rutas con form complejo (OE, Remitos, Facturas, Recibos, NC, ND, Seña, Ajustes, Categorías)
// usan stubs que redirigen al monolito cuando se cargan, manteniendo URL limpia como entrada.
// Clientes y Conciliación tienen extracción real (PR 12).
// Notas de Venta: listado + ficha read-only extraídos; creación/edición sigue en el monolito.
// Listas de Precios y Toma de Equipo tienen extracción completa (PRs 5 y 6).

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
        { label: "Ajustes de Cliente", href: "/ventas/ajustes", permKey: "ajustes" },
      ],
    },
    {
      id: "ventas",
      label: "Ventas",
      items: [
        { label: "Notas de Venta", href: "/ventas/nv", permKey: "notas_venta" },
        { label: "Toma de Equipo", href: "/toma-equipo", permKey: "toma_equipo" },
        { label: "Seña de Equipo", href: "/ventas/senia-equipo", permKey: "senia_equipo" },
      ],
    },
    {
      id: "logistica",
      label: "Logística",
      items: [
        { label: "Órdenes de Entrega", href: "/ventas/oe", permKey: "ordenes_entrega" },
        { label: "Remitos", href: "/ventas/remitos", permKey: "remitos" },
      ],
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      items: [
        { label: "Facturas", href: "/ventas/facturas", permKey: "facturas" },
        { label: "Notas de Débito", href: "/ventas/nd", permKey: "notas_debito" },
        { label: "Notas de Crédito", href: "/ventas/nc", permKey: "notas_credito" },
      ],
    },
    {
      id: "cobranzas",
      label: "Cobranzas",
      items: [
        { label: "Recibos", href: "/ventas/recibos", permKey: "recibos" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Listas de Precios", href: "/listas-precios", permKey: "listas_precios" },
        { label: "Versiones de Lista", href: "/listas-precios/versiones", permKey: "listas_precios" },
        { label: "Categorías de Clientes", href: "/ventas/categorias-cliente", permKey: "categorias_cliente" },
        { label: "Criterios para cotizador", href: "/ventas/criterios-cotizador", permKey: "criterios_cotizador" },
      ],
    },
    {
      id: "config_notas_credito",
      label: "Notas de Crédito",
      items: [
        { label: "Categorías", href: "/ventas/nc-categorias", permKey: "nc_categorias" },
      ],
    },
  ],
}
