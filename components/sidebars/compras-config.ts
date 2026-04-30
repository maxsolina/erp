import { type SidebarConfig } from "./_shared"

// Sidebar de Compras — todos los items apuntan a las rutas top-level migradas.
// Para los items con creación compleja (OC, Recepciones, Facturas, NC/ND, OP)
// las páginas listado tienen un botón "Nuevo" que redirige al monolito.
// Legajos / Despachos / Conciliación / Categorías son redirects directos al monolito.

export const comprasSidebarConfig: SidebarConfig = {
  permModule: "compras",
  title: "Compras",
  sections: [
    {
      id: "proveedores",
      label: "Proveedores",
      items: [
        { label: "Proveedores", href: "/proveedores", permKey: "proveedores" },
        { label: "Cuenta Corriente", href: "/?module=compras&view=cta_cte_proveedores", matchView: "cta_cte_proveedores", permKey: "cta_cte_proveedores" },
        { label: "Historial", href: "/?module=compras&view=historial_proveedores", matchView: "historial_proveedores", permKey: "historial_proveedores" },
        { label: "Conciliación de Deuda", href: "/compras/conciliacion-deuda", permKey: "conciliacion_deuda" },
      ],
    },
    {
      id: "compras",
      label: "Compras",
      items: [
        { label: "Órdenes de Compra", href: "/compras/oc", permKey: "ordenes_compra" },
        { label: "Recepciones", href: "/compras/recepciones", permKey: "recepciones" },
      ],
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      items: [
        { label: "Facturas de Compra", href: "/compras/facturas", permKey: "facturas_compra" },
        { label: "Notas de Crédito", href: "/compras/nc", permKey: "nc_compra" },
        { label: "Notas de Débito", href: "/compras/nd", permKey: "nd_compra" },
        { label: "Legajos de Importación", href: "/compras/legajos", permKey: "legajos_importacion" },
        { label: "Despachos Simples", href: "/compras/despachos-simples", permKey: "despachos_simples" },
      ],
    },
    {
      id: "pagos",
      label: "Pagos",
      items: [
        { label: "Órdenes de Pago", href: "/compras/op", permKey: "ordenes_pago" },
      ],
    },
    {
      id: "config",
      label: "Configuración",
      items: [
        { label: "Categorías de Proveedores", href: "/compras/categorias-proveedores", permKey: "cat_proveedores" },
      ],
    },
  ],
}
