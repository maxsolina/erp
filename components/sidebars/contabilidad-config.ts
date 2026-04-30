import { type SidebarConfig } from "./_shared"

// Sidebar de Contabilidad — todos los items son redirect-stubs al monolito.
// Vistas extraídas del switch de components/modulo-contabilidad.tsx.

export const contabilidadSidebarConfig: SidebarConfig = {
  permModule: "contabilidad",
  title: "Contabilidad",
  sections: [
    {
      id: "asientos",
      label: "Asientos",
      items: [
        { label: "Asientos Automáticos", href: "/contabilidad/asientos-automaticos" },
        { label: "Asientos Manuales", href: "/contabilidad/asientos-manuales" },
      ],
    },
    {
      id: "informes",
      label: "Informes",
      items: [
        { label: "Libro Mayor", href: "/contabilidad/libro-mayor" },
        { label: "Libro IVA Digital", href: "/contabilidad/libro-iva-digital" },
        { label: "Balance Sumas y Saldos", href: "/contabilidad/balance-sumas-saldos" },
        { label: "Balance General", href: "/contabilidad/balance-general" },
        { label: "Estado de Resultados", href: "/contabilidad/estado-resultados" },
        { label: "Informes Contables", href: "/contabilidad/informes-contables" },
        { label: "Control Presupuestario", href: "/contabilidad/control-presupuestario" },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones",
      items: [
        { label: "Amortizaciones", href: "/contabilidad/amortizaciones" },
        { label: "Devengamientos Diferidos", href: "/contabilidad/devengamientos-diferidos" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Plan de Cuentas", href: "/contabilidad/plan-cuentas" },
        { label: "Tipos de Cuenta", href: "/contabilidad/tipos-cuenta" },
        { label: "Diarios", href: "/contabilidad/diarios" },
        { label: "Períodos", href: "/contabilidad/periodos" },
        { label: "Años Fiscales", href: "/contabilidad/anos-fiscales" },
        { label: "Monedas", href: "/contabilidad/monedas" },
        { label: "Tipos de Cotización", href: "/contabilidad/tipos-cotizacion" },
        { label: "Diagrama de Impuestos", href: "/contabilidad/diagrama-impuestos" },
      ],
    },
  ],
}
