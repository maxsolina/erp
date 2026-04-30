import { type SidebarConfig } from "./_shared"

// Sidebar de Compras — replica menuSections de components/modulo-compras-v2.tsx (~1759-1800).
// Items migrados → ruta top-level. Items todavía en el monolito → /?module=compras&view=<id>.

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
        { label: "Conciliación de Deuda", href: "/?module=compras&view=conciliacion_deuda", matchView: "conciliacion_deuda", permKey: "conciliacion_deuda" },
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
        { label: "Facturas de Compra", href: "/?module=compras&view=facturas_compra", matchView: "facturas_compra", permKey: "facturas_compra" },
        { label: "Notas de Crédito", href: "/?module=compras&view=nc_compra", matchView: "nc_compra", permKey: "nc_compra" },
        { label: "Notas de Débito", href: "/?module=compras&view=nd_compra", matchView: "nd_compra", permKey: "nd_compra" },
        { label: "Legajos de Importación", href: "/?module=compras&view=legajos_importacion", matchView: "legajos_importacion", permKey: "legajos_importacion" },
        { label: "Despachos Simples", href: "/?module=compras&view=despachos_simples", matchView: "despachos_simples", permKey: "despachos_simples" },
      ],
    },
    {
      id: "pagos",
      label: "Pagos",
      items: [
        { label: "Órdenes de Pago", href: "/?module=compras&view=ordenes_pago", matchView: "ordenes_pago", permKey: "ordenes_pago" },
      ],
    },
  ],
}
