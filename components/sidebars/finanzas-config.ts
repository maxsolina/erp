import { type SidebarConfig } from "./_shared"

// Sidebar de Finanzas — todos los items son redirect-stubs al monolito.
// Replica las secciones de components/modulo-finanzas.tsx (~9454+).

export const finanzasSidebarConfig: SidebarConfig = {
  permModule: "finanzas",
  title: "Finanzas",
  sections: [
    {
      id: "banco_caja",
      label: "Banco y Caja",
      items: [
        { label: "Extractos de Caja", href: "/finanzas/extractos-caja", permKey: "extractos_caja" },
        { label: "Registros de Caja", href: "/finanzas/registros-caja", permKey: "registros_caja" },
        { label: "Ajustes de Caja", href: "/finanzas/ajustes-caja", permKey: "ajustes_caja" },
        { label: "Registros de Banco", href: "/finanzas/registros-banco", permKey: "registros_banco" },
        { label: "Ajustes de Banco", href: "/finanzas/ajustes-banco", permKey: "ajustes_banco" },
        { label: "Transferencias de Caja", href: "/finanzas/transferencias-caja", permKey: "transferencias_caja" },
        { label: "Conciliación Bancaria", href: "/finanzas/conciliacion-bancaria", permKey: "conciliacion_bancaria" },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones Financieras",
      items: [
        { label: "Depósitos", href: "/finanzas/depositos", permKey: "depositos" },
        { label: "Extracciones", href: "/finanzas/extracciones", permKey: "extracciones" },
        { label: "Transferencias Bancarias", href: "/finanzas/transferencias-bancarias", permKey: "transferencias_bancarias" },
        { label: "Conversión de Monedas", href: "/finanzas/conversion-monedas", permKey: "conversion_monedas" },
        { label: "Préstamos", href: "/finanzas/prestamos", permKey: "prestamos" },
        { label: "Negociación de Cheques", href: "/finanzas/negociacion-cheques", permKey: "negociacion_cheques" },
      ],
    },
    {
      id: "cheques",
      label: "Cheques",
      items: [
        { label: "Cheques Propios", href: "/finanzas/cheques-propios", permKey: "cheques_propios" },
        { label: "Cheques de Terceros", href: "/finanzas/cheques-terceros", permKey: "cheques_terceros" },
      ],
    },
    {
      id: "tarjetas",
      label: "Tarjetas",
      items: [
        { label: "Tarjetas", href: "/finanzas/tarjetas", permKey: "tarjetas" },
        { label: "Grupos", href: "/finanzas/grupos", permKey: "grupos" },
        { label: "Recargos", href: "/finanzas/recargos", permKey: "recargos" },
        { label: "Cupones", href: "/finanzas/cupones", permKey: "cupones" },
        { label: "Conciliación de Tarjetas", href: "/finanzas/conciliacion-tarjetas", permKey: "conciliacion_tarjetas" },
        { label: "Simulador", href: "/finanzas/simulador", permKey: "simulador" },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      items: [
        { label: "Cajas", href: "/finanzas/cajas", permKey: "cajas" },
        { label: "Bancos", href: "/finanzas/bancos-config", permKey: "bancos_config" },
        { label: "Conceptos", href: "/finanzas/conceptos", permKey: "conceptos" },
        { label: "Tipos de Préstamos", href: "/finanzas/tipos-prestamos", permKey: "tipos_prestamos" },
      ],
    },
  ],
}
