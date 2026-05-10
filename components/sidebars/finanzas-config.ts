import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BookOpen,
  Calculator,
  CreditCard,
  Building2,
  FileText,
  Landmark,
  Layers,
  Percent,
  Receipt,
  RefreshCw,
  Repeat,
  Settings,
  Shuffle,
  Tag,
  Wallet,
} from "lucide-react"
import { type SidebarConfig } from "./_shared"

// Sidebar de Finanzas — Wallet, accent purple.

export const finanzasSidebarConfig: SidebarConfig = {
  permModule: "finanzas",
  title: "Finanzas",
  icon: Wallet,
  accent: "purple",
  sections: [
    {
      id: "cajas",
      label: "Cajas",
      icon: Wallet,
      items: [
        { label: "Extractos de Caja", href: "/finanzas/extractos-caja", permKey: "extractos_caja", icon: FileText },
        { label: "Registros de Caja", href: "/finanzas/registros-caja", permKey: "registros_caja", icon: Wallet },
        { label: "Ajustes de Caja", href: "/finanzas/ajustes-caja", permKey: "ajustes_caja", icon: RefreshCw },
        { label: "Transferencias de Caja", href: "/finanzas/transferencias-caja", permKey: "transferencias_caja", icon: Repeat },
      ],
    },
    {
      id: "bancos",
      label: "Bancos",
      icon: Landmark,
      items: [
        { label: "Movimientos Bancarios", href: "/finanzas/movimientos-bancarios", permKey: "movimientos_bancarios", icon: BookOpen },
        { label: "Registros de Banco", href: "/finanzas/registros-banco", permKey: "registros_banco", icon: Landmark },
        { label: "Ajustes de Banco", href: "/finanzas/ajustes-banco", permKey: "ajustes_banco", icon: RefreshCw },
        { label: "Conciliación Bancaria", href: "/finanzas/conciliacion-bancaria", permKey: "conciliacion_bancaria", icon: RefreshCw },
      ],
    },
    {
      id: "operaciones",
      label: "Operaciones Financieras",
      icon: Banknote,
      items: [
        { label: "Depósitos", href: "/finanzas/depositos", permKey: "depositos", icon: ArrowDownToLine },
        { label: "Extracciones", href: "/finanzas/extracciones", permKey: "extracciones", icon: ArrowUpFromLine },
        { label: "Transferencias Bancarias", href: "/finanzas/transferencias-bancarias", permKey: "transferencias_bancarias", icon: Shuffle },
        { label: "Conversión de Monedas", href: "/finanzas/conversion-monedas", permKey: "conversion_monedas", icon: Calculator },
        { label: "Préstamos", href: "/finanzas/prestamos", permKey: "prestamos", icon: Banknote },
        { label: "Negociación de Cheques", href: "/finanzas/negociacion-cheques", permKey: "negociacion_cheques", icon: FileText },
      ],
    },
    {
      id: "cheques",
      label: "Cheques",
      icon: Receipt,
      items: [
        { label: "Cheques Propios", href: "/finanzas/cheques-propios", permKey: "cheques_propios", icon: FileText },
        { label: "Cheques de Terceros", href: "/finanzas/cheques-terceros", permKey: "cheques_terceros", icon: FileText },
      ],
    },
    {
      id: "tarjetas",
      label: "Tarjetas",
      icon: CreditCard,
      items: [
        { label: "Tarjetas", href: "/finanzas/tarjetas", permKey: "tarjetas", icon: CreditCard },
        { label: "Grupos", href: "/finanzas/grupos", permKey: "grupos", icon: Layers },
        { label: "Recargos", href: "/finanzas/recargos", permKey: "recargos", icon: Percent },
        { label: "Cupones", href: "/finanzas/cupones", permKey: "cupones", icon: Tag },
        { label: "Conciliación de Tarjetas", href: "/finanzas/conciliacion-tarjetas", permKey: "conciliacion_tarjetas", icon: RefreshCw },
        { label: "Simulador", href: "/finanzas/simulador", permKey: "simulador", icon: Calculator },
      ],
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      items: [
        { label: "Cajas", href: "/finanzas/cajas", permKey: "cajas", icon: Wallet },
        { label: "Bancos", href: "/finanzas/bancos-config", permKey: "bancos_config", icon: Building2 },
        { label: "Conceptos", href: "/finanzas/conceptos", permKey: "conceptos", icon: Tag },
        { label: "Tipos de Préstamos", href: "/finanzas/tipos-prestamos", permKey: "tipos_prestamos", icon: Banknote },
      ],
    },
  ],
}
