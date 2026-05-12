// Tipos compartidos para Finanzas (top-level migradas).

import { useEffect, useState } from "react"

// Hook reutilizable: trae las monedas activas desde contabilidad_monedas.
// Reemplaza los <option value="ARS"/USD/EUR> hardcoded en los selects.
export interface MonedaItem { codigo: string; nombre: string }
export function useMonedas(): MonedaItem[] {
  const [monedas, setMonedas] = useState<MonedaItem[]>([])
  useEffect(() => {
    fetch("/api/contabilidad/monedas")
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => {
        if (Array.isArray(data)) {
          setMonedas(data.filter(m => m.activo).map((m: any) => ({ codigo: m.codigo, nombre: m.nombre })))
        }
      })
      .catch(() => {})
  }, [])
  return monedas
}

export interface Caja {
  id: string
  nombre: string
  codigo?: string | null
  sucursal?: string
  cierre_diario_obligatorio?: boolean
  activo: boolean
}

export interface Banco {
  id: string
  codigo: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  activo: boolean
}

export interface CuentaBancaria {
  id: string
  banco_id: string | null
  numero_cuenta: string
  cbu: string | null
  banco_nombre: string
  tipo_cuenta: "cuenta_corriente" | "caja_ahorro"
  moneda: string
  propietario: string | null
  direccion_propietario: string | null
  diario_nombre: string | null
  disponible_facturas_credito: boolean
  activo: boolean
}

export interface TipoMovimientoBancario {
  id: string
  nombre: string
  codigo_causal: string
  emite_cheques_diferidos: boolean
  emite_cheques_corrientes: boolean
  disponible_en_pagos: boolean
  disponible_en_cobros: boolean
  disponible_en_finanzas: boolean
  activo: boolean
}

export interface ConceptoRegistroCaja {
  id: string
  codigo: string
  nombre: string
  cuenta_contable_ingresos: string | null
  cuenta_contable_egresos: string | null
  requiere_observacion: boolean
  visible_en_banco: boolean
  visible_en_caja: boolean
  visible_en_ajuste_cajas: boolean
  visible_en_ajuste_banco: boolean
  visible_en_transferencias: boolean
  visible_en_cancelaciones: boolean
  activo: boolean
  // Solo presentes si el endpoint se llamó con ?con_relaciones=1 o ?for_user=
  usuario_ids?: string[]
  cuentas_permitidas?: { cuenta_codigo: string; cuenta_nombre?: string | null }[]
}

// Construye el conjunto de códigos de cuenta permitidos para un concepto:
// cabecera (ingresos + egresos) + cuentas_permitidas. Si retorna null,
// significa "sin restricción" (concepto sin reglas → permitir todas).
export function cuentasPermitidasParaConcepto(c: ConceptoRegistroCaja | undefined | null): Set<string> | null {
  if (!c) return null
  const codigos = new Set<string>()
  if (c.cuenta_contable_ingresos) codigos.add(c.cuenta_contable_ingresos)
  if (c.cuenta_contable_egresos) codigos.add(c.cuenta_contable_egresos)
  for (const cp of c.cuentas_permitidas ?? []) {
    if (cp.cuenta_codigo) codigos.add(cp.cuenta_codigo)
  }
  // Si no hay ninguna cuenta definida (ni cabecera ni permitidas), no restringimos.
  return codigos.size === 0 ? null : codigos
}

export interface TipoPrestamo {
  id: string
  nombre: string
  cuenta_prestamo: string | null
  cuenta_intereses: string | null
  cuenta_intereses_devengar: string | null
  cuenta_iva_devengar: string | null
  cuenta_percepciones_devengar: string | null
  cuenta_refinanciacion: string | null
  cuenta_preexistente: string | null
  concepto_liquidacion: string | null
  activo: boolean
}

export interface Tarjeta {
  id: number
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

export interface CargoGrupo {
  id?: number
  nombre: string
  tipo: string
  arancel: number
  es_porcentaje: boolean
  cuenta_contable: string
}

export interface GrupoTarjeta {
  id: number
  nombre: string
  banco: string | null
  tipo_movimiento: string | null
  activo: boolean
  tarjetas_ids?: number[]
  cargos?: CargoGrupo[]
}

export interface RecargoTarjeta {
  id: number
  sucursal: string | null
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  fecha_desde: string | null
  fecha_hasta: string | null
  recargo_pct: number
  dias: { lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean; dom: boolean }
  activo: boolean
}

export interface CuponTarjeta {
  id: string
  numero_cupon: string
  numero_lote: string | null
  tarjeta_nombre: string | null
  forma_pago_nombre: string | null
  cliente_nombre: string | null
  sucursal: string | null
  importe: number
  moneda: string
  fecha_ing_egr: string
  estado: "en_cartera" | "conciliado" | "rechazado" | "cancelado"
  fecha_conciliacion: string | null
  venta_numero: string | null
}

export interface ConciliacionTarjetaCargo {
  id: string
  conciliacion_id: string
  descripcion: string
  cuenta_contable: string
  importe: number
  impuestos: number
  total: number
}

export interface ConciliacionTarjeta {
  id: string
  numero: string
  grupo_tarjeta: string
  liquidacion: string
  fecha: string
  sucursal: string
  importe_conciliado: number
  importe_cargos: number
  importe_total: number
  importe_cupones_rechazados: number
  estado: "borrador" | "confirmado"
  observaciones: string
  cupones?: CuponTarjeta[]
  cargos?: ConciliacionTarjetaCargo[]
}

export interface RegistroCaja {
  id: string
  numero: string
  caja_nombre: string | null
  sucursal: string | null
  concepto_nombre: string | null
  moneda: string
  total_comprobantes: number
  total_valores: number
  fecha: string
  estado: "borrador" | "confirmado"
}

export interface RegistroBanco {
  id: string
  numero: string
  cuenta_bancaria_nombre: string | null
  sucursal: string | null
  concepto_nombre: string | null
  moneda: string
  total_comprobantes: number
  total_valores: number
  fecha: string
  estado: "borrador" | "confirmado"
}

export interface AjusteCaja {
  id: string
  numero: string
  caja_nombre: string | null
  sucursal: string | null
  concepto_nombre: string | null
  tipo_ajuste: "ingreso" | "egreso" | null
  importe: number
  fecha: string
  es_automatico: boolean
  estado: "borrador" | "publicado"
}

export interface AjusteBanco {
  id: string
  numero: string
  cuenta_bancaria_nombre: string | null
  sucursal: string | null
  concepto_nombre: string | null
  importe: number
  fecha: string
  estado: "borrador" | "ajuste_pendiente" | "publicado"
}

export interface TransferenciaCaja {
  id: string
  numero: string
  sucursal: string | null
  caja_desde_nombre: string | null
  caja_hasta_nombre: string | null
  valor_nombre: string | null
  importe: number
  fecha: string
  estado: "borrador" | "pendiente" | "publicado" | "cancelado"
}

export interface Deposito {
  id: string
  numero: string
  cuenta_bancaria_nombre: string | null
  sucursal: string | null
  caja_egreso_nombre: string | null
  importe: number
  tipo_operacion: string | null
  fecha_operacion: string | null
  estado: "borrador" | "deposito_pendiente" | "publicado"
}

export interface Extraccion {
  id: string
  numero: string
  cuenta_bancaria_nombre: string | null
  sucursal: string | null
  caja_ingreso_nombre: string | null
  importe: number
  tipo_operacion: string | null
  fecha_operacion: string | null
  estado: "borrador" | "publicado"
}

export interface TransferenciaBancaria {
  id: string
  numero: string
  desde_cuenta_nombre: string | null
  hasta_cuenta_nombre: string | null
  sucursal: string | null
  importe_origen: number
  fecha_operacion_origen: string | null
  estado: "borrador" | "publicado"
}

export interface ConversionMoneda {
  id: string
  numero: string
  caja_nombre: string | null
  sucursal: string | null
  moneda_origen: string
  importe_origen: number
  moneda_destino: string
  importe_destino: number
  cotizacion: number
  fecha: string
  estado: "borrador" | "publicado"
}

export interface Prestamo {
  id: string
  numero: string
  tipo_nombre: string | null
  entidad_nombre: string | null
  nro_prestamo: string | null
  moneda: string
  capital: number
  capital_pendiente: number
  total: number
  saldo: number
  fecha: string
  cantidad_cuotas: number
  estado: "borrador" | "pendiente" | "cerrado" | "cancelado"
}

export interface ChequeTercero {
  id: string
  numero_cheque: string
  fecha_vencimiento: string
  origen_nombre: string | null
  banco_nombre: string | null
  importe: number
  moneda: string
  caja_nombre: string | null
  fecha_ingreso: string
  estado: "en_cartera" | "negociado" | "depositado" | "endosado" | "rechazado" | "cancelado"
}

export interface ChequePropio {
  id: string
  numero_cheque: string
  fecha_emision: string
  fecha_vencimiento: string
  cuenta_bancaria_nombre: string | null
  chequera_nombre: string | null
  destino_nombre: string | null
  importe: number
  moneda: string
  estado: "emitido" | "entregado" | "cobrado" | "rechazado" | "cancelado"
}

export interface NegociacionCheques {
  id: string
  numero: string
  caja_nombre: string | null
  sucursal: string | null
  tipo_acreditacion: "neto" | "bruto"
  total_negociado: number
  total_gastos: number
  total_recibido: number
  fecha: string
  destino_tipo: "banco" | "proveedor"
  proveedor_nombre: string | null
  cuenta_bancaria_nombre: string | null
  estado: "borrador" | "en_negociacion" | "cobranza" | "liquidacion" | "finalizada" | "cancelada"
}

export interface ExtractoCaja {
  id: string
  numero: string
  caja_nombre: string | null
  sucursal: string | null
  responsable_nombre: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  estado: "abierto" | "cerrado"
}

export { formatCurrency, formatDate } from "@/lib/format"

// Estilos por estado para los listings transaccionales. La key es el valor
// del campo `estado` en la fila; el value, las clases tailwind del badge.
export const estadoBadgeClasses: Record<string, string> = {
  // genéricos
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-amber-100 text-amber-700",
  publicado: "bg-green-100 text-green-700",
  confirmado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
  // bancos
  ajuste_pendiente: "bg-amber-100 text-amber-700",
  deposito_pendiente: "bg-amber-100 text-amber-700",
  // extractos
  abierto: "bg-blue-100 text-blue-700",
  cerrado: "bg-gray-200 text-gray-700",
  // cheques
  en_cartera: "bg-amber-100 text-amber-700",
  conciliado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  negociado: "bg-indigo-100 text-indigo-700",
  depositado: "bg-blue-100 text-blue-700",
  endosado: "bg-purple-100 text-purple-700",
  // préstamos
  cerrado_loan: "bg-gray-200 text-gray-700",
  // negociaciones
  en_negociacion: "bg-amber-100 text-amber-700",
  cobranza: "bg-blue-100 text-blue-700",
  liquidacion: "bg-indigo-100 text-indigo-700",
  finalizada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
}

export function estadoBadgeClass(estado: string | null | undefined): string {
  if (!estado) return "bg-gray-100 text-gray-500"
  return estadoBadgeClasses[estado] ?? "bg-gray-100 text-gray-500"
}

export function estadoLabel(estado: string | null | undefined): string {
  if (!estado) return "—"
  return estado.replace(/_/g, " ")
}
