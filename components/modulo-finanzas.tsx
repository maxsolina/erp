"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useERP } from "@/contexts/erp-context"
import { createClient } from "@/lib/supabase/client"
import {
  Plus, Trash2, Edit, X, Check, Search, ChevronDown, AlertCircle,
  CreditCard, Building2, Percent, Calendar, ToggleLeft, ToggleRight,
  Calculator, Info, Receipt, Lock, ChevronRight, Wallet, ArrowRightLeft,
  FileCheck, Settings, DollarSign, Landmark, BookOpen, Banknote,
  ArrowDownUp, RefreshCw, Download, Eye, Filter
} from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import { ModalMedioPago } from "./modal-medio-pago"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Tarjeta {
  id: number
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

export interface CargosGrupo {
  id: number
  nombre: string
  tipo: string
  arancel: number
  es_porcentaje: boolean
  cuenta_contable: string
}

export interface GrupoTarjeta {
  id: number
  nombre: string
  banco: string
  tipo_movimiento: string
  activo: boolean
  tarjetas_ids: number[]
  cargos: CargosGrupo[]
}

export interface RecargoTarjeta {
  id: number
  sucursal: string
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  fecha_desde: string
  fecha_hasta: string
  recargo_pct: number
  dias: { lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean; dom: boolean }
  activo: boolean
}

// ─── Types Cajas ───────────────────────────────────────────────────────────

interface CajaValor {
  id: string
  caja_id: string
  codigo: string
  nombre: string
  tipo: 'efectivo' | 'banco_cheques'
  subtipo?: string | null
  moneda: string
  activo: boolean
  cuenta_contable_id?: string | null  // DEBE (débito en cobros)
  cuenta_haber_id?: string | null     // HABER predeterminado
}

interface CajaUsuario {
  id: string
  caja_id: string
  usuario_id: string
  usuario_nombre: string
  es_cobrador: boolean
  es_vendedor: boolean
  para_transferencias: boolean
}

interface CajaBancoPermitido {
  id: string
  caja_id: string
  banco_nombre: string
  codigo: string
  tipo: string
  moneda: string
}

interface Caja {
  id: string
  nombre: string
  codigo: string
  sucursal: string
  cierre_diario_obligatorio: boolean
  no_valida_cierre_sabados: boolean
  no_valida_cierre_domingos: boolean
  no_valida_cierre_feriados: boolean
  activo: boolean
  valores?: CajaValor[]
  usuarios?: CajaUsuario[]
  bancos_permitidos?: CajaBancoPermitido[]
}

// ─── Types Extractos ───────────────────────────────────────────────────────

interface ExtractoSaldo {
  id: string
  extracto_id: string
  valor_id: string
  valor_nombre: string
  valor_codigo: string
  moneda: string
  saldo_apertura: number
  saldo_cierre_ingresado: number | null
  transacciones?: number
  saldo_estimado?: number
}

interface MovimientoCaja {
  id: string
  extracto_id: string
  valor_id: string
  valor_nombre: string
  tipo_movimiento: 'ingreso' | 'egreso'
  importe: number
  moneda: string
  concepto: string
  documento_origen_tipo: string | null
  documento_origen_id: string | null
  documento_origen_numero: string | null
  estado_movimiento?: string | null
  fecha: string
}

interface ExtractoCaja {
  id: string
  numero: string
  caja_id: string
  caja_nombre: string
  sucursal: string
  responsable_id: string | null
  responsable_nombre: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  estado: 'abierto' | 'cerrado'
  saldos?: ExtractoSaldo[]
  movimientos?: MovimientoCaja[]
}

// ─── Types Registros & Ajustes ─────────────────────────────────────────────

interface ConceptoRegistroCaja {
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
}

interface RegistroCajaComprobante {
  id: string
  registro_id: string
  tipo: string
  comprobante: string
  proveedor_nombre: string
  descripcion: string
  cuenta_contable: string
  cuenta_analitica: string
  importe: number
  impuestos: number
  total: number
}

interface RegistroCajaValor {
  id: string
  registro_id: string
  valor_id: string
  valor_nombre: string
  importe_comprobante: number
  moneda_comprobante: string
  importe: number
  moneda: string
}

interface RegistroCaja {
  id: string
  numero: string
  caja_id: string
  caja_nombre: string
  sucursal: string
  concepto_id: string
  concepto_nombre: string
  moneda: string
  total_comprobantes: number
  total_valores: number
  fecha: string
  fecha_probable_pago: string | null
  estado: 'borrador' | 'confirmado'
  observaciones: string
  comprobantes?: RegistroCajaComprobante[]
  valores?: RegistroCajaValor[]
}

interface AjusteValorLinea {
  id?: string
  ajuste_id?: string
  valor_id: string
  valor_nombre: string
  tipo_movimiento: 'entrada' | 'salida'
  importe: number
}

interface AjusteCaja {
  id: string
  numero: string
  concepto_id: string
  concepto_nombre: string
  importe: number
  valor_id?: string
  valor_nombre?: string
  tipo_ajuste?: 'ingreso' | 'egreso'
  fecha: string
  sucursal: string
  caja_id: string
  caja_nombre: string
  cuenta_analitica: string
  es_automatico: boolean
  observaciones: string
  estado: 'borrador' | 'publicado'
}

interface RegistroBanco {
  id: string
  numero: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  sucursal: string
  concepto_id: string
  concepto_nombre: string
  moneda: string
  total_comprobantes: number
  total_valores: number
  fecha: string
  fecha_probable_pago: string | null
  estado: 'borrador' | 'confirmado'
  observaciones: string
  comprobantes?: RegistroCajaComprobante[]
  valores?: { id: string; registro_id: string; nombre: string; importe_comprobante: number; moneda_comprobante: string; importe: number; moneda: string }[]
}

interface AjusteBanco {
  id: string
  numero: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  concepto_id: string
  concepto_nombre: string
  importe: number
  fecha: string
  sucursal: string
  cuenta_analitica: string
  observaciones: string
  estado: 'borrador' | 'ajuste_pendiente' | 'publicado'
}

interface TransferenciaCajaValor {
  id: string
  transferencia_id: string
  valor_id: string
  valor_nombre: string
  importe: number
}

interface TransferenciaCaja {
  id: string
  numero: string
  sucursal: string
  caja_desde_id: string
  caja_desde_nombre: string
  caja_hasta_id: string
  caja_hasta_nombre: string
  valor_id: string
  valor_nombre: string
  importe: number
  concepto: string
  fecha: string
  estado: 'borrador' | 'pendiente' | 'publicado' | 'cancelado'
  comprobante_salida_id: string | null
  comprobante_entrada_id: string | null
  observaciones: string
  valores?: TransferenciaCajaValor[]
}

interface CuentaBancaria {
  id: string
  numero_cuenta: string
  cbu: string | null
  banco_nombre: string
  tipo_cuenta: 'cuenta_corriente' | 'caja_ahorro'
  moneda: string
  propietario: string
  diario_nombre: string
  activo: boolean
}

interface DepositoValor {
  id: string
  deposito_id: string
  valor_id: string
  valor_nombre: string
  importe: number
}

interface Deposito {
  id: string
  numero: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  importe: number
  sucursal: string
  caja_egreso_id: string
  caja_egreso_nombre: string
  tipo_operacion: string
  numero_operacion: string | null
  fecha_operacion: string | null
  observaciones: string
  estado: 'borrador' | 'deposito_pendiente' | 'publicado'
  valores?: DepositoValor[]
}

interface ExtraccionValor {
  id: string
  extraccion_id: string
  valor_id: string
  valor_nombre: string
  importe: number
}

interface Extraccion {
  id: string
  numero: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  importe: number
  sucursal: string
  caja_ingreso_id: string
  caja_ingreso_nombre: string
  tipo_operacion: string
  numero_operacion: string | null
  fecha_operacion: string | null
  observaciones: string
  estado: 'borrador' | 'publicado'
  valores?: ExtraccionValor[]
}

interface TransferenciaBancaria {
  id: string
  numero: string
  desde_cuenta_id: string
  desde_cuenta_nombre: string
  hasta_cuenta_id: string
  hasta_cuenta_nombre: string
  sucursal: string
  importe_origen: number
  tipo_operacion_origen: string
  numero_operacion_origen: string | null
  fecha_operacion_origen: string | null
  tipo_operacion_destino: string
  numero_operacion_destino: string | null
  fecha_operacion_destino: string | null
  observaciones: string
  estado: 'borrador' | 'publicado'
}

interface ConversionMoneda {
  id: string
  numero: string
  caja_id: string
  caja_nombre: string
  sucursal: string
  valor_origen_id: string
  valor_origen_nombre: string
  moneda_origen: string
  importe_origen: number
  valor_destino_id: string
  valor_destino_nombre: string
  moneda_destino: string
  importe_destino: number
  tipo_cotizacion: string
  cotizacion: number
  diferencia_redondeo: number
  fecha: string
  observaciones: string
  estado: 'borrador' | 'publicado'
}

interface TipoPrestamo {
  id: string
  nombre: string
  cuenta_prestamo: string
  cuenta_intereses: string
  cuenta_intereses_devengar: string | null
  cuenta_iva_devengar: string | null
  cuenta_percepciones_devengar: string | null
  cuenta_refinanciacion: string | null
  cuenta_preexistente: string | null
  concepto_liquidacion: string | null
  activo: boolean
}

interface Banco {
  id: string
  codigo: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  activo: boolean
}

interface Chequera {
  id: string
  cuenta_bancaria_id: string
  nombre: string
  tipo: 'diferidos' | 'corrientes'
  desde_numero: number
  hasta_numero: number
  proximo_numero: number
  estado: 'en_uso' | 'agotada' | 'anulada'
}

interface TipoMovimientoBancario {
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

interface PrestamoCuota {
  id: string
  prestamo_id: string
  numero_cuota: number
  fecha_vencimiento: string
  capital: number
  interes: number
  iva: number
  percepciones: number
  total: number
  saldo: number
  estado: 'pendiente' | 'conciliado' | 'vencido'
  fecha_pago: string | null
}

interface PrestamoGasto {
  id: string
  prestamo_id: string
  descripcion: string
  importe: number
  cuenta_contable: string
}

interface Prestamo {
  id: string
  numero: string
  tipo_id: string
  tipo_nombre: string
  entidad_id: string
  entidad_nombre: string
  nro_prestamo: string
  moneda: string
  capital: number
  tasa_porcentaje: number
  capital_pendiente: number
  intereses_total: number
  iva: number
  percepcion_iva: number
  percepcion_iibb: number
  otros_gastos: number
  total: number
  saldo: number
  fecha: string
  sucursal: string
  caja_id: string
  caja_nombre: string
  sistema_amortizacion: 'frances' | 'aleman' | 'americano' | 'bullet'
  es_preexistente: boolean
  cantidad_cuotas: number
  periodicidad: string
  fecha_primera_cuota: string
  importe_refinanciado: number
  importe_acreditado: number
  tipo_garante: string
  garante: string
  forma_pago: string
  tipo_tasa: string
  distribucion_pago: string
  periodo_gracia: number
  estado: 'borrador' | 'pendiente' | 'cerrado' | 'cancelado'
  observaciones: string
  cuotas?: PrestamoCuota[]
}

interface ChequeTercero {
  id: string
  numero_cheque: string
  fecha_vencimiento: string
  origen_nombre: string
  banco_nombre: string
  banco_codigo: string
  serie: string
  es_electronico: boolean
  es_propio: boolean
  es_endosable: boolean
  importe: number
  moneda: string
  caja_id: string
  caja_nombre: string
  fecha_ingreso: string
  fecha_egreso: string | null
  destino_tipo: string | null
  destino_nombre: string | null
  estado: 'en_cartera' | 'negociado' | 'depositado' | 'endosado' | 'rechazado' | 'cancelado'
}

interface NegociacionGasto {
  id: string
  negociacion_id: string
  tipo: string
  cuenta_contable: string
  cuenta_analitica: string
  descripcion: string
  importe: number
  impuestos: number
  total: number
  moneda: string
}

interface NegociacionChequeItem {
  id: string
  negociacion_id: string
  cheque_id: string
  valor_nombre: string
  valor_id: string
  importe: number
}

interface NegociacionCheques {
  id: string
  numero: string
  caja_id: string
  caja_nombre: string
  tipo_acreditacion: 'neto' | 'bruto'
  total_negociado: number
  total_gastos: number
  total_recibido: number
  fecha: string
  sucursal: string
  destino_tipo: 'banco' | 'proveedor'
  proveedor_id: string | null
  proveedor_nombre: string | null
  cuenta_bancaria_id: string | null
  cuenta_bancaria_nombre: string | null
  estado: 'borrador' | 'en_negociacion' | 'cobranza' | 'liquidacion' | 'finalizada' | 'cancelada'
  observaciones: string
}

interface MovimientoBancoConciliacion {
  id: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  tipo_movimiento: 'ingreso' | 'egreso'
  importe: number
  moneda: string
  tipo_operacion: string
  numero_operacion: string | null
  fecha_operacion: string | null
  chequera: string | null
  numero_cheque: string | null
  concepto: string
  documento_origen_tipo: string
  documento_origen_numero: string | null
  conciliado: boolean
  fecha_conciliacion: string | null
  fecha_creacion: string
}

interface FiltrosConciliacion {
  cuentaBancariaId: string
  desde: string
  hasta: string
  tipoFecha: 'fecha_operacion' | 'fecha_creacion'
  sucursales: string[]
  tiposMovimiento: string[]
  incluirNoClasificados: boolean
  soloConciliados: boolean | null
}

interface MetricasConciliacion {
  saldoEntreFechas: number
  saldoActual: number
  totalConciliados: number
  totalNoConciliados: number
  cantidadModificados: number
}

interface CuponTarjeta {
  id: string
  numero_cupon: string
  numero_lote: string | null
  tarjeta_nombre: string
  forma_pago_nombre: string
  cliente_nombre: string
  sucursal: string
  importe: number
  moneda: string
  fecha_ing_egr: string
  estado: 'en_cartera' | 'conciliado' | 'rechazado' | 'cancelado'
  fecha_conciliacion: string | null
  venta_numero: string | null
  conciliado?: boolean
  rechazado?: boolean
}

interface ConciliacionTarjetaCargo {
  id: string
  conciliacion_id: string
  descripcion: string
  cuenta_contable: string
  importe: number
  impuestos: number
  total: number
}

interface ConciliacionTarjeta {
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
  estado: 'borrador' | 'confirmado'
  observaciones: string
  cupones?: CuponTarjeta[]
  cargos?: ConciliacionTarjetaCargo[]
}

// ─── Initial Data ───────────────────────────────────────────────────────────

export const tarjetasIniciales: Tarjeta[] = [
  { id: 1, nombre: "Visa", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true },
  { id: 2, nombre: "Mastercard", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true },
  { id: 3, nombre: "American Express", tipo: "credito", dias_presentacion: 7, dias_pago: 21, activa: true },
  { id: 4, nombre: "Cabal", tipo: "credito", dias_presentacion: 5, dias_pago: 15, activa: true },
  { id: 5, nombre: "Naranja", tipo: "credito", dias_presentacion: 5, dias_pago: 15, activa: true },
  { id: 6, nombre: "Visa Electron", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 7, nombre: "Master Debit", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 8, nombre: "Maestro", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 9, nombre: "Cabal Débito", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
]

export const gruposIniciales: GrupoTarjeta[] = [
  {
    id: 1, nombre: "Viumi", banco: "Banco Macro CC ARS", tipo_movimiento: "Acreditación de Tarjeta", activo: true,
    tarjetas_ids: [1, 2, 6, 7],
    cargos: [
      { id: 1, nombre: "Comisión", tipo: "Gasto", arancel: 2.75, es_porcentaje: true, cuenta_contable: "Comisiones Tarjeta" },
      { id: 2, nombre: "IVA sobre comisión", tipo: "Gasto", arancel: 21, es_porcentaje: true, cuenta_contable: "IVA Crédito Fiscal" },
    ]
  },
  {
    id: 2, nombre: "Payway", banco: "Banco Galicia ARS", tipo_movimiento: "Acreditación de Tarjeta", activo: true,
    tarjetas_ids: [1, 2, 3, 6, 7],
    cargos: [
      { id: 1, nombre: "Comisión", tipo: "Gasto", arancel: 2.5, es_porcentaje: true, cuenta_contable: "Comisiones Tarjeta" },
      { id: 2, nombre: "IVA sobre comisión", tipo: "Gasto", arancel: 21, es_porcentaje: true, cuenta_contable: "IVA Crédito Fiscal" },
      { id: 3, nombre: "Retención IIBB", tipo: "Gasto", arancel: 3, es_porcentaje: true, cuenta_contable: "Retenciones IIBB" },
    ]
  },
]

export const recargosIniciales: RecargoTarjeta[] = [
  {
    id: 1, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 1, hasta_cuota: 1, fecha_desde: "2026-01-01", fecha_hasta: "2026-12-31",
    recargo_pct: 0, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 2, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 2, hasta_cuota: 3, fecha_desde: "2026-01-01", fecha_hasta: "2026-12-31",
    recargo_pct: 9, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 3, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 4, hasta_cuota: 6, fecha_desde: "2026-01-01", fecha_hasta: "2026-12-31",
    recargo_pct: 18, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 4, sucursal: "Puerto Norte", tarjeta_id: 2, grupo_id: 1,
    desde_cuota: 1, hasta_cuota: 3, fecha_desde: "2026-01-01", fecha_hasta: "2026-12-31",
    recargo_pct: 8, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPct(n: number) {
  return `${n.toFixed(2)}%`
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)
}

const DIAS_LABELS = [
  { key: "lun", label: "L" }, { key: "mar", label: "M" }, { key: "mie", label: "X" },
  { key: "jue", label: "J" }, { key: "vie", label: "V" }, { key: "sab", label: "S" },
  { key: "dom", label: "D" },
] as const

// SUCURSALES se obtiene del contexto ERP
const CUOTAS_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-amber-900">{title}</h2>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "emerald" | "blue" | "amber" | "red" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>{children}</span>
}

// ─── Sección Tarjetas ────────────────────────────────────────────────────────

function SeccionTarjetas({ tarjetas, setTarjetas }: { tarjetas: Tarjeta[]; setTarjetas: React.Dispatch<React.SetStateAction<Tarjeta[]>> }) {
  const [editando, setEditando] = useState<Tarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<Tarjeta>>({})

  const abrirCrear = () => {
    setForm({ nombre: "", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true })
    setCreando(true)
    setEditando(null)
  }

  const abrirEditar = (t: Tarjeta) => {
    setForm({ ...t })
    setEditando(t)
    setCreando(false)
  }

  const guardar = async () => {
    if (!form.nombre?.trim()) return
    try {
      if (creando) {
        const res = await fetch("/api/tarjetas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al crear tarjeta" }))
          alert(`No se pudo crear la tarjeta: ${err.error}`)
          return
        }
        const nueva = await res.json()
        setTarjetas(prev => [nueva, ...prev])
      } else if (editando) {
        const res = await fetch(`/api/tarjetas/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al actualizar tarjeta" }))
          alert(`No se pudo actualizar la tarjeta: ${err.error}`)
          return
        }
        const actualizada = await res.json()
        setTarjetas(prev => prev.map(t => t.id === editando.id ? actualizada : t))
      }
      setCreando(false)
      setEditando(null)
      setForm({})
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }

  const eliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar esta tarjeta? Esta acción no se puede deshacer.")) return
    try {
      const res = await fetch(`/api/tarjetas/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al eliminar tarjeta" }))
        alert(`No se pudo eliminar: ${err.error}`)
        return
      }
      setTarjetas(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div>
      <SectionHeader title="Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors">
          <Plus className="w-4 h-4" /> Nueva Tarjeta
        </button>
      </SectionHeader>

      {/* Form inline */}
      {(creando || editando) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-4">{creando ? "Nueva Tarjeta" : "Editar Tarjeta"}</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.tipo || "credito"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as "credito" | "debito" }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días presentación</label>
              <input type="number" value={form.dias_presentacion ?? ""} onChange={e => setForm(f => ({ ...f, dias_presentacion: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días pago</label>
              <input type="number" value={form.dias_pago ?? ""} onChange={e => setForm(f => ({ ...f, dias_pago: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
                className="rounded" />
              Activa
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={cancelar} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th>
              <th className="text-left py-3 px-4">Tipo</th>
              <th className="text-center py-3 px-4">Días Presentación</th>
              <th className="text-center py-3 px-4">Días Pago</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {tarjetas.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" /> {t.nombre}
                </td>
                <td className="py-3 px-4">
                  <Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "Crédito" : "Débito"}</Badge>
                </td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_presentacion} días</td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_pago} días</td>
                <td className="py-3 px-4 text-center">
                  <Badge color={t.activa ? "emerald" : "gray"}>{t.activa ? "Activa" : "Inactiva"}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(t)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => eliminar(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tarjetas.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay tarjetas configuradas</div>}
      </div>
    </div>
  )
}

// ─── Sección Grupos de Tarjetas ──────────────────────────────────────────────

function SeccionGrupos({ tarjetas, grupos, setGrupos }: { tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]; setGrupos: React.Dispatch<React.SetStateAction<GrupoTarjeta[]>> }) {
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoTarjeta | null>(null)
  const [tab, setTab] = useState<"tarjetas" | "cargos">("tarjetas")
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<GrupoTarjeta>>({})
  const [editandoCargo, setEditandoCargo] = useState<CargosGrupo | null>(null)
  const [creandoCargo, setCreandoCargo] = useState(false)
  const [formCargo, setFormCargo] = useState<Partial<CargosGrupo>>({})

  const abrirCrear = () => {
    setForm({ nombre: "", banco: "", tipo_movimiento: "Acreditación de Tarjeta", activo: true, tarjetas_ids: [], cargos: [] })
    setCreando(true)
    setSelectedGrupo(null)
  }

  const guardarGrupo = async () => {
    if (!form.nombre?.trim()) return
    try {
      if (creando) {
        // 1) Crear el grupo
        const res = await fetch("/api/grupos-tarjeta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            banco: form.banco ?? null,
            tipo_movimiento: form.tipo_movimiento ?? null,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al crear grupo" }))
          alert(`No se pudo crear el grupo: ${err.error}`)
          return
        }
        const creado = await res.json()
        // 2) Si tenía tarjetas o cargos pre-cargados, sincronizarlos via PUT
        if ((form.tarjetas_ids?.length || form.cargos?.length)) {
          const r2 = await fetch(`/api/grupos-tarjeta/${creado.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tarjeta_ids: form.tarjetas_ids ?? [],
              cargos: form.cargos ?? [],
            }),
          })
          if (r2.ok) {
            const completo = await r2.json()
            setGrupos(prev => [completo, ...prev])
            setSelectedGrupo(completo)
          } else {
            const nuevo = { ...creado, tarjetas_ids: [], cargos: [] } as GrupoTarjeta
            setGrupos(prev => [nuevo, ...prev])
            setSelectedGrupo(nuevo)
          }
        } else {
          const nuevo = { ...creado, tarjetas_ids: [], cargos: [] } as GrupoTarjeta
          setGrupos(prev => [nuevo, ...prev])
          setSelectedGrupo(nuevo)
        }
      } else if (selectedGrupo) {
        // Edición: PUT con todos los campos del form
        const res = await fetch(`/api/grupos-tarjeta/${selectedGrupo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            banco: form.banco ?? null,
            tipo_movimiento: form.tipo_movimiento ?? null,
            activo: form.activo,
            tarjeta_ids: form.tarjetas_ids ?? [],
            cargos: form.cargos ?? [],
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al actualizar grupo" }))
          alert(`No se pudo guardar: ${err.error}`)
          return
        }
        const actualizado = await res.json()
        setGrupos(prev => prev.map(g => g.id === selectedGrupo.id ? actualizado : g))
        setSelectedGrupo(actualizado)
      }
      setCreando(false)
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const toggleTarjeta = (id: number) => {
    const ids = form.tarjetas_ids || []
    setForm(f => ({ ...f, tarjetas_ids: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] }))
  }

  const guardarCargo = () => {
    if (!formCargo.nombre?.trim()) return
    if (creandoCargo) {
      const nuevo = { ...formCargo, id: Date.now() } as CargosGrupo
      const cargos = [...(form.cargos || []), nuevo]
      setForm(f => ({ ...f, cargos }))
    } else if (editandoCargo) {
      const cargos = (form.cargos || []).map(c => c.id === editandoCargo.id ? { ...c, ...formCargo } as CargosGrupo : c)
      setForm(f => ({ ...f, cargos }))
    }
    setCreandoCargo(false)
    setEditandoCargo(null)
    setFormCargo({})
  }

  const eliminarCargo = (id: number) => {
    setForm(f => ({ ...f, cargos: (f.cargos || []).filter(c => c.id !== id) }))
  }

  const seleccionarGrupo = (g: GrupoTarjeta) => {
    setSelectedGrupo(g)
    setForm({ ...g })
    setCreando(false)
    setTab("tarjetas")
  }

  // El botón "Guardar" de un grupo en edición usa la misma lógica que guardarGrupo
  const guardarCambios = guardarGrupo

  const eliminarGrupo = async () => {
    if (!selectedGrupo) return
    if (!window.confirm(`¿Eliminar el grupo "${selectedGrupo.nombre}"? Se borrarán también sus cargos y recargos asociados.`)) return
    try {
      const res = await fetch(`/api/grupos-tarjeta/${selectedGrupo.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al eliminar grupo" }))
        alert(`No se pudo eliminar: ${err.error}`)
        return
      }
      setGrupos(prev => prev.filter(g => g.id !== selectedGrupo.id))
      setSelectedGrupo(null)
      setForm({})
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div>
      <SectionHeader title="Grupos de Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">
          <Plus className="w-4 h-4" /> Nuevo Grupo
        </button>
      </SectionHeader>

      <div className="grid grid-cols-4 gap-6">
        {/* Lista de grupos */}
        <div className="col-span-1 space-y-2">
          {grupos.map(g => (
            <button key={g.id} onClick={() => seleccionarGrupo(g)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedGrupo?.id === g.id && !creando ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-white border-gray-200 hover:border-gray-300"}`}>
              <div className="font-medium text-sm">{g.nombre}</div>
              <div className="text-xs text-gray-500 mt-0.5">{g.banco}</div>
              <Badge color={g.activo ? "emerald" : "gray"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
            </button>
          ))}
          {grupos.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin grupos</p>}
        </div>

        {/* Detalle del grupo */}
        <div className="col-span-3">
          {(selectedGrupo || creando) ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header del grupo */}
              <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                    <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                    <input value={form.banco || ""} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm mb-1.5">
                      <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                      Activo
                    </label>
                    {creando ? (
                      <button onClick={guardarGrupo} className="ml-auto px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Crear Grupo</button>
                    ) : (
                      <div className="ml-auto flex gap-2">
                        <button onClick={eliminarGrupo} className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50">Eliminar</button>
                        <button onClick={guardarCambios} className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                {(["tarjetas", "cargos"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t === "tarjetas" ? "Tarjetas" : "Cargos"}
                  </button>
                ))}
              </div>

              {tab === "tarjetas" && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">Seleccioná las tarjetas asociadas a este grupo:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {tarjetas.map(t => (
                      <label key={t.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${(form.tarjetas_ids || []).includes(t.id) ? "bg-emerald-50 border-emerald-300" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={(form.tarjetas_ids || []).includes(t.id)} onChange={() => toggleTarjeta(t.id)} className="rounded" />
                        <span className="text-sm">{t.nombre}</span>
                        <Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "C" : "D"}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab === "cargos" && (
                <div className="p-4">
                  {(creandoCargo || editandoCargo) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del cargo</label>
                          <input value={formCargo.nombre || ""} onChange={e => setFormCargo(f => ({ ...f, nombre: e.target.value }))}
                            placeholder="Ej: Comisión, IVA, Retención IIBB"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Arancel %</label>
                          <input type="number" step="0.01" value={formCargo.arancel ?? ""} onChange={e => setFormCargo(f => ({ ...f, arancel: parseFloat(e.target.value) }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta contable</label>
                          <input value={formCargo.cuenta_contable || ""} onChange={e => setFormCargo(f => ({ ...f, cuenta_contable: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button onClick={() => { setCreandoCargo(false); setEditandoCargo(null); setFormCargo({}) }} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
                        <button onClick={guardarCargo} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Guardar cargo</button>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 px-3">Nombre</th>
                        <th className="text-right py-2 px-3">Arancel %</th>
                        <th className="text-left py-2 px-3">Cuenta Contable</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.cargos || []).map(c => (
                        <tr key={c.id} className="border-b">
                          <td className="py-2 px-3 font-medium">{c.nombre}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatPct(c.arancel)}</td>
                          <td className="py-2 px-3 text-gray-500">{c.cuenta_contable}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditandoCargo(c); setFormCargo({ ...c }); setCreandoCargo(false) }} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => eliminarCargo(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(form.cargos || []).length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin cargos configurados</p>}
                  <button onClick={() => { setCreandoCargo(true); setEditandoCargo(null); setFormCargo({ tipo: "Gasto", es_porcentaje: true }) }}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <Plus className="w-4 h-4" /> Agregar cargo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              Seleccioná un grupo para editarlo o creá uno nuevo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Recargos ────────────────────────────────────────────────────────

function SeccionRecargos({ tarjetas, grupos, recargos, setRecargos }: {
  tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]
  recargos: RecargoTarjeta[]; setRecargos: React.Dispatch<React.SetStateAction<RecargoTarjeta[]>>
}) {
  const { sucursales, sucursalActiva } = useERP()
  const [editando, setEditando] = useState<RecargoTarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<RecargoTarjeta>>({})
  const [soloActivos, setSoloActivos] = useState(true)

  const recFiltrados = useMemo(() => soloActivos ? recargos.filter(r => r.activo) : recargos, [recargos, soloActivos])

  const diasDefault = { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }

  const abrirCrear = () => {
    setForm({ sucursal: sucursalActiva?.nombre ?? sucursales[0]?.nombre ?? "", desde_cuota: 1, hasta_cuota: 1, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31", recargo_pct: 0, activo: true, dias: { ...diasDefault } })
    setCreando(true)
    setEditando(null)
  }

  const guardar = async () => {
    if (!form.tarjeta_id || !form.grupo_id) return
    try {
      if (creando) {
        const res = await fetch("/api/recargos-tarjeta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al crear recargo" }))
          alert(`No se pudo crear el recargo: ${err.error}`)
          return
        }
        const nuevo = await res.json()
        setRecargos(prev => [nuevo, ...prev])
      } else if (editando) {
        const res = await fetch(`/api/recargos-tarjeta/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error al actualizar recargo" }))
          alert(`No se pudo actualizar: ${err.error}`)
          return
        }
        const actualizado = await res.json()
        setRecargos(prev => prev.map(r => r.id === editando.id ? actualizado : r))
      }
      setCreando(false)
      setEditando(null)
      setForm({})
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }

  const eliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar este recargo?")) return
    try {
      const res = await fetch(`/api/recargos-tarjeta/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al eliminar recargo" }))
        alert(`No se pudo eliminar: ${err.error}`)
        return
      }
      setRecargos(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const tarjetaById = (id: number) => tarjetas.find(t => t.id === id)
  const grupoById = (id: number) => grupos.find(g => g.id === id)

  return (
    <div>
      <SectionHeader title="Recargos de Tarjetas">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} className="rounded" />
          Solo vigentes
        </label>
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">
          <Plus className="w-4 h-4" /> Nuevo Recargo
        </button>
      </SectionHeader>

      {(creando || editando) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-4">{creando ? "Nuevo Recargo" : "Editar Recargo"}</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={form.sucursal || ""} onChange={e => setForm(f => ({ ...f, sucursal: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta</label>
              <select value={form.tarjeta_id || ""} onChange={e => setForm(f => ({ ...f, tarjeta_id: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {tarjetas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banco / Grupo</label>
              <select value={form.grupo_id || ""} onChange={e => setForm(f => ({ ...f, grupo_id: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recargo %</label>
              <input type="number" step="0.01" value={form.recargo_pct ?? ""} onChange={e => setForm(f => ({ ...f, recargo_pct: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Desde cuota</label>
              <input type="number" min="1" value={form.desde_cuota ?? ""} onChange={e => setForm(f => ({ ...f, desde_cuota: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hasta cuota</label>
              <input type="number" min="1" value={form.hasta_cuota ?? ""} onChange={e => setForm(f => ({ ...f, hasta_cuota: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha desde</label>
              <input type="date" value={form.fecha_desde || ""} onChange={e => setForm(f => ({ ...f, fecha_desde: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input type="date" value={form.fecha_hasta || ""} onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-medium text-gray-700">Días que aplica:</span>
            {DIAS_LABELS.map(({ key, label }) => (
              <label key={key} className={`flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer text-sm font-medium transition-colors ${form.dias?.[key] ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"}`}>
                <input type="checkbox" className="hidden" checked={form.dias?.[key] ?? false}
                  onChange={e => setForm(f => ({ ...f, dias: { ...(f.dias || diasDefault), [key]: e.target.checked } }))} />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm ml-4">
              <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
              Activo
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelar} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Sucursal</th>
              <th className="text-left py-3 px-4">Tarjeta</th>
              <th className="text-left py-3 px-4">Grupo</th>
              <th className="text-center py-3 px-4">Cuotas</th>
              <th className="text-center py-3 px-4">Vigencia</th>
              <th className="text-center py-3 px-4">Recargo</th>
              <th className="text-center py-3 px-4">Días</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {recFiltrados.map(r => {
              const tarj = tarjetaById(r.tarjeta_id)
              const grp = grupoById(r.grupo_id)
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{r.sucursal}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{tarj?.nombre ?? r.tarjeta_id}</div>
                    {tarj && <Badge color={tarj.tipo === "credito" ? "blue" : "emerald"}>{tarj.tipo === "credito" ? "Crédito" : "Débito"}</Badge>}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{grp?.nombre ?? r.grupo_id}</td>
                  <td className="py-3 px-4 text-center font-mono">{r.desde_cuota === r.hasta_cuota ? `${r.desde_cuota}c` : `${r.desde_cuota}-${r.hasta_cuota}c`}</td>
                  <td className="py-3 px-4 text-center text-xs text-gray-500">{r.fecha_desde} → {r.fecha_hasta}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold text-sm ${r.recargo_pct > 0 ? "text-amber-700" : "text-gray-500"}`}>{formatPct(r.recargo_pct)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-0.5 justify-center">
                      {DIAS_LABELS.map(({ key, label }) => (
                        <span key={key} className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium ${r.dias[key] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-300"}`}>{label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge color={r.activo ? "emerald" : "gray"}>{r.activo ? "Vigente" : "Inactivo"}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditando(r); setForm({ ...r }); setCreando(false) }} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => eliminar(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {recFiltrados.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay recargos configurados</div>}
      </div>
    </div>
  )
}

// ─── Sección Simulador ───────────────────────────────────────────────────────

function SeccionSimulador({ tarjetas, grupos, recargos }: { tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]; recargos: RecargoTarjeta[] }) {
  const [tarjetaId, setTarjetaId] = useState<number | "">("")
  const [cuotas, setCuotas] = useState<number>(1)
  const [monto, setMonto] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [resultado, setResultado] = useState<null | { recargo: RecargoTarjeta; grupo: GrupoTarjeta; totalRecargo: number; desglose: { nombre: string; pct: number; importe: number }[]; totalConRecargo: number }>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  const calcular = () => {
    if (!tarjetaId || !monto) return
    const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", "."))
    const fechaDate = new Date(fecha)
    const diaSemana = fechaDate.getDay() // 0=dom, 1=lun...
    const diasKeys: (keyof RecargoTarjeta["dias"])[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]
    const diaKey = diasKeys[diaSemana]

    const candidatos = recargos.filter(r =>
      r.tarjeta_id === tarjetaId &&
      r.activo &&
      cuotas >= r.desde_cuota &&
      cuotas <= r.hasta_cuota &&
      fecha >= r.fecha_desde &&
      fecha <= r.fecha_hasta &&
      r.dias[diaKey]
    )

    if (candidatos.length === 0) { setResultado(null); setNoEncontrado(true); return }
    // Toma el más específico (menor rango de cuotas)
    const mejor = candidatos.sort((a, b) => (a.hasta_cuota - a.desde_cuota) - (b.hasta_cuota - b.desde_cuota))[0]
    const grupo = grupos.find(g => g.id === mejor.grupo_id)!
    const importeRecargo = montoNum * (mejor.recargo_pct / 100)
    const desglose = (grupo?.cargos || []).map(c => ({
      nombre: c.nombre, pct: c.arancel, importe: montoNum * (c.arancel / 100)
    }))
    const totalRecargo = importeRecargo + desglose.reduce((s, d) => s + d.importe, 0)
    setResultado({ recargo: mejor, grupo, totalRecargo, desglose: [{ nombre: `Recargo ${mejor.recargo_pct}%`, pct: mejor.recargo_pct, importe: importeRecargo }, ...desglose], totalConRecargo: montoNum + totalRecargo })
    setNoEncontrado(false)
  }

  const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", ".")) || 0

  return (
    <div>
      <SectionHeader title="Simulador de Recargos" />

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> Parámetros</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarjeta</label>
            <select value={tarjetaId} onChange={e => setTarjetaId(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">Seleccionar tarjeta...</option>
              {tarjetas.filter(t => t.activa).map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas</label>
            <div className="flex gap-2 flex-wrap">
              {CUOTAS_OPTIONS.map(c => (
                <button key={c} onClick={() => setCuotas(c)}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${cuotas === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"}`}>
                  {c}c
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto (ARS)</label>
            <input type="text" placeholder="Ej: 50000" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <button onClick={calcular} disabled={!tarjetaId || !monto}
            className="w-full py-2 bg-emerald-700 text-white rounded-md font-medium hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            Calcular recargo
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-amber-600" /> Resultado</h3>
          {!resultado && !noEncontrado && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Calculator className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Completá los parámetros y calculá</p>
            </div>
          )}
          {noEncontrado && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">No se encontró un recargo configurado para la combinación seleccionada. Verificá la configuración.</p>
            </div>
          )}
          {resultado && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Tarjeta:</span><span className="font-medium">{tarjetas.find(t => t.id === tarjetaId)?.nombre} — {cuotas} cuota{cuotas > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Grupo:</span><span className="font-medium">{resultado.grupo?.nombre}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Monto base:</span><span className="font-medium">{formatCurrency(montoNum)}</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-800 text-white text-xs font-semibold uppercase px-4 py-2">Desglose de recargo</div>
                <table className="w-full text-sm">
                  <tbody>
                    {resultado.desglose.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-4 text-gray-700">{d.nombre}</td>
                        <td className="py-2 px-4 text-right text-gray-500 font-mono">{formatPct(d.pct)}</td>
                        <td className="py-2 px-4 text-right font-medium">{formatCurrency(d.importe)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50">
                      <td className="py-2.5 px-4 font-semibold text-amber-900">Total recargo</td>
                      <td className="py-2.5 px-4"></td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700">{formatCurrency(resultado.totalRecargo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-900 rounded-lg p-4 text-white flex justify-between items-center">
                <span className="font-semibold">Total con recargo:</span>
                <span className="text-xl font-bold">{formatCurrency(resultado.totalConRecargo)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Extractos de Caja ───────────────────────────────────────────────

function SeccionExtractosCaja() {
  const [extractos, setExtractos] = useState<ExtractoCaja[]>([])
  const [cajasDisp, setCajasDisp] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [extractoSel, setExtractoSel] = useState<ExtractoCaja | null>(null)
  const [tabDetalle, setTabDetalle] = useState<"saldos" | "movimientos" | "cheques" | "cupones">("saldos")

  // Modal nuevo
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [nuevoCajaId, setNuevoCajaId] = useState("")
  const [nuevoResponsable, setNuevoResponsable] = useState("")
  const [ultimosSaldos, setUltimosSaldos] = useState<ExtractoSaldo[] | null>(null)
  const [errorNuevo, setErrorNuevo] = useState("")

  // Modal cierre
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [saldosFisicos, setSaldosFisicos] = useState<Record<string, number>>({})
  const [errorCierre, setErrorCierre] = useState("")

  // Modal detalle de valor (movimientos por valor)
  const [saldoSelDetalle, setSaldoSelDetalle] = useState<ExtractoSaldo | null>(null)

  const [guardando, setGuardando] = useState(false)

  const formatFecha = (f: string | null) =>
    f ? new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

  const formatMonto = (m: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)

  const cargarExtractos = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: extractosData } = await supabase
      .from("extractos_caja")
      .select("*")
      .order("fecha_apertura", { ascending: false })
      .limit(200)

    if (!extractosData || extractosData.length === 0) {
      setExtractos([])
      setLoading(false)
      return
    }

    const ids = extractosData.map((e: Record<string, unknown>) => e.id)
    const [saldosRes, movsRes] = await Promise.all([
      supabase.from("extracto_saldos").select("*").in("extracto_id", ids),
      supabase.from("movimientos_caja")
        .select("extracto_id, valor_id, tipo_movimiento, importe, estado_movimiento")
        .in("extracto_id", ids),
    ])

    const saldosList = saldosRes.data || []
    const movsList = movsRes.data || []

    const enriched = extractosData.map((ext: Record<string, unknown>) => {
      const extSaldos = saldosList
        .filter((s: Record<string, unknown>) => s.extracto_id === ext.id)
        .map((s: Record<string, unknown>) => {
          const extMovs = movsList.filter(
            (m: Record<string, unknown>) =>
              m.extracto_id === ext.id &&
              m.valor_id === s.valor_id &&
              m.estado_movimiento !== "cancelado"
          )
          const ingresos = extMovs
            .filter((m: Record<string, unknown>) => m.tipo_movimiento === "ingreso")
            .reduce((a: number, m: Record<string, unknown>) => a + Number(m.importe), 0)
          const egresos = extMovs
            .filter((m: Record<string, unknown>) => m.tipo_movimiento === "egreso")
            .reduce((a: number, m: Record<string, unknown>) => a + Number(m.importe), 0)
          return {
            ...s,
            transacciones: extMovs.length,
            saldo_estimado: Number(s.saldo_apertura) + ingresos - egresos,
          }
        })
      return { ...ext, saldos: extSaldos }
    })

    setExtractos(enriched as unknown as ExtractoCaja[])
    setLoading(false)
  }

  const cargarCajas = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("cajas").select("*").eq("activo", true).order("nombre")
    setCajasDisp(data || [])
  }

  useEffect(() => { cargarCajas(); cargarExtractos() }, [])

  const abrirDetalle = async (ext: ExtractoCaja) => {
    const supabase = createClient()
    const [sR, mR] = await Promise.all([
      supabase.from("extracto_saldos").select("*").eq("extracto_id", ext.id),
      supabase.from("movimientos_caja").select("*").eq("extracto_id", ext.id).order("fecha", { ascending: false }),
    ])
    let saldosData: ExtractoSaldo[] = sR.data || []
    const todosMovs: MovimientoCaja[] = mR.data || []

    // Detectar movimientos con valor_id no registrado en extracto_saldos
    // (puede ocurrir si se agregó un valor a la caja después de abrir el extracto)
    if (ext.estado === "abierto") {
      const valorIdsRegistrados = new Set(saldosData.map(s => s.valor_id))
      const valoresHuerfanos = new Map<string, MovimientoCaja>()
      for (const m of todosMovs) {
        if (m.valor_id && !valorIdsRegistrados.has(m.valor_id) && !valoresHuerfanos.has(m.valor_id)) {
          valoresHuerfanos.set(m.valor_id, m)
        }
      }
      if (valoresHuerfanos.size > 0) {
        const filasNuevas = Array.from(valoresHuerfanos.values()).map(m => ({
          extracto_id: ext.id,
          valor_id: m.valor_id,
          valor_nombre: m.valor_nombre,
          valor_codigo: m.valor_nombre, // fallback al nombre como código
          moneda: m.moneda,
          saldo_apertura: 0,
        }))
        const { data: insertados } = await supabase.from("extracto_saldos").insert(filasNuevas).select()
        if (insertados) saldosData = [...saldosData, ...insertados]
      }
    }

    const saldos = saldosData.map((s: ExtractoSaldo) => {
      const movs = todosMovs.filter((m) => m.valor_id === s.valor_id && m.estado_movimiento !== "cancelado")
      const ingresos = movs.filter((m) => m.tipo_movimiento === "ingreso").reduce((a: number, m) => a + Number(m.importe), 0)
      const egresos = movs.filter((m) => m.tipo_movimiento === "egreso").reduce((a: number, m) => a + Number(m.importe), 0)
      return { ...s, transacciones: movs.length, saldo_estimado: Number(s.saldo_apertura) + ingresos - egresos }
    })
    setExtractoSel({ ...ext, saldos, movimientos: todosMovs })
    setTabDetalle("saldos")
    setVista("detalle")
  }

  // ─── Apertura ──────────────────────────────────
  const iniciarApertura = () => {
    setNuevoCajaId("")
    setNuevoResponsable("")
    setUltimosSaldos(null)
    setErrorNuevo("")
    setMostrarNuevo(true)
  }

  const onCambiarCajaNuevo = async (cajaId: string) => {
    setNuevoCajaId(cajaId)
    setErrorNuevo("")
    setUltimosSaldos(null)
    if (!cajaId) return
    const supabase = createClient()
    const { count } = await supabase
      .from("extractos_caja").select("*", { count: "exact", head: true })
      .eq("caja_id", cajaId).eq("estado", "abierto")
    if (count && count > 0) {
      setErrorNuevo("Esta caja ya tiene un extracto abierto. Ciérrelo antes de abrir uno nuevo.")
      return
    }
    const { data: last } = await supabase
      .from("extractos_caja").select("id")
      .eq("caja_id", cajaId).eq("estado", "cerrado")
      .order("fecha_cierre", { ascending: false }).limit(1)
    if (last && last.length > 0) {
      const [saldosRes, movsRes] = await Promise.all([
        supabase.from("extracto_saldos").select("*").eq("extracto_id", last[0].id),
        supabase.from("movimientos_caja")
          .select("valor_id, tipo_movimiento, importe, estado_movimiento")
          .eq("extracto_id", last[0].id),
      ])
      const saldosConEstimado = (saldosRes.data || []).map((s: ExtractoSaldo) => {
        const movs = (movsRes.data || []).filter(
          (m: Record<string, unknown>) => m.valor_id === s.valor_id && m.estado_movimiento !== "cancelado"
        )
        const ingresos = movs
          .filter((m: Record<string, unknown>) => m.tipo_movimiento === "ingreso")
          .reduce((a: number, m: Record<string, unknown>) => a + Number(m.importe), 0)
        const egresos = movs
          .filter((m: Record<string, unknown>) => m.tipo_movimiento === "egreso")
          .reduce((a: number, m: Record<string, unknown>) => a + Number(m.importe), 0)
        return { ...s, saldo_estimado: Number(s.saldo_apertura) + ingresos - egresos }
      })
      setUltimosSaldos(saldosConEstimado)
    }
  }

  const confirmarApertura = async () => {
    if (!nuevoCajaId) { setErrorNuevo("Seleccione una caja"); return }
    if (errorNuevo) return
    setGuardando(true)
    const supabase = createClient()
    const caja = cajasDisp.find(c => c.id === nuevoCajaId)
    if (!caja) { setGuardando(false); return }
    const { data: numData } = await supabase.rpc("generar_numero_extracto", { p_sucursal: caja.sucursal })
    const { data: newExt, error } = await supabase.from("extractos_caja").insert({
      numero: numData, caja_id: caja.id, caja_nombre: caja.nombre,
      sucursal: caja.sucursal, responsable_nombre: nuevoResponsable || null, estado: "abierto",
    }).select().single()
    if (error || !newExt) { setErrorNuevo("Error al crear extracto"); setGuardando(false); return }
    const { data: valores } = await supabase.from("caja_valores").select("*").eq("caja_id", caja.id).eq("activo", true)
    if (valores && valores.length > 0) {
      // Re-consultar el último extracto cerrado directamente desde DB para evitar
      // race conditions con el estado ultimosSaldos (que puede no estar listo aún)
      let saldosCierre: Record<string, number> = {}
      const { data: lastExt } = await supabase
        .from("extractos_caja").select("id")
        .eq("caja_id", caja.id).eq("estado", "cerrado")
        .order("fecha_cierre", { ascending: false }).limit(1)
      if (lastExt && lastExt.length > 0) {
        const { data: lastSaldos } = await supabase
          .from("extracto_saldos").select("valor_id, saldo_cierre_ingresado")
          .eq("extracto_id", lastExt[0].id)
        for (const s of (lastSaldos || [])) {
          saldosCierre[s.valor_id] = s.saldo_cierre_ingresado ?? 0
        }
      }
      const filas = valores.map((v: CajaValor) => ({
        extracto_id: newExt.id, valor_id: v.id, valor_nombre: v.nombre,
        valor_codigo: v.codigo, moneda: v.moneda,
        saldo_apertura: saldosCierre[v.id] ?? 0,
      }))
      await supabase.from("extracto_saldos").insert(filas)
    }
    setMostrarNuevo(false)
    setGuardando(false)
    await cargarExtractos()
    await abrirDetalle(newExt)
  }

  // ─── Cierre ────────────────────────────────────
  const iniciarCierre = () => {
    if (!extractoSel || extractoSel.estado !== "abierto") return
    const init: Record<string, number> = {}
    extractoSel.saldos?.forEach(s => { init[s.id] = s.saldo_estimado ?? Number(s.saldo_apertura) })
    setSaldosFisicos(init)
    setErrorCierre("")
    setMostrarCierre(true)
  }

  const confirmarCierre = async () => {
    if (!extractoSel) return
    const hayDiferencia = extractoSel.saldos?.some(s => {
      const fisico = saldosFisicos[s.id] ?? 0
      const estimado = s.saldo_estimado ?? Number(s.saldo_apertura)
      return Math.abs(fisico - estimado) > 0.01
    })
    // Solo advertencia, no bloquear el cierre
    if (hayDiferencia) {
      setErrorCierre("Atención: hay diferencias entre el conteo físico y el estimado. Se registrarán los valores ingresados.")
    } else {
      setErrorCierre("")
    }
    setGuardando(true)
    const supabase = createClient()
    for (const s of (extractoSel.saldos || [])) {
      await supabase.from("extracto_saldos").update({ saldo_cierre_ingresado: saldosFisicos[s.id] ?? 0 }).eq("id", s.id)
    }
    await supabase.from("extractos_caja").update({ estado: "cerrado", fecha_cierre: new Date().toISOString() }).eq("id", extractoSel.id)
    setMostrarCierre(false)
    setGuardando(false)
    await cargarExtractos()
    setVista("lista")
  }

  // ─── VISTA LISTA ──────────────────────────────
  if (vista === "lista") {
    return (
      <div>
        <FinanzasListSection<ExtractoCaja>
          title="Extractos de Caja" subtitle="Finanzas" moduleName="finanzas_extractos_caja"
          data={extractos} loading={loading}
          searchFields={["numero", "caja_nombre", "sucursal", "responsable_nombre"]}
          filterFields={[{ field: "estado", label: "Estado" }, { field: "caja_nombre", label: "Caja" }, { field: "sucursal", label: "Sucursal" }]}
          actions={<button onClick={iniciarApertura} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Extracto</button>}
        >
          {(filtered) => (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Caja</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Responsable</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Apertura</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cierre</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Estimado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ext => (
                  <tr key={ext.id} onClick={() => abrirDetalle(ext)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{ext.numero}</td>
                    <td className="py-3 px-4 text-gray-700">{ext.caja_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{ext.sucursal}</td>
                    <td className="py-3 px-4 text-gray-600">{ext.responsable_nombre || "—"}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{formatFecha(ext.fecha_apertura)}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{formatFecha(ext.fecha_cierre)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        ext.estado === "abierto" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {ext.estado === "abierto" ? "Abierto" : "Cerrado"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ext.saldos && ext.saldos.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {ext.saldos.map((s: ExtractoSaldo) => {
                            const monto = ext.estado === "cerrado"
                              ? Number(s.saldo_cierre_ingresado ?? s.saldo_estimado ?? s.saldo_apertura)
                              : (s.saldo_estimado ?? Number(s.saldo_apertura))
                            return (
                              <span key={s.id} className="text-xs font-mono">
                                <span className="text-gray-500">{s.valor_nombre}:</span>{" "}
                                <span className={monto < 0 ? "text-red-600 font-semibold" : "text-gray-900"}>
                                  {s.moneda !== "ARS" ? s.moneda + " " : "$"}{formatMonto(monto)}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                No hay extractos con los filtros seleccionados
              </div>
            )}
          </div>
          )}
        </FinanzasListSection>

        {/* Modal Nuevo Extracto */}
        {mostrarNuevo && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-indigo-900">Nuevo Extracto de Caja</h3>
                <button onClick={() => setMostrarNuevo(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                {errorNuevo && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorNuevo}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Caja *</label>
                  <select value={nuevoCajaId} onChange={e => onCambiarCajaNuevo(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">Seleccionar caja...</option>
                    {cajasDisp.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.sucursal}</option>)}
                  </select>
                </div>
                {nuevoCajaId && !errorNuevo && (
                  <>
                    <div className="bg-gray-50 rounded-md p-3 text-sm">
                      <span className="text-gray-500">Sucursal:</span>{" "}
                      <span className="font-medium">{cajasDisp.find(c => c.id === nuevoCajaId)?.sucursal}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                      <input value={nuevoResponsable} onChange={e => setNuevoResponsable(e.target.value)}
                        placeholder="Nombre del cajero/responsable"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    {ultimosSaldos && ultimosSaldos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Saldos del último cierre (se usarán como apertura)</p>
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50">
                              <th className="text-left py-2 px-3 text-xs text-gray-500">Valor</th>
                              <th className="text-right py-2 px-3 text-xs text-gray-500">Saldo Cierre</th>
                            </tr></thead>
                            <tbody>
                              {ultimosSaldos.map(s => (
                                <tr key={s.id} className="border-t border-gray-100">
                                  <td className="py-2 px-3">{s.valor_nombre}</td>
                                  <td className="py-2 px-3 text-right font-mono">{formatMonto(Number(s.saldo_cierre_ingresado ?? s.saldo_estimado ?? 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 p-4 border-t">
                <button onClick={() => setMostrarNuevo(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarApertura} disabled={guardando || !nuevoCajaId || !!errorNuevo}
                  className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:bg-gray-300">
                  {guardando ? "Creando..." : "Abrir Extracto"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── VISTA DETALLE ─────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVista("lista")}
            className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            ← Extractos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{extractoSel?.numero}</h1>
            <p className="text-sm text-gray-500">{extractoSel?.caja_nombre} — {extractoSel?.sucursal}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            extractoSel?.estado === "abierto" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {extractoSel?.estado === "abierto" ? "Abierto" : "Cerrado"}
          </span>
        </div>
        {extractoSel?.estado === "abierto" && (
          <button onClick={iniciarCierre}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Cerrar Extracto
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Responsable</p>
          <p className="font-medium text-gray-900">{extractoSel?.responsable_nombre || "—"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Apertura</p>
          <p className="font-medium text-gray-900">{formatFecha(extractoSel?.fecha_apertura ?? null)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Cierre</p>
          <p className="font-medium text-gray-900">{formatFecha(extractoSel?.fecha_cierre ?? null)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Valores</p>
          <p className="font-medium text-gray-900">{extractoSel?.saldos?.length || 0} valores</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 px-4">
          {([
            { id: "saldos" as const, label: "Saldos" },
            { id: "movimientos" as const, label: "Movimientos" },
            { id: "cheques" as const, label: "Cheques" },
            { id: "cupones" as const, label: "Cupones" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setTabDetalle(tab.id)}
              className={`px-5 py-3 text-sm font-medium relative transition-colors ${tabDetalle === tab.id ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"}`}>
              {tab.label}
              {tabDetalle === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabDetalle === "saldos" && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Apertura</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Movimientos</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Estimado</th>
                  {extractoSel?.estado === "cerrado" && (
                    <>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cierre Ingresado</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {extractoSel?.saldos?.map(s => {
                  const diff = extractoSel.estado === "cerrado" ? Number(s.saldo_cierre_ingresado ?? 0) - (s.saldo_estimado ?? 0) : 0
                  return (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSaldoSelDetalle(s)}>
                      <td className="py-3 px-4 font-medium">{s.valor_nombre}</td>
                      <td className="py-3 px-4 text-gray-600">{s.moneda}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(s.saldo_apertura))}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{s.transacciones ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{formatMonto(s.saldo_estimado ?? Number(s.saldo_apertura))}</td>
                      {extractoSel.estado === "cerrado" && (
                        <>
                          <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(s.saldo_cierre_ingresado ?? 0))}</td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold ${Math.abs(diff) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                            {formatMonto(diff)}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {tabDetalle === "movimientos" && (
            <>
              {extractoSel?.movimientos && extractoSel.movimientos.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractoSel.movimientos.map((m: MovimientoCaja) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-600">{formatFecha(m.fecha)}</td>
                        <td className="py-3 px-4">{m.concepto || "—"}</td>
                        <td className="py-3 px-4 text-gray-600">{m.valor_nombre}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            m.tipo_movimiento === "ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {m.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-medium ${
                          m.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"
                        }`}>
                          {m.tipo_movimiento === "egreso" ? "-" : "+"}{formatMonto(Number(m.importe))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{m.documento_origen_numero || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">No hay movimientos registrados en este extracto</div>
              )}
            </>
          )}

          {tabDetalle === "cheques" && (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Gestión de cheques en desarrollo</p>
              <p className="text-xs text-gray-400 mt-1">Se integrará con el módulo de cheques cuando esté disponible</p>
            </div>
          )}

          {tabDetalle === "cupones" && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Gestión de cupones en desarrollo</p>
              <p className="text-xs text-gray-400 mt-1">Se integrará con el módulo de tarjetas cuando esté disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cierre */}
      {mostrarCierre && extractoSel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-indigo-900">Cerrar Extracto — {extractoSel.numero}</h3>
              <button onClick={() => setMostrarCierre(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              {errorCierre && (
                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorCierre}
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Ingrese el conteo físico de cada valor. Si hay diferencias se registrarán igualmente al confirmar.
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Estimado</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Conteo Físico</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {extractoSel.saldos?.map(s => {
                    const estimado = s.saldo_estimado ?? Number(s.saldo_apertura)
                    const fisico = saldosFisicos[s.id] ?? 0
                    const diff = fisico - estimado
                    return (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">{s.valor_nombre} <span className="text-xs text-gray-400">({s.moneda})</span></td>
                        <td className="py-3 px-4 text-right font-mono">{formatMonto(estimado)}</td>
                        <td className="py-3 px-4 text-right">
                          <input type="number" step="0.01" value={saldosFisicos[s.id] ?? ""}
                            onChange={e => setSaldosFisicos(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-32 text-right border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-semibold ${Math.abs(diff) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                          {formatMonto(diff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setMostrarCierre(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarCierre} disabled={guardando}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300">
                {guardando ? "Cerrando..." : "Confirmar Cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle movimientos por valor */}
      {saldoSelDetalle && extractoSel && (() => {
        const movsValor = ((extractoSel.movimientos || []) as MovimientoCaja[])
          .filter(m => m.valor_id === saldoSelDetalle.valor_id)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        const saldoApertura = Number(saldoSelDetalle.saldo_apertura)
        let saldoAcc = saldoApertura
        const movsConSaldo = movsValor.map(m => {
          const cancelado = m.estado_movimiento === "cancelado"
          const imp = Number(m.importe)
          if (!cancelado) saldoAcc += m.tipo_movimiento === "ingreso" ? imp : -imp
          return { ...m, saldoAcum: cancelado ? null : saldoAcc }
        })
        const totalMovs = movsConSaldo.reduce((s, m) => m.estado_movimiento === "cancelado" ? s : s + (m.tipo_movimiento === "ingreso" ? Number(m.importe) : -Number(m.importe)), 0)
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-indigo-900">Saldos</h3>
                <button onClick={() => setSaldoSelDetalle(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 border-b">
                <div>
                  <p className="text-xs text-gray-500">Saldo de apertura</p>
                  <p className="font-mono font-semibold">{formatMonto(saldoApertura)}</p>
                  <p className="text-xs text-gray-500 mt-2">Transacciones</p>
                  <p className="font-mono font-semibold">{formatMonto(totalMovs)}</p>
                  <p className="text-xs text-gray-500 mt-2">Saldo estimado</p>
                  <p className="font-mono font-semibold">{formatMonto(saldoSelDetalle.saldo_estimado ?? saldoApertura)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Diario</p>
                  <p className="font-medium text-indigo-700">{saldoSelDetalle.valor_nombre} ({saldoSelDetalle.moneda})</p>
                  <p className="text-xs text-gray-500 mt-2">Moneda</p>
                  <p className="font-medium">{saldoSelDetalle.moneda}</p>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {movsConSaldo.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0">
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Referencia</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsConSaldo.map(m => {
                        const cancelado = m.estado_movimiento === "cancelado"
                        return (
                        <tr key={m.id} className={`border-b border-gray-100 hover:bg-gray-50 ${cancelado ? "opacity-50" : ""}`}>
                          <td className="py-2 px-3 text-sm">
                            {m.valor_nombre}
                            {cancelado && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelado</span>}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-600">{m.documento_origen_numero || m.concepto || "—"}</td>
                          <td className="py-2 px-3 text-sm text-gray-600">{formatFecha(m.fecha)}</td>
                          <td className={`py-2 px-3 text-right font-mono text-sm ${cancelado ? "line-through text-gray-400" : m.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                            {m.tipo_movimiento === "egreso" ? "-" : ""}{formatMonto(Number(m.importe))}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-sm font-medium">
                            {m.saldoAcum !== null ? formatMonto(m.saldoAcum) : "—"}
                          </td>
                        </tr>
                        )
                      })}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="py-2 px-3 text-right text-sm text-gray-600">Total</td>
                        <td className="py-2 px-3 text-right font-mono text-sm">{formatMonto(totalMovs)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">No hay movimientos para este valor</div>
                )}
              </div>
              <div className="p-3 border-t flex justify-between items-center">
                <p className="text-xs text-gray-400">{movsConSaldo.length} movimiento{movsConSaldo.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setSaldoSelDetalle(null)} className="text-sm text-indigo-700 hover:text-indigo-900 font-medium">Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Configuración de Cajas ──────────────────────────────────────────────────

function FormularioCaja({ caja, onGuardar, guardando, triggerSubmit, onError }: {
  caja: Caja | null
  onGuardar: (datos: Partial<Caja>) => void
  guardando: boolean
  triggerSubmit?: number
  onError?: (msg: string) => void
}) {
  const { sucursales } = useERP()
  const [form, setForm] = useState<Partial<Caja>>(caja || {
    nombre: "", codigo: "", sucursal: "",
    cierre_diario_obligatorio: true,
    no_valida_cierre_sabados: false,
    no_valida_cierre_domingos: false,
    no_valida_cierre_feriados: false,
  })
  const [error, setError] = useState("")

  const validar = () => {
    if (!form.nombre?.trim()) return "El nombre es obligatorio"
    if (!form.sucursal) return "La sucursal es obligatoria"
    if (form.codigo && !/^[A-Z0-9-]+$/i.test(form.codigo)) return "El código solo puede contener letras, números y guiones"
    return ""
  }

  const handleGuardar = React.useCallback(() => {
    const err = validar()
    if (err) { setError(err); onError?.(err); return }
    setError("")
    onGuardar(form)
  }, [form])

  React.useEffect(() => {
    if (triggerSubmit) handleGuardar()
  }, [triggerSubmit])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
            <input value={form.codigo || ""} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              placeholder="Ej: CF, ADM, REC"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal *</label>
            <select value={form.sucursal || ""} onChange={e => setForm(f => ({ ...f, sucursal: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.cierre_diario_obligatorio ?? true}
              onChange={e => setForm(f => ({ ...f, cierre_diario_obligatorio: e.target.checked }))} className="rounded" />
            <span className="text-sm">Cierre de caja diario obligatorio</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.no_valida_cierre_sabados ?? false}
              onChange={e => setForm(f => ({ ...f, no_valida_cierre_sabados: e.target.checked }))} className="rounded" />
            <span className="text-sm">No valida cierre los Sábados</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.no_valida_cierre_domingos ?? false}
              onChange={e => setForm(f => ({ ...f, no_valida_cierre_domingos: e.target.checked }))} className="rounded" />
            <span className="text-sm">No valida cierre los Domingos</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.no_valida_cierre_feriados ?? false}
              onChange={e => setForm(f => ({ ...f, no_valida_cierre_feriados: e.target.checked }))} className="rounded" />
            <span className="text-sm">No valida cierre los Feriados</span>
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── SelectorCuenta (búsqueda typeahead contra /api/contabilidad/cuentas) ─────
function SelectorCuenta({ value, onChange, placeholder = "Buscar cuenta..." }: {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = React.useState("")
  const [opciones, setOpciones] = React.useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [abierto, setAbierto] = React.useState(false)
  const [sel, setSel] = React.useState<{ id: string; codigo: string; nombre: string } | null>(null)

  React.useEffect(() => {
    if (!value) { setSel(null); return }
    fetch(`/api/contabilidad/cuentas?id=${value}`)
      .then(r => r.json()).then(d => { if (d?.data) setSel(d.data) }).catch(() => {})
  }, [value])

  React.useEffect(() => {
    if (!abierto) { setOpciones([]); return }
    const t = setTimeout(() => {
      fetch(`/api/contabilidad/cuentas?q=${encodeURIComponent(query.trim())}&limit=20`)
        .then(r => r.json()).then(d => setOpciones(Array.isArray(d?.data) ? d.data : [])).catch(() => {})
    }, query.length > 0 ? 300 : 0)
    return () => clearTimeout(t)
  }, [query, abierto])

  return (
    <div className="relative">
      <div className="w-full px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-indigo-500 bg-white cursor-pointer flex items-center justify-between"
        onClick={() => setAbierto(v => !v)}>
        <span className={sel ? "text-gray-900 font-mono text-sm" : "text-gray-400 text-sm"}>
          {sel ? `${sel.codigo} — ${sel.nombre}` : placeholder}
        </span>
        {sel && (
          <button type="button" className="text-gray-400 hover:text-red-500 ml-2"
            onClick={e => { e.stopPropagation(); setSel(null); onChange("") }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {abierto && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg">
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Código o nombre..."
            className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none" />
          <div className="max-h-48 overflow-y-auto">
            {opciones.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>}
            {opciones.map(op => (
              <div key={op.id}
                className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                onClick={() => { setSel(op); onChange(op.id); setAbierto(false); setQuery("") }}>
                <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{op.codigo}</span>
                <span className="text-gray-800">{op.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CuentaDisplay (muestra código+nombre a partir de un UUID) ──────────────
function CuentaDisplay({ id }: { id: string }) {
  const [cuenta, setCuenta] = useState<{ codigo: string; nombre: string } | null>(null)
  useEffect(() => {
    fetch(`/api/contabilidad/cuentas?id=${id}`)
      .then(r => r.json()).then(d => setCuenta(d?.data ?? null)).catch(() => {})
  }, [id])
  if (!cuenta) return <p className="text-gray-400 text-sm">Cargando...</p>
  return (
    <p className="font-mono text-sm text-gray-900">
      <span className="font-bold">{cuenta.codigo}</span>
      <span className="text-gray-500 ml-2">– {cuenta.nombre}</span>
    </p>
  )
}

const SUBTIPO_LABELS_VALOR: Record<string, string> = {
  banco: 'Banco', cheque_tercero: 'Cheque Tercero', tarjeta: 'Tarjeta',
  rendicion_gastos: 'Rendición de Gastos', fondo_fijo: 'Fondo Fijo'
}

// ─── ModalDetalleValor (pantalla completa en modal, con edición inline) ──────
function ModalDetalleValor({ valor, cajaId, onClose, onActualizar }: {
  valor: CajaValor
  cajaId?: string
  onClose: () => void
  onActualizar: () => void
}) {
  const esNuevo = valor.id === ''
  const [modoEdicion, setModoEdicion] = useState(esNuevo)
  const [form, setForm] = useState<CajaValor>({ ...valor })
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState("")

  const guardar = async () => {
    if (!form.codigo?.trim() || !form.nombre?.trim()) { setErrorGuardar("Código y nombre son obligatorios"); return }
    if (form.tipo === 'banco_cheques' && !form.subtipo) { setErrorGuardar("El subtipo es obligatorio para Banco y cheques"); return }
    setErrorGuardar("")
    setGuardando(true)
    const supabase = createClient()
    if (esNuevo) {
      const { count } = await supabase
        .from('caja_valores')
        .select('*', { count: 'exact', head: true })
        .eq('codigo', form.codigo)
      if (count && count > 0) { setErrorGuardar("El código ya existe"); setGuardando(false); return }
      await supabase.from('caja_valores').insert({
        caja_id: cajaId,
        nombre: form.nombre,
        codigo: form.codigo,
        tipo: form.tipo,
        subtipo: form.tipo === 'banco_cheques' ? (form.subtipo || null) : null,
        moneda: form.moneda,
        activo: form.activo,
        cuenta_contable_id: form.cuenta_contable_id || null,
        cuenta_haber_id: form.cuenta_haber_id || null,
      })
    } else {
      await supabase.from('caja_valores').update({
        nombre: form.nombre,
        codigo: form.codigo,
        tipo: form.tipo,
        subtipo: form.tipo === 'banco_cheques' ? (form.subtipo || null) : null,
        moneda: form.moneda,
        activo: form.activo,
        cuenta_contable_id: form.cuenta_contable_id || null,
        cuenta_haber_id: form.cuenta_haber_id || null,
      }).eq('id', form.id)
    }
    setGuardando(false)
    setModoEdicion(false)
    onActualizar()
  }

  const v = modoEdicion ? form : valor

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Barra de acciones — Odoo style */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b bg-gray-50 flex-shrink-0">
          {modoEdicion ? (
            <>
              <button onClick={guardar} disabled={guardando}
                className="flex items-center gap-1.5 bg-indigo-900 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => { if (esNuevo) { onClose() } else { setForm({ ...valor }); setModoEdicion(false); setErrorGuardar("") } }}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
                Descartar
              </button>
              {errorGuardar && <span className="text-xs text-red-600 ml-2">{errorGuardar}</span>}
            </>
          ) : (
            <button onClick={() => setModoEdicion(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nombre / título */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          {modoEdicion ? (
            <input value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del valor..."
              className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none w-full bg-transparent pb-0.5" />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{valor.nombre || 'Nuevo Valor'}</h2>
          )}
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">

            {/* ── Columna izquierda ── */}
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-1">Código</p>
                {modoEdicion ? (
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                ) : (
                  <p className="font-mono font-semibold text-gray-900">{valor.codigo}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                {modoEdicion ? (
                  <select value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CajaValor["tipo"], subtipo: undefined }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                    <option value="efectivo">Efectivo</option>
                    <option value="banco_cheques">Banco y cheques</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${valor.tipo === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {valor.tipo === 'efectivo' ? 'Efectivo' : 'Banco / Cheques'}
                    </span>
                  </div>
                )}
              </div>

              {(modoEdicion ? form.tipo === 'banco_cheques' : !!valor.subtipo) && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Subtipo</p>
                  {modoEdicion ? (
                    <select value={form.subtipo || ""}
                      onChange={e => setForm(f => ({ ...f, subtipo: e.target.value || null }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                      <option value="">Sin subtipo</option>
                      <option value="banco">Banco</option>
                      <option value="cheque_tercero">Cheque Tercero</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="rendicion_gastos">Rendición de Gastos</option>
                      <option value="fondo_fijo">Fondo Fijo</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{valor.subtipo ? (SUBTIPO_LABELS_VALOR[valor.subtipo] || valor.subtipo) : '—'}</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Activo</p>
                {modoEdicion ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.activo}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    <span className="text-sm">{form.activo ? 'Activo' : 'Inactivo'}</span>
                  </label>
                ) : (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${valor.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {valor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                )}
              </div>
            </div>

            {/* ── Columna derecha ── */}
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cuenta de débito predeterminada</p>
                {modoEdicion ? (
                  <SelectorCuenta
                    value={form.cuenta_contable_id || ""}
                    onChange={id => setForm(f => ({ ...f, cuenta_contable_id: id || null }))}
                    placeholder="Buscar cuenta de débito..."
                  />
                ) : (
                  valor.cuenta_contable_id
                    ? <CuentaDisplay id={valor.cuenta_contable_id} />
                    : <p className="text-gray-400 text-sm">—</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Cuenta de haber predeterminada</p>
                {modoEdicion ? (
                  <SelectorCuenta
                    value={form.cuenta_haber_id || ""}
                    onChange={id => setForm(f => ({ ...f, cuenta_haber_id: id || null }))}
                    placeholder="Buscar cuenta de haber..."
                  />
                ) : (
                  valor.cuenta_haber_id
                    ? <CuentaDisplay id={valor.cuenta_haber_id} />
                    : <p className="text-gray-400 text-sm">—</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Moneda</p>
                {modoEdicion ? (
                  <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                ) : (
                  <p className="font-mono text-gray-900">{valor.moneda}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabValores({ cajaId, valores, onActualizar, modoEdicion }: {
  cajaId: string; valores: CajaValor[]; onActualizar: () => void; modoEdicion: boolean
}) {
  const [valorModal, setValorModal] = useState<CajaValor | null>(null)

  const desactivar = async (id: string) => {
    const supabase = createClient()
    await supabase.from('caja_valores').update({ activo: false }).eq('id', id)
    onActualizar()
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Código</th>
            <th className="text-left py-2 px-3">Nombre</th>
            <th className="text-left py-2 px-3">Tipo</th>
            <th className="text-left py-2 px-3">Moneda</th>
            <th className="text-center py-2 px-3">Activo</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {valores.map(v => (
            <tr key={v.id} className="border-b border-gray-100 hover:bg-indigo-50 cursor-pointer"
              onClick={() => setValorModal(v)}>
              <td className="py-2 px-3 font-mono">{v.codigo}</td>
              <td className="py-2 px-3 font-medium">{v.nombre}</td>
              <td className="py-2 px-3">
                <div className="flex flex-col gap-0.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.tipo === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {v.tipo === 'efectivo' ? 'Efectivo' : 'Banco/Cheques'}
                  </span>
                  {v.subtipo && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 w-fit">
                      {({'banco': 'Banco', 'cheque_tercero': 'Cheque', 'tarjeta': 'Tarjeta', 'rendicion_gastos': 'Rendición', 'fondo_fijo': 'Fondo Fijo'} as Record<string,string>)[v.subtipo] || v.subtipo}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-3 font-mono">{v.moneda}</td>
              <td className="py-2 px-3 text-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {v.activo ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                {v.activo && modoEdicion && (
                  <button onClick={() => desactivar(v.id)} className="p-1 text-gray-400 hover:text-red-600" title="Desactivar">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {valores.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Sin valores configurados</p>}
      {modoEdicion && (
        <button onClick={() => setValorModal({ id: '', caja_id: cajaId, nombre: '', codigo: '', tipo: 'efectivo', moneda: 'ARS', activo: true, subtipo: null })}
          className="mt-3 flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900">
          <Plus className="w-4 h-4" /> Agregar valor
        </button>
      )}

      {valorModal && (
        <ModalDetalleValor
          valor={valorModal}
          cajaId={cajaId}
          onClose={() => setValorModal(null)}
          onActualizar={() => { setValorModal(null); onActualizar() }}
        />
      )}
    </div>
  )
}

function TabBancosPermitidos({ cajaId, bancos, onActualizar, modoEdicion }: {
  cajaId: string; bancos: CajaBancoPermitido[]; onActualizar: () => void; modoEdicion: boolean
}) {
  const [agregando, setAgregando] = useState(false)
  const [valoresDisponibles, setValoresDisponibles] = useState<CajaValor[]>([])
  const [cargandoValores, setCargandoValores] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => {
    if (!agregando) return
    setCargandoValores(true)
    const supabase = createClient()
    supabase
      .from('caja_valores')
      .select('*')
      .eq('caja_id', cajaId)
      .eq('tipo', 'banco_cheques')
      .neq('subtipo', 'tarjeta')
      .eq('activo', true)
      .order('codigo')
      .then(({ data }) => {
        const codigosYa = new Set(bancos.map(b => b.codigo))
        setValoresDisponibles((data as CajaValor[] ?? []).filter(v => !codigosYa.has(v.codigo)))
        setCargandoValores(false)
      })
  }, [agregando])

  const agregar = async (v: CajaValor) => {
    setGuardando(v.id)
    const supabase = createClient()
    await supabase.from('caja_bancos_permitidos').insert({
      caja_id: cajaId,
      banco_nombre: v.nombre,
      codigo: v.codigo,
      tipo: v.tipo,
      moneda: v.moneda,
    })
    setGuardando(null)
    setAgregando(false)
    onActualizar()
  }

  const eliminar = async (id: string) => {
    const supabase = createClient()
    await supabase.from('caja_bancos_permitidos').delete().eq('id', id)
    onActualizar()
  }

  return (
    <div>
      {agregando && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-indigo-900">Seleccionar diario bancario</p>
            <button onClick={() => setAgregando(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {cargandoValores ? (
            <p className="text-sm text-gray-500 py-2">Cargando...</p>
          ) : valoresDisponibles.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No hay diarios bancarios disponibles para agregar.</p>
          ) : (
            <div className="space-y-1">
              {valoresDisponibles.map(v => (
                <button
                  key={v.id}
                  disabled={guardando === v.id}
                  onClick={() => agregar(v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-500">{v.codigo}</span>
                    <span className="text-sm font-medium text-gray-900">{v.nombre}</span>
                    {v.subtipo && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700">
                        {SUBTIPO_LABELS_VALOR[v.subtipo] || v.subtipo}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-gray-400">{v.moneda}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Código</th>
            <th className="text-left py-2 px-3">Nombre</th>
            <th className="text-left py-2 px-3">Moneda</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {bancos.map(b => (
            <tr key={b.id} className="border-b border-gray-100">
              <td className="py-2 px-3 font-mono">{b.codigo}</td>
              <td className="py-2 px-3 font-medium">{b.banco_nombre}</td>
              <td className="py-2 px-3 font-mono">{b.moneda}</td>
              <td className="py-2 px-3">
                {modoEdicion && (
                  <button onClick={() => eliminar(b.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bancos.length === 0 && !agregando && <p className="text-sm text-gray-500 text-center py-6">Sin bancos habilitados</p>}
      {!agregando && modoEdicion && (
        <button onClick={() => setAgregando(true)}
          className="mt-3 flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900">
          <Plus className="w-4 h-4" /> Agregar banco
        </button>
      )}
    </div>
  )
}

function TabUsuarios({ cajaId, usuarios, soloTransferencias, onActualizar, modoEdicion }: {
  cajaId: string; usuarios: CajaUsuario[]; soloTransferencias: boolean; onActualizar: () => void; modoEdicion: boolean
}) {
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<CajaUsuario>>({})
  const [guardando, setGuardando] = useState(false)

  const filtrados = soloTransferencias
    ? usuarios.filter(u => u.para_transferencias)
    : usuarios

  const guardar = async () => {
    if (!form.usuario_nombre?.trim()) return
    setGuardando(true)
    const supabase = createClient()
    await supabase.from('caja_usuarios').insert({
      caja_id: cajaId,
      usuario_nombre: form.usuario_nombre,
      es_cobrador: form.es_cobrador || false,
      es_vendedor: form.es_vendedor || false,
      para_transferencias: soloTransferencias ? true : (form.para_transferencias || false),
    })
    setCreando(false)
    setForm({})
    setGuardando(false)
    onActualizar()
  }

  const toggleField = async (id: string, field: 'es_cobrador' | 'es_vendedor', value: boolean) => {
    const supabase = createClient()
    await supabase.from('caja_usuarios').update({ [field]: value }).eq('id', id)
    onActualizar()
  }

  const eliminar = async (id: string) => {
    const supabase = createClient()
    await supabase.from('caja_usuarios').delete().eq('id', id)
    onActualizar()
  }

  return (
    <div>
      {creando && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del usuario</label>
              <input value={form.usuario_nombre || ""} onChange={e => setForm(f => ({ ...f, usuario_nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            {!soloTransferencias && (
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm mb-1.5">
                  <input type="checkbox" checked={form.es_cobrador || false}
                    onChange={e => setForm(f => ({ ...f, es_cobrador: e.target.checked }))} className="rounded" />
                  Cobrador
                </label>
                <label className="flex items-center gap-2 text-sm mb-1.5">
                  <input type="checkbox" checked={form.es_vendedor || false}
                    onChange={e => setForm(f => ({ ...f, es_vendedor: e.target.checked }))} className="rounded" />
                  Vendedor
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={() => { setCreando(false); setForm({}) }} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800 disabled:bg-gray-300">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Nombre</th>
            {!soloTransferencias && <th className="text-center py-2 px-3">Cobrador</th>}
            {!soloTransferencias && <th className="text-center py-2 px-3">Vendedor</th>}
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(u => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">{u.usuario_nombre}</td>
              {!soloTransferencias && (
                <td className="py-2 px-3 text-center">
                  <input type="checkbox" checked={u.es_cobrador}
                    onChange={e => toggleField(u.id, 'es_cobrador', e.target.checked)} className="rounded" />
                </td>
              )}
              {!soloTransferencias && (
                <td className="py-2 px-3 text-center">
                  <input type="checkbox" checked={u.es_vendedor}
                    onChange={e => toggleField(u.id, 'es_vendedor', e.target.checked)} className="rounded" />
                </td>
              )}
              <td className="py-2 px-3">
                <button onClick={() => eliminar(u.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtrados.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Sin usuarios asignados</p>}
      {!creando && modoEdicion && (
        <button onClick={() => setCreando(true)}
          className="mt-3 flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900">
          <Plus className="w-4 h-4" /> Agregar usuario
        </button>
      )}
    </div>
  )
}

function ConfigCajas() {
  const [cajas, setCajas] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)
  const [tabActiva, setTabActiva] = useState<"valores" | "bancos" | "usuarios" | "transferencias">("valores")
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [triggerSave, setTriggerSave] = useState(0)

  const cargarCajas = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cajas').select('*')
      .order('sucursal', { ascending: true })
      .order('nombre', { ascending: true })
    if (!error && data) setCajas(data)
    setLoading(false)
  }

  useEffect(() => { cargarCajas() }, [])

  const cargarDetalleCaja = async (caja: Caja) => {
    const supabase = createClient()
    const [valoresRes, usuariosRes, bancosRes] = await Promise.all([
      supabase.from('caja_valores').select('*').eq('caja_id', caja.id).eq('activo', true),
      supabase.from('caja_usuarios').select('*').eq('caja_id', caja.id),
      supabase.from('caja_bancos_permitidos').select('*').eq('caja_id', caja.id),
    ])
    setCajaSeleccionada({
      ...caja,
      valores: valoresRes.data || [],
      usuarios: usuariosRes.data || [],
      bancos_permitidos: bancosRes.data || [],
    })
    setVista("detalle")
    setModoEdicion(false)
    setTabActiva("valores")
  }

  const guardarCaja = async (datos: Partial<Caja>) => {
    setGuardando(true)
    const supabase = createClient()
    if (cajaSeleccionada?.id) {
      await supabase.from('cajas')
        .update({ ...datos, updated_at: new Date().toISOString() })
        .eq('id', cajaSeleccionada.id)
      await cargarCajas()
      // Recargar detalle y volver a vista solo lectura
      const { data } = await supabase.from('cajas').select('*').eq('id', cajaSeleccionada.id).single()
      if (data) await cargarDetalleCaja(data)
      setModoEdicion(false)
    } else {
      await supabase.from('cajas').insert(datos)
      await cargarCajas()
      setVista("lista")
    }
    setGuardando(false)
  }

  const toggleActivoCaja = async (caja: Caja) => {
    const supabase = createClient()
    await supabase.from('cajas').update({ activo: !caja.activo }).eq('id', caja.id)
    await cargarCajas()
  }

  if (vista === "lista") {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
            <h1 className="text-2xl font-bold text-amber-900">Cajas</h1>
          </div>
          <button onClick={() => { setCajaSeleccionada(null); setModoEdicion(true); setVista("detalle") }}
            className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Caja
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Caja</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cierre Diario</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map(caja => (
                  <tr key={caja.id} onClick={() => cargarDetalleCaja(caja)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-medium text-indigo-900">{caja.nombre}</td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-600">{caja.codigo}</td>
                    <td className="py-3 px-4 text-gray-600">{caja.sucursal}</td>
                    <td className="py-3 px-4 text-center">
                      {caja.cierre_diario_obligatorio
                        ? <span className="text-green-600 font-medium text-sm">Sí</span>
                        : <span className="text-gray-400 text-sm">No</span>}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleActivoCaja(caja)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${caja.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {caja.activo ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cajas.length === 0 && <div className="text-center py-12 text-gray-500">No hay cajas configuradas</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
        {modoEdicion ? (
          <>
            <button onClick={() => setTriggerSave(n => n + 1)} disabled={guardando}
              className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 text-sm font-medium disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => cajaSeleccionada ? setModoEdicion(false) : setVista("lista")}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Descartar
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setVista("lista")}
              className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
              ← Cajas
            </button>
            <h1 className="text-xl font-bold text-amber-900">
              {cajaSeleccionada ? cajaSeleccionada.nombre : "Nueva Caja"}
            </h1>
            {cajaSeleccionada && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cajaSeleccionada.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {cajaSeleccionada.activo ? "Activa" : "Inactiva"}
              </span>
            )}
            <button onClick={() => setModoEdicion(true)}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Editar
            </button>
          </>
        )}
      </div>

      {(!cajaSeleccionada || modoEdicion) ? (
        <FormularioCaja
          caja={cajaSeleccionada}
          onGuardar={guardarCaja}
          guardando={guardando}
          triggerSubmit={triggerSave}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nombre</p>
                <p className="font-semibold text-gray-900">{cajaSeleccionada.nombre}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Código</p>
                <p className="font-mono text-gray-900">{cajaSeleccionada.codigo || <span className="text-gray-400">—</span>}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Sucursal</p>
                <p className="text-gray-900">{cajaSeleccionada.sucursal}</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {[
                { label: "Cierre de caja diario obligatorio", value: cajaSeleccionada.cierre_diario_obligatorio },
                { label: "No valida cierre los Sábados", value: cajaSeleccionada.no_valida_cierre_sabados },
                { label: "No valida cierre los Domingos", value: cajaSeleccionada.no_valida_cierre_domingos },
                { label: "No valida cierre los Feriados", value: cajaSeleccionada.no_valida_cierre_feriados },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-md border border-gray-200">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${value ? 'bg-indigo-900 border-indigo-900' : 'border-gray-300 bg-white'}`}>
                    {value && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cajaSeleccionada && (
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="flex border-b border-gray-200 px-4">
            {([
              { id: "valores" as const, label: "Valores Permitidos" },
              { id: "bancos" as const, label: "Bancos Permitidos" },
              { id: "usuarios" as const, label: "Usuarios" },
              { id: "transferencias" as const, label: "Usuarios para Transferencias" },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setTabActiva(tab.id)}
                className={`px-5 py-3 text-sm font-medium relative transition-colors ${tabActiva === tab.id ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"}`}>
                {tab.label}
                {tabActiva === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tabActiva === "valores" && <TabValores cajaId={cajaSeleccionada.id} valores={cajaSeleccionada.valores || []} onActualizar={() => cargarDetalleCaja(cajaSeleccionada)} modoEdicion={modoEdicion} />}
            {tabActiva === "bancos" && <TabBancosPermitidos cajaId={cajaSeleccionada.id} bancos={cajaSeleccionada.bancos_permitidos || []} onActualizar={() => cargarDetalleCaja(cajaSeleccionada)} modoEdicion={modoEdicion} />}
            {tabActiva === "usuarios" && <TabUsuarios cajaId={cajaSeleccionada.id} usuarios={cajaSeleccionada.usuarios || []} soloTransferencias={false} onActualizar={() => cargarDetalleCaja(cajaSeleccionada)} modoEdicion={modoEdicion} />}
            {tabActiva === "transferencias" && <TabUsuarios cajaId={cajaSeleccionada.id} usuarios={cajaSeleccionada.usuarios || []} soloTransferencias={true} onActualizar={() => cargarDetalleCaja(cajaSeleccionada)} modoEdicion={modoEdicion} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Registros de Caja ──────────────────────────────────────────────────────

function RegistrosCaja() {
  const [registros, setRegistros] = useState<RegistroCaja[]>([])
  const [cajasDisp, setCajasDisp] = useState<Caja[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [regSel, setRegSel] = useState<RegistroCaja | null>(null)
  const [tabActiva, setTabActiva] = useState<"comprobantes" | "valores" | "observaciones">("comprobantes")
  const [guardando, setGuardando] = useState(false)
  const [valoresCaja, setValoresCaja] = useState<CajaValor[]>([])

  // Form state
  const [formCaja, setFormCaja] = useState("")
  const [formConcepto, setFormConcepto] = useState("")
  const [formMoneda, setFormMoneda] = useState("ARS")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formFechaPago, setFormFechaPago] = useState("")
  const [formObs, setFormObs] = useState("")

  // Comprobantes inline
  const [comprobantes, setComprobantes] = useState<Partial<RegistroCajaComprobante>[]>([])
  // Valores inline
  const [valores, setValores] = useState<Partial<RegistroCajaValor>[]>([])
  // Modal valor
  const [mostrarModalValor, setMostrarModalValor] = useState(false)

  const formatMonto = (m: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)
  const hoy = new Date().toISOString().split("T")[0]

  const cargarDatos = async () => {
    setLoading(true)
    const supabase = createClient()
    const [regRes, cajRes, conRes] = await Promise.all([
      supabase.from("registros_caja").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("cajas").select("*").eq("activo", true).order("nombre"),
      supabase.from("conceptos_registro_caja").select("*").eq("activo", true).eq("visible_en_caja", true).order("nombre"),
    ])
    setRegistros(regRes.data || [])
    setCajasDisp(cajRes.data || [])
    setConceptos(conRes.data || [])
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const cargarValoresCaja = async (cajaId: string) => {
    const supabase = createClient()
    const { data } = await supabase.from("caja_valores").select("*").eq("caja_id", cajaId).eq("activo", true)
    setValoresCaja(data || [])
  }

  const abrirDetalle = async (reg: RegistroCaja) => {
    const supabase = createClient()
    const [cR, vR] = await Promise.all([
      supabase.from("registro_caja_comprobantes").select("*").eq("registro_id", reg.id),
      supabase.from("registro_caja_valores").select("*").eq("registro_id", reg.id),
    ])
    setRegSel({ ...reg, comprobantes: cR.data || [], valores: vR.data || [] })
    setFormCaja(reg.caja_id)
    setFormConcepto(reg.concepto_id)
    setFormMoneda(reg.moneda)
    setFormFecha(reg.fecha)
    setFormFechaPago(reg.fecha_probable_pago || "")
    setFormObs(reg.observaciones || "")
    setComprobantes(cR.data || [])
    setValores(vR.data || [])
    if (reg.caja_id) await cargarValoresCaja(reg.caja_id)
    setTabActiva("comprobantes")
    setVista("detalle")
  }

  const nuevoRegistro = () => {
    setRegSel(null)
    setFormCaja("")
    setFormConcepto("")
    setFormMoneda("ARS")
    setFormFecha(hoy)
    setFormFechaPago("")
    setFormObs("")
    setComprobantes([])
    setValores([])
    setValoresCaja([])
    setTabActiva("comprobantes")
    setVista("detalle")
  }

  const guardarRegistro = async () => {
    if (!formCaja || !formConcepto || !formFecha) return
    setGuardando(true)
    const supabase = createClient()
    const caja = cajasDisp.find(c => c.id === formCaja)
    const concepto = conceptos.find(c => c.id === formConcepto)
    const totalC = comprobantes.reduce((a, c) => a + Number(c.total || 0), 0)
    const totalV = valores.reduce((a, v) => a + Number(v.importe || 0), 0)

    if (regSel?.id) {
      await supabase.from("registros_caja").update({
        caja_id: formCaja, caja_nombre: caja?.nombre, sucursal: caja?.sucursal,
        concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
        moneda: formMoneda, fecha: formFecha, fecha_probable_pago: formFechaPago || null,
        observaciones: formObs, total_comprobantes: totalC, total_valores: totalV,
        updated_at: new Date().toISOString(),
      }).eq("id", regSel.id)
      // Update comprobantes
      await supabase.from("registro_caja_comprobantes").delete().eq("registro_id", regSel.id)
      if (comprobantes.length > 0) {
        await supabase.from("registro_caja_comprobantes").insert(
          comprobantes.map(c => ({ ...c, id: undefined, registro_id: regSel.id }))
        )
      }
      // Update valores
      await supabase.from("registro_caja_valores").delete().eq("registro_id", regSel.id)
      if (valores.length > 0) {
        await supabase.from("registro_caja_valores").insert(
          valores.map(v => ({ ...v, id: undefined, registro_id: regSel.id }))
        )
      }
    } else {
      const { data: numData } = await supabase.rpc("generar_numero_registro_caja", { p_sucursal: caja?.sucursal || "" })
      const { data: newReg } = await supabase.from("registros_caja").insert({
        numero: numData, caja_id: formCaja, caja_nombre: caja?.nombre, sucursal: caja?.sucursal,
        concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
        moneda: formMoneda, fecha: formFecha, fecha_probable_pago: formFechaPago || null,
        observaciones: formObs, total_comprobantes: totalC, total_valores: totalV,
      }).select().single()
      if (newReg) {
        if (comprobantes.length > 0) {
          await supabase.from("registro_caja_comprobantes").insert(
            comprobantes.map(c => ({ ...c, id: undefined, registro_id: newReg.id }))
          )
        }
        if (valores.length > 0) {
          await supabase.from("registro_caja_valores").insert(
            valores.map(v => ({ ...v, id: undefined, registro_id: newReg.id }))
          )
        }
      }
    }
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const confirmarRegistro = async () => {
    if (!regSel) return
    setGuardando(true)
    const supabase = createClient()
    const { data: extracto } = await supabase
      .from("extractos_caja").select("id")
      .eq("caja_id", regSel.caja_id).eq("estado", "abierto").single()
    if (!extracto) {
      alert("No hay extracto abierto para esta caja. Abrí un extracto en Finanzas → Extractos de Caja.")
      setGuardando(false)
      return
    }
    const { data: vals } = await supabase.from("registro_caja_valores").select("*").eq("registro_id", regSel.id)
    for (const valor of (vals || [])) {
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id, valor_id: valor.valor_id, valor_nombre: valor.valor_nombre,
        tipo_movimiento: "egreso", importe: valor.importe, moneda: valor.moneda,
        concepto: "Registro de Caja", documento_origen_tipo: "registro_caja", documento_origen_id: regSel.id,
        documento_origen_numero: regSel.numero,
      })
    }
    await supabase.from("registros_caja").update({ estado: "confirmado", updated_at: new Date().toISOString() }).eq("id", regSel.id)
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const addComprobante = () => {
    setComprobantes(prev => [...prev, { tipo: "Cuenta Contable", comprobante: "", proveedor_nombre: "", descripcion: "", cuenta_contable: "", cuenta_analitica: "", importe: 0, impuestos: 0, total: 0 }])
  }

  const updateComprobante = (idx: number, field: string, value: string | number) => {
    setComprobantes(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      if (field === "importe" || field === "impuestos") {
        copy[idx].total = Number(copy[idx].importe || 0) + Number(copy[idx].impuestos || 0)
      }
      return copy
    })
  }

  const removeComprobante = (idx: number) => setComprobantes(prev => prev.filter((_, i) => i !== idx))

  const addValorDesdModal = (result: import('./modal-medio-pago').MedioPagoResult, yNuevo: boolean) => {
    setValores(prev => [...prev, {
      valor_id: result.valor_id,
      valor_nombre: result.valor_nombre,
      importe_comprobante: result.importe,
      moneda_comprobante: formMoneda,
      importe: result.importe,
      moneda: result.moneda,
    }])
    if (!yNuevo) setMostrarModalValor(false)
  }

  const removeValor = (idx: number) => setValores(prev => prev.filter((_, i) => i !== idx))

  const totalComprobantes = comprobantes.reduce((a, c) => a + Number(c.total || 0), 0)
  const totalValores = valores.reduce((a, v) => a + Number(v.importe || 0), 0)
  const cajaSelObj = cajasDisp.find(c => c.id === formCaja)
  const esConfirmado = regSel?.estado === "confirmado"

  if (vista === "lista") {
    return (
      <FinanzasListSection<RegistroCaja>
        title="Registros de Caja" subtitle="Banco y Caja" moduleName="finanzas_registros_caja"
        data={registros} loading={loading}
        searchFields={["numero", "caja_nombre", "concepto_nombre", "moneda"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "caja_nombre", label: "Caja" }, { field: "moneda", label: "Moneda" }]}
        actions={<button onClick={nuevoRegistro} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Registro</button>}
      >
        {(filtered) => (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">N° Registro</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Caja</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total Comp.</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total Val.</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => abrirDetalle(r)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{r.numero}</td>
                    <td className="py-3 px-4 text-gray-600">{r.fecha}</td>
                    <td className="py-3 px-4 text-gray-700">{r.caja_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{r.concepto_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{r.moneda}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(r.total_comprobantes))}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(r.total_valores))}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {r.estado === "confirmado" ? "Confirmado" : "Borrador"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No hay registros de caja</div>}
          </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVista("lista")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">← Registros</button>
          <h1 className="text-2xl font-bold text-amber-900">{regSel ? regSel.numero : "Nuevo Registro de Caja"}</h1>
          {regSel && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${regSel.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {regSel.estado === "confirmado" ? "Confirmado" : "Borrador"}
            </span>
          )}
        </div>
        {!esConfirmado && (
          <div className="flex gap-2">
            <button onClick={guardarRegistro} disabled={guardando} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            {regSel?.id && (
              <button onClick={confirmarRegistro} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
                Confirmar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cabecera */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Caja *</label>
              <select value={formCaja} onChange={e => { setFormCaja(e.target.value); if (e.target.value) cargarValoresCaja(e.target.value) }} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {cajasDisp.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.sucursal}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto *</label>
              <select value={formConcepto} onChange={e => setFormConcepto(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <select value={formMoneda} onChange={e => setFormMoneda(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Probable de Pago</label>
              <input type="date" value={formFechaPago} onChange={e => setFormFechaPago(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Sucursal</p>
              <p className="font-medium text-gray-900">{cajaSelObj?.sucursal || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Total Comprobantes</p>
              <p className="font-medium text-gray-900 font-mono">{formatMonto(totalComprobantes)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Total Valores</p>
              <p className="font-medium text-gray-900 font-mono">{formatMonto(totalValores)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 px-4">
          {([
            { id: "comprobantes" as const, label: "Comprobantes" },
            { id: "valores" as const, label: "Valores" },
            { id: "observaciones" as const, label: "Observaciones" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)}
              className={`px-5 py-3 text-sm font-medium relative transition-colors ${tabActiva === tab.id ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"}`}>
              {tab.label}
              {tabActiva === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "comprobantes" && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Comprobante</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Cta. Contable</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Impuestos</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    {!esConfirmado && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <input value={c.tipo || ""} onChange={e => updateComprobante(i, "tipo", e.target.value)} disabled={esConfirmado}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input value={c.comprobante || ""} onChange={e => updateComprobante(i, "comprobante", e.target.value)} disabled={esConfirmado}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input value={c.proveedor_nombre || ""} onChange={e => updateComprobante(i, "proveedor_nombre", e.target.value)} disabled={esConfirmado}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input value={c.descripcion || ""} onChange={e => updateComprobante(i, "descripcion", e.target.value)} disabled={esConfirmado}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input value={c.cuenta_contable || ""} onChange={e => updateComprobante(i, "cuenta_contable", e.target.value)} disabled={esConfirmado}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" step="0.01" value={c.importe ?? ""} onChange={e => updateComprobante(i, "importe", parseFloat(e.target.value) || 0)} disabled={esConfirmado}
                          className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm font-mono disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" step="0.01" value={c.impuestos ?? ""} onChange={e => updateComprobante(i, "impuestos", parseFloat(e.target.value) || 0)} disabled={esConfirmado}
                          className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm font-mono disabled:bg-gray-50" />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{formatMonto(Number(c.total || 0))}</td>
                      {!esConfirmado && (
                        <td className="py-2 px-1">
                          <button onClick={() => removeComprobante(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={7} className="py-2 px-3 text-right text-xs uppercase text-gray-500">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{formatMonto(totalComprobantes)}</td>
                    {!esConfirmado && <td></td>}
                  </tr>
                </tfoot>
              </table>
              {!esConfirmado && (
                <button onClick={addComprobante} className="mt-3 text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Añadir un elemento
                </button>
              )}
            </div>
          )}

          {tabActiva === "valores" && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe Comp.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Moneda Comp.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                    {!esConfirmado && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {valores.map((v, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{v.valor_nombre}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatMonto(Number(v.importe_comprobante || 0))}</td>
                      <td className="py-2 px-3 text-gray-600">{v.moneda_comprobante}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatMonto(Number(v.importe || 0))}</td>
                      <td className="py-2 px-3 text-gray-600">{v.moneda}</td>
                      {!esConfirmado && (
                        <td className="py-2 px-1">
                          <button onClick={() => removeValor(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="py-2 px-3 text-right text-xs uppercase text-gray-500">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{formatMonto(totalValores)}</td>
                    <td></td>
                    {!esConfirmado && <td></td>}
                  </tr>
                </tfoot>
              </table>
              {!esConfirmado && (
                <button onClick={() => setMostrarModalValor(true)} disabled={!formCaja}
                  className="mt-3 text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1 disabled:text-gray-400">
                  <Plus className="w-4 h-4" /> Añadir un elemento
                </button>
              )}
              {mostrarModalValor && (
                <ModalMedioPago
                  cajaId={formCaja}
                  onGuardar={addValorDesdModal}
                  onCerrar={() => setMostrarModalValor(false)}
                />
              )}
            </div>
          )}

          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={6} disabled={esConfirmado}
              placeholder="Observaciones..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Ajustes de Caja ────────────────────────────────────────────────────────

function AjustesCaja() {
  const [ajustes, setAjustes] = useState<AjusteCaja[]>([])
  const [cajasDisp, setCajasDisp] = useState<Caja[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [ajusteSel, setAjusteSel] = useState<AjusteCaja | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [valoresCaja, setValoresCaja] = useState<CajaValor[]>([])

  // Form principal
  const [formConcepto, setFormConcepto] = useState("")
  const [formImporte, setFormImporte] = useState("")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formCaja, setFormCaja] = useState("")
  const [formCuentaAnalitica, setFormCuentaAnalitica] = useState("")
  const [formAuto, setFormAuto] = useState(false)
  const [formObs, setFormObs] = useState("")
  const [errorObs, setErrorObs] = useState("")

  // Líneas de valores (grilla)
  const [formValoresLineas, setFormValoresLineas] = useState<AjusteValorLinea[]>([])

  // Modal agregar valor
  const [modalValor, setModalValor] = useState(false)

  const formatMonto = (m: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)

  const cargarDatos = async () => {
    setLoading(true)
    const supabase = createClient()
    const [ajRes, cajRes, conRes] = await Promise.all([
      supabase.from("ajustes_caja").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("cajas").select("*").eq("activo", true).order("nombre"),
      supabase.from("conceptos_registro_caja").select("*").eq("activo", true).eq("visible_en_caja", true).order("nombre"),
    ])
    setAjustes(ajRes.data || [])
    setCajasDisp(cajRes.data || [])
    setConceptos(conRes.data || [])
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const cargarValoresCaja = async (cajaId: string) => {
    const supabase = createClient()
    const { data } = await supabase.from("caja_valores").select("*").eq("caja_id", cajaId).eq("activo", true)
    setValoresCaja(data || [])
  }

  const conceptoSelObj = conceptos.find(c => c.id === formConcepto)
  const requiereObs = conceptoSelObj?.requiere_observacion

  const defaultTipoMovByConcepto = (): "entrada" | "salida" => {
    const c = conceptos.find(x => x.id === formConcepto)
    if (c?.cuenta_contable_ingresos && !c?.cuenta_contable_egresos) return "entrada"
    return "salida"
  }

  const nuevoAjuste = () => {
    setAjusteSel(null)
    setFormConcepto("")
    setFormImporte("")
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormCaja("")
    setFormCuentaAnalitica("")
    setFormAuto(false)
    setFormObs("")
    setErrorObs("")
    setValoresCaja([])
    setFormValoresLineas([])
    setVista("detalle")
  }

  const abrirDetalle = async (aj: AjusteCaja) => {
    setAjusteSel(aj)
    setFormConcepto(aj.concepto_id)
    setFormImporte(String(aj.importe))
    setFormFecha(aj.fecha)
    setFormCaja(aj.caja_id)
    setFormCuentaAnalitica(aj.cuenta_analitica || "")
    setFormAuto(aj.es_automatico)
    setFormObs(aj.observaciones || "")
    setErrorObs("")
    if (aj.caja_id) await cargarValoresCaja(aj.caja_id)
    const supabase = createClient()
    const { data: lineas } = await supabase
      .from("ajuste_caja_valores")
      .select("*")
      .eq("ajuste_id", aj.id)
    setFormValoresLineas(lineas || [])
    setVista("detalle")
  }

  const abrirModalValor = () => {
    setModalValor(true)
  }

  const guardarValorLinea = () => {
    // reemplazado por ModalMedioPago
  }

  const eliminarValorLinea = (idx: number) => {
    setFormValoresLineas(prev => prev.filter((_, i) => i !== idx))
  }

  const guardarAjuste = async () => {
    if (!formConcepto || !formImporte || !formCaja || formValoresLineas.length === 0) return
    if (requiereObs && !formObs.trim()) { setErrorObs("Observaciones obligatorias para este concepto"); return }
    setGuardando(true)
    const supabase = createClient()
    const caja = cajasDisp.find(c => c.id === formCaja)
    const concepto = conceptos.find(c => c.id === formConcepto)
    const datos = {
      concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
      importe: parseFloat(formImporte), fecha: formFecha, sucursal: caja?.sucursal,
      caja_id: formCaja, caja_nombre: caja?.nombre,
      cuenta_analitica: formCuentaAnalitica || null, es_automatico: formAuto, observaciones: formObs,
    }
    let ajusteId: string
    if (ajusteSel?.id) {
      await supabase.from("ajustes_caja").update(datos).eq("id", ajusteSel.id)
      ajusteId = ajusteSel.id
      await supabase.from("ajuste_caja_valores").delete().eq("ajuste_id", ajusteId)
    } else {
      const { data: numData } = await supabase.rpc("generar_numero_ajuste_caja", { p_sucursal: caja?.sucursal || "" })
      const { data: inserted } = await supabase
        .from("ajustes_caja")
        .insert({ ...datos, numero: numData })
        .select("id")
        .single()
      ajusteId = inserted!.id
    }
    await supabase.from("ajuste_caja_valores").insert(
      formValoresLineas.map(l => ({
        ajuste_id: ajusteId,
        valor_id: l.valor_id,
        valor_nombre: l.valor_nombre,
        tipo_movimiento: l.tipo_movimiento,
        importe: l.importe,
      }))
    )
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const publicarAjuste = async () => {
    if (!ajusteSel) return
    if (requiereObs && !formObs.trim()) { setErrorObs("Observaciones obligatorias para este concepto"); return }
    if (formValoresLineas.length === 0) { alert("Agregue al menos un valor antes de publicar."); return }
    setGuardando(true)
    const supabase = createClient()
    const { data: extracto } = await supabase
      .from("extractos_caja").select("id")
      .eq("caja_id", ajusteSel.caja_id).eq("estado", "abierto").single()
    if (!extracto) {
      alert("No hay extracto abierto para esta caja.")
      setGuardando(false)
      return
    }
    for (const linea of formValoresLineas) {
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id,
        valor_id: linea.valor_id,
        valor_nombre: linea.valor_nombre,
        tipo_movimiento: linea.tipo_movimiento === "entrada" ? "ingreso" : "egreso",
        importe: linea.importe,
        concepto: ajusteSel.concepto_nombre,
        documento_origen_tipo: "ajuste_caja",
        documento_origen_id: ajusteSel.id,
        documento_origen_numero: ajusteSel.numero,
      })
    }
    await supabase.from("ajustes_caja").update({ estado: "publicado" }).eq("id", ajusteSel.id)
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const esPublicado = ajusteSel?.estado === "publicado"

  if (vista === "lista") {
    return (
      <FinanzasListSection<AjusteCaja>
        title="Ajustes de Caja" subtitle="Banco y Caja" moduleName="finanzas_ajustes_caja"
        data={ajustes} loading={loading}
        searchFields={["numero", "concepto_nombre", "caja_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "caja_nombre", label: "Caja" }]}
        actions={<button onClick={nuevoAjuste} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Ajuste</button>}
      >
        {(filtered) => (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">N° Ajuste</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Caja</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => abrirDetalle(a)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{a.numero}</td>
                    <td className="py-3 px-4 text-gray-600">{a.fecha}</td>
                    <td className="py-3 px-4 text-gray-700">{a.concepto_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{a.caja_nombre}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(a.importe))}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${a.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {a.estado === "publicado" ? "Publicado" : "Borrador"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No hay ajustes de caja</div>}
          </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVista("lista")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">← Ajustes</button>
          <h1 className="text-2xl font-bold text-amber-900">{ajusteSel ? ajusteSel.numero : "Nuevo Ajuste de Caja"}</h1>
          {ajusteSel && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ajusteSel.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {ajusteSel.estado === "publicado" ? "Publicado" : "Borrador"}
            </span>
          )}
        </div>
        {!esPublicado && (
          <div className="flex gap-2">
            <button onClick={guardarAjuste} disabled={guardando} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            {ajusteSel?.id && (
              <button onClick={publicarAjuste} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
                Publicar
              </button>
            )}
          </div>
        )}
      </div>

      {errorObs && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorObs}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto *</label>
              <select value={formConcepto} onChange={e => setFormConcepto(e.target.value)} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {requiereObs && <span className="text-xs text-amber-600 mt-1 block">* Requiere observación</span>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Importe *</label>
              <input type="number" step="0.01" min="0" value={formImporte} onChange={e => setFormImporte(e.target.value)} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Caja *</label>
              <select value={formCaja} onChange={e => { setFormCaja(e.target.value); setFormValoresLineas([]); if (e.target.value) cargarValoresCaja(e.target.value) }} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {cajasDisp.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.sucursal}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={formAuto} onChange={e => setFormAuto(e.target.checked)} disabled={esPublicado} className="rounded" />
              <span className="text-sm">Automático</span>
            </label>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Sucursal</p>
              <p className="font-medium text-gray-900">{cajasDisp.find(c => c.id === formCaja)?.sucursal || "—"}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Analítica</label>
              <input value={formCuentaAnalitica} onChange={e => setFormCuentaAnalitica(e.target.value)} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones {requiereObs && <span className="text-red-500">*</span>}</label>
              <textarea value={formObs} onChange={e => { setFormObs(e.target.value); setErrorObs("") }} rows={4} disabled={esPublicado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
          </div>
        </div>

        {/* Sección Valor — grilla multi-línea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Valor *</label>
            {!esPublicado && formCaja && (
              <button onClick={abrirModalValor} className="bg-indigo-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            )}
          </div>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Forma de Pago</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Tipo de Movimiento</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Importe</th>
                  {!esPublicado && <th className="py-2 px-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {formValoresLineas.map((linea, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-sm text-gray-700">{linea.valor_nombre}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${linea.tipo_movimiento === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {linea.tipo_movimiento === "entrada" ? "Entrada" : "Salida"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sm">{formatMonto(linea.importe)}</td>
                    {!esPublicado && (
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => eliminarValorLinea(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {formValoresLineas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-gray-400">
                      {formCaja ? "Sin valores. Haga clic en «Agregar» para añadir un medio de pago." : "Seleccione una caja primero."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Agregar Valor */}
      {modalValor && (
        <ModalMedioPago
          cajaId={formCaja}
          showTipoMovimiento={true}
          defaultTipoMovimiento={defaultTipoMovByConcepto()}
          onGuardar={(result, yNuevo) => {
            setFormValoresLineas(prev => [...prev, {
              valor_id: result.valor_id,
              valor_nombre: `${result.valor_nombre} (${result.moneda})`,
              tipo_movimiento: result.tipo_movimiento || "salida",
              importe: result.importe,
            }])
            if (!yNuevo) setModalValor(false)
          }}
          onCerrar={() => setModalValor(false)}
        />
      )}
    </div>
  )
}

// ─── Registros de Banco ─────────────────────────────────────────────────────

function RegistrosBanco() {
  const [registros, setRegistros] = useState<RegistroBanco[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [regSel, setRegSel] = useState<RegistroBanco | null>(null)
  const [tabActiva, setTabActiva] = useState<"comprobantes" | "valores" | "observaciones">("comprobantes")
  const [guardando, setGuardando] = useState(false)

  const [formCuenta, setFormCuenta] = useState("")
  const [formCuentaNombre, setFormCuentaNombre] = useState("")
  const [formConcepto, setFormConcepto] = useState("")
  const [formMoneda, setFormMoneda] = useState("ARS")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formFechaPago, setFormFechaPago] = useState("")
  const [formObs, setFormObs] = useState("")
  const [formSucursal, setFormSucursal] = useState("")
  const [comprobantes, setComprobantes] = useState<Partial<RegistroCajaComprobante>[]>([])
  const [valoresBanco, setValoresBanco] = useState<{ nombre: string; importe_comprobante: number; moneda_comprobante: string; importe: number; moneda: string }[]>([])
  const [mostrarModalValor, setMostrarModalValor] = useState(false)
  const [nuevoValorNombre, setNuevoValorNombre] = useState("")
  const [nuevoValorImporte, setNuevoValorImporte] = useState("")

  const { sucursales } = useERP()
  const formatMonto = (m: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)
  const hoy = new Date().toISOString().split("T")[0]

  const cargarDatos = async () => {
    setLoading(true)
    const supabase = createClient()
    const [regRes, conRes] = await Promise.all([
      supabase.from("registros_banco").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("conceptos_registro_caja").select("*").eq("activo", true).eq("visible_en_banco", true).order("nombre"),
    ])
    setRegistros(regRes.data || [])
    setConceptos(conRes.data || [])
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const abrirDetalle = async (reg: RegistroBanco) => {
    const supabase = createClient()
    const [cR, vR] = await Promise.all([
      supabase.from("registro_banco_comprobantes").select("*").eq("registro_id", reg.id),
      supabase.from("registro_banco_valores").select("*").eq("registro_id", reg.id),
    ])
    setRegSel({ ...reg, comprobantes: cR.data || [], valores: vR.data || [] })
    setFormCuenta(reg.cuenta_bancaria_id)
    setFormCuentaNombre(reg.cuenta_bancaria_nombre)
    setFormConcepto(reg.concepto_id)
    setFormMoneda(reg.moneda)
    setFormFecha(reg.fecha)
    setFormFechaPago(reg.fecha_probable_pago || "")
    setFormObs(reg.observaciones || "")
    setFormSucursal(reg.sucursal || "")
    setComprobantes(cR.data || [])
    setValoresBanco(vR.data || [])
    setTabActiva("comprobantes")
    setVista("detalle")
  }

  const nuevoRegistro = () => {
    setRegSel(null)
    setFormCuenta("")
    setFormCuentaNombre("")
    setFormConcepto("")
    setFormMoneda("ARS")
    setFormFecha(hoy)
    setFormFechaPago("")
    setFormObs("")
    setFormSucursal("")
    setComprobantes([])
    setValoresBanco([])
    setTabActiva("comprobantes")
    setVista("detalle")
  }

  const guardarRegistro = async () => {
    if (!formCuentaNombre || !formConcepto || !formFecha) return
    setGuardando(true)
    const supabase = createClient()
    const concepto = conceptos.find(c => c.id === formConcepto)
    const totalC = comprobantes.reduce((a, c) => a + Number(c.total || 0), 0)
    const totalV = valoresBanco.reduce((a, v) => a + Number(v.importe || 0), 0)

    if (regSel?.id) {
      await supabase.from("registros_banco").update({
        cuenta_bancaria_nombre: formCuentaNombre, sucursal: formSucursal,
        concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
        moneda: formMoneda, fecha: formFecha, fecha_probable_pago: formFechaPago || null,
        observaciones: formObs, total_comprobantes: totalC, total_valores: totalV,
      }).eq("id", regSel.id)
      await supabase.from("registro_banco_comprobantes").delete().eq("registro_id", regSel.id)
      if (comprobantes.length > 0) await supabase.from("registro_banco_comprobantes").insert(comprobantes.map(c => ({ ...c, id: undefined, registro_id: regSel.id })))
      await supabase.from("registro_banco_valores").delete().eq("registro_id", regSel.id)
      if (valoresBanco.length > 0) await supabase.from("registro_banco_valores").insert(valoresBanco.map(v => ({ ...v, id: undefined, registro_id: regSel.id })))
    } else {
      const { data: numData } = await supabase.rpc("generar_numero_registro_banco", { p_sucursal: formSucursal || "" })
      const { data: newReg } = await supabase.from("registros_banco").insert({
        numero: numData, cuenta_bancaria_nombre: formCuentaNombre, sucursal: formSucursal,
        concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
        moneda: formMoneda, fecha: formFecha, fecha_probable_pago: formFechaPago || null,
        observaciones: formObs, total_comprobantes: totalC, total_valores: totalV,
      }).select().single()
      if (newReg) {
        if (comprobantes.length > 0) await supabase.from("registro_banco_comprobantes").insert(comprobantes.map(c => ({ ...c, id: undefined, registro_id: newReg.id })))
        if (valoresBanco.length > 0) await supabase.from("registro_banco_valores").insert(valoresBanco.map(v => ({ ...v, id: undefined, registro_id: newReg.id })))
      }
    }
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const confirmarRegistro = async () => {
    if (!regSel) return
    setGuardando(true)
    const supabase = createClient()
    await supabase.from("registros_banco").update({ estado: "confirmado" }).eq("id", regSel.id)
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const addComprobante = () => {
    setComprobantes(prev => [...prev, { tipo: "Cuenta Contable", comprobante: "", proveedor_nombre: "", descripcion: "", cuenta_contable: "", cuenta_analitica: "", importe: 0, impuestos: 0, total: 0 }])
  }
  const updateComprobante = (idx: number, field: string, value: string | number) => {
    setComprobantes(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      if (field === "importe" || field === "impuestos") copy[idx].total = Number(copy[idx].importe || 0) + Number(copy[idx].impuestos || 0)
      return copy
    })
  }
  const removeComprobante = (idx: number) => setComprobantes(prev => prev.filter((_, i) => i !== idx))

  const addValorBanco = () => {
    if (!nuevoValorNombre || !nuevoValorImporte) return
    setValoresBanco(prev => [...prev, { nombre: nuevoValorNombre, importe_comprobante: parseFloat(nuevoValorImporte), moneda_comprobante: formMoneda, importe: parseFloat(nuevoValorImporte), moneda: formMoneda }])
    setNuevoValorNombre("")
    setNuevoValorImporte("")
    setMostrarModalValor(false)
  }
  const removeValorBanco = (idx: number) => setValoresBanco(prev => prev.filter((_, i) => i !== idx))

  const totalComprobantes = comprobantes.reduce((a, c) => a + Number(c.total || 0), 0)
  const totalValores = valoresBanco.reduce((a, v) => a + Number(v.importe || 0), 0)
  const esConfirmado = regSel?.estado === "confirmado"

  if (vista === "lista") {
    return (
      <FinanzasListSection<RegistroBanco>
        title="Registros de Banco" subtitle="Banco y Caja" moduleName="finanzas_registros_banco"
        data={registros} loading={loading}
        searchFields={["numero", "cuenta_bancaria_nombre", "concepto_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "cuenta_bancaria_nombre", label: "Cuenta Bancaria" }]}
        actions={<button onClick={nuevoRegistro} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Registro</button>}
      >
        {(filtered) => (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">N° Registro</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Bancaria</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total Comp.</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total Val.</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => abrirDetalle(r)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{r.numero}</td>
                    <td className="py-3 px-4 text-gray-600">{r.fecha}</td>
                    <td className="py-3 px-4 text-gray-700">{r.cuenta_bancaria_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{r.concepto_nombre}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(r.total_comprobantes))}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(r.total_valores))}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {r.estado === "confirmado" ? "Confirmado" : "Borrador"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No hay registros de banco</div>}
          </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVista("lista")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">← Registros</button>
          <h1 className="text-2xl font-bold text-amber-900">{regSel ? regSel.numero : "Nuevo Registro de Banco"}</h1>
          {regSel && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${regSel.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {regSel.estado === "confirmado" ? "Confirmado" : "Borrador"}
            </span>
          )}
        </div>
        {!esConfirmado && (
          <div className="flex gap-2">
            <button onClick={guardarRegistro} disabled={guardando} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            {regSel?.id && (
              <button onClick={confirmarRegistro} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
                Confirmar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Bancaria *</label>
              <input value={formCuentaNombre} onChange={e => setFormCuentaNombre(e.target.value)} disabled={esConfirmado}
                placeholder="Nombre de cuenta bancaria"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto *</label>
              <select value={formConcepto} onChange={e => setFormConcepto(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <select value={formMoneda} onChange={e => setFormMoneda(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Probable de Pago</label>
              <input type="date" value={formFechaPago} onChange={e => setFormFechaPago(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esConfirmado}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Total Comprobantes</p>
              <p className="font-medium text-gray-900 font-mono">{formatMonto(totalComprobantes)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Total Valores</p>
              <p className="font-medium text-gray-900 font-mono">{formatMonto(totalValores)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 px-4">
          {([
            { id: "comprobantes" as const, label: "Comprobantes" },
            { id: "valores" as const, label: "Valores" },
            { id: "observaciones" as const, label: "Observaciones" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)}
              className={`px-5 py-3 text-sm font-medium relative transition-colors ${tabActiva === tab.id ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"}`}>
              {tab.label}
              {tabActiva === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "comprobantes" && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Comprobante</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Cta. Contable</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Impuestos</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    {!esConfirmado && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((c, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3"><input value={c.tipo || ""} onChange={e => updateComprobante(i, "tipo", e.target.value)} disabled={esConfirmado} className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input value={c.comprobante || ""} onChange={e => updateComprobante(i, "comprobante", e.target.value)} disabled={esConfirmado} className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input value={c.proveedor_nombre || ""} onChange={e => updateComprobante(i, "proveedor_nombre", e.target.value)} disabled={esConfirmado} className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input value={c.descripcion || ""} onChange={e => updateComprobante(i, "descripcion", e.target.value)} disabled={esConfirmado} className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input value={c.cuenta_contable || ""} onChange={e => updateComprobante(i, "cuenta_contable", e.target.value)} disabled={esConfirmado} className="w-full border border-gray-200 rounded px-2 py-1 text-sm disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input type="number" step="0.01" value={c.importe ?? ""} onChange={e => updateComprobante(i, "importe", parseFloat(e.target.value) || 0)} disabled={esConfirmado} className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm font-mono disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3"><input type="number" step="0.01" value={c.impuestos ?? ""} onChange={e => updateComprobante(i, "impuestos", parseFloat(e.target.value) || 0)} disabled={esConfirmado} className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm font-mono disabled:bg-gray-50" /></td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{formatMonto(Number(c.total || 0))}</td>
                      {!esConfirmado && <td className="py-2 px-1"><button onClick={() => removeComprobante(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-semibold"><td colSpan={7} className="py-2 px-3 text-right text-xs uppercase text-gray-500">Total</td><td className="py-2 px-3 text-right font-mono">{formatMonto(totalComprobantes)}</td>{!esConfirmado && <td></td>}</tr></tfoot>
              </table>
              {!esConfirmado && <button onClick={addComprobante} className="mt-3 text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Añadir un elemento</button>}
            </div>
          )}
          {tabActiva === "valores" && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe Comp.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Moneda Comp.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                    {!esConfirmado && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {valoresBanco.map((v, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{v.nombre}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatMonto(v.importe_comprobante)}</td>
                      <td className="py-2 px-3 text-gray-600">{v.moneda_comprobante}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatMonto(v.importe)}</td>
                      <td className="py-2 px-3 text-gray-600">{v.moneda}</td>
                      {!esConfirmado && <td className="py-2 px-1"><button onClick={() => removeValorBanco(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-semibold"><td colSpan={3} className="py-2 px-3 text-right text-xs uppercase text-gray-500">Total</td><td className="py-2 px-3 text-right font-mono">{formatMonto(totalValores)}</td><td></td>{!esConfirmado && <td></td>}</tr></tfoot>
              </table>
              {!esConfirmado && <button onClick={() => setMostrarModalValor(true)} className="mt-3 text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Añadir un elemento</button>}
              {mostrarModalValor && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4">Agregar Valor</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                        <input value={nuevoValorNombre} onChange={e => setNuevoValorNombre(e.target.value)}
                          placeholder="Ej: Débito bancario" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
                        <input type="number" step="0.01" value={nuevoValorImporte} onChange={e => setNuevoValorImporte(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setMostrarModalValor(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                      <button onClick={addValorBanco} disabled={!nuevoValorNombre || !nuevoValorImporte}
                        className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:bg-gray-300">Agregar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={6} disabled={esConfirmado}
              placeholder="Observaciones..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Ajustes de Banco ───────────────────────────────────────────────────────

function AjustesBanco() {
  const [ajustes, setAjustes] = useState<AjusteBanco[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [ajusteSel, setAjusteSel] = useState<AjusteBanco | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [formCuentaNombre, setFormCuentaNombre] = useState("")
  const [formConcepto, setFormConcepto] = useState("")
  const [formImporte, setFormImporte] = useState("")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formSucursal, setFormSucursal] = useState("")
  const [formCuentaAnalitica, setFormCuentaAnalitica] = useState("")
  const [formObs, setFormObs] = useState("")

  const { sucursales } = useERP()
  const formatMonto = (m: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)

  const cargarDatos = async () => {
    setLoading(true)
    const supabase = createClient()
    const [ajRes, conRes] = await Promise.all([
      supabase.from("ajustes_banco").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("conceptos_registro_caja").select("*").eq("activo", true).eq("visible_en_banco", true).order("nombre"),
    ])
    setAjustes(ajRes.data || [])
    setConceptos(conRes.data || [])
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const estadoLabel = (e: string) => ({ borrador: "Borrador", ajuste_pendiente: "Ajuste Pendiente", publicado: "Publicado" }[e] || e)
  const estadoColor = (e: string) => ({ borrador: "bg-yellow-100 text-yellow-700", ajuste_pendiente: "bg-blue-100 text-blue-700", publicado: "bg-green-100 text-green-700" }[e] || "bg-gray-100 text-gray-500")

  const nuevoAjuste = () => {
    setAjusteSel(null)
    setFormCuentaNombre("")
    setFormConcepto("")
    setFormImporte("")
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormSucursal("")
    setFormCuentaAnalitica("")
    setFormObs("")
    setVista("detalle")
  }

  const abrirDetalle = (aj: AjusteBanco) => {
    setAjusteSel(aj)
    setFormCuentaNombre(aj.cuenta_bancaria_nombre)
    setFormConcepto(aj.concepto_id)
    setFormImporte(String(aj.importe))
    setFormFecha(aj.fecha)
    setFormSucursal(aj.sucursal || "")
    setFormCuentaAnalitica(aj.cuenta_analitica || "")
    setFormObs(aj.observaciones || "")
    setVista("detalle")
  }

  const guardarAjuste = async () => {
    if (!formCuentaNombre || !formConcepto || !formImporte) return
    setGuardando(true)
    const supabase = createClient()
    const concepto = conceptos.find(c => c.id === formConcepto)
    const datos = {
      cuenta_bancaria_nombre: formCuentaNombre, concepto_id: formConcepto, concepto_nombre: concepto?.nombre,
      importe: parseFloat(formImporte), fecha: formFecha, sucursal: formSucursal,
      cuenta_analitica: formCuentaAnalitica || null, observaciones: formObs,
    }
    if (ajusteSel?.id) {
      await supabase.from("ajustes_banco").update(datos).eq("id", ajusteSel.id)
    } else {
      const { data: numData } = await supabase.rpc("generar_numero_ajuste_banco", { p_sucursal: formSucursal || "" })
      await supabase.from("ajustes_banco").insert({ ...datos, numero: numData })
    }
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const confirmarAjuste = async () => {
    if (!ajusteSel) return
    setGuardando(true)
    const supabase = createClient()
    await supabase.from("ajustes_banco").update({ estado: "ajuste_pendiente" }).eq("id", ajusteSel.id)
    setGuardando(false)
    await cargarDatos()
    setVista("lista")
  }

  const esSoloLectura = ajusteSel?.estado === "ajuste_pendiente" || ajusteSel?.estado === "publicado"

  if (vista === "lista") {
    return (
      <FinanzasListSection<AjusteBanco>
        title="Ajustes de Banco" subtitle="Banco y Caja" moduleName="finanzas_ajustes_banco"
        data={ajustes} loading={loading}
        searchFields={["numero", "cuenta_bancaria_nombre", "concepto_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "cuenta_bancaria_nombre", label: "Cuenta Bancaria" }]}
        actions={<button onClick={nuevoAjuste} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Ajuste</button>}
      >
        {(filtered) => (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">N° Ajuste</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Bancaria</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => abrirDetalle(a)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{a.numero}</td>
                    <td className="py-3 px-4 text-gray-600">{a.fecha}</td>
                    <td className="py-3 px-4 text-gray-700">{a.cuenta_bancaria_nombre}</td>
                    <td className="py-3 px-4 text-gray-600">{a.concepto_nombre}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(a.importe))}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(a.estado)}`}>
                        {estadoLabel(a.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No hay ajustes de banco</div>}
          </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVista("lista")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">← Ajustes</button>
          <h1 className="text-2xl font-bold text-amber-900">{ajusteSel ? ajusteSel.numero : "Nuevo Ajuste de Banco"}</h1>
          {ajusteSel && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(ajusteSel.estado)}`}>
              {estadoLabel(ajusteSel.estado)}
            </span>
          )}
        </div>
        {!esSoloLectura && (
          <div className="flex gap-2">
            <button onClick={guardarAjuste} disabled={guardando} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            {ajusteSel?.id && ajusteSel.estado === "borrador" && (
              <button onClick={confirmarAjuste} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
                Confirmar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Bancaria *</label>
              <input value={formCuentaNombre} onChange={e => setFormCuentaNombre(e.target.value)} disabled={esSoloLectura}
                placeholder="Nombre de cuenta bancaria"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto *</label>
              <select value={formConcepto} onChange={e => setFormConcepto(e.target.value)} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Importe *</label>
              <input type="number" step="0.01" value={formImporte} onChange={e => setFormImporte(e.target.value)} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100">
                <option value="">Seleccionar...</option>
                {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Analítica</label>
              <input value={formCuentaAnalitica} onChange={e => setFormCuentaAnalitica(e.target.value)} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={3} disabled={esSoloLectura}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sección Transferencias de Caja ─────────────────────────────────────────
function TransferenciasCaja() {
  const { sucursales } = useERP()
  const supabase = createClient()

  const [lista, setLista] = useState<TransferenciaCaja[]>([])
  const [cajas, setCajas] = useState<{ id: string; nombre: string; sucursal: string }[]>([])
  const [valoresCaja, setValoresCaja] = useState<{ id: string; caja_id: string; nombre: string }[]>([])
  const [seleccion, setSeleccion] = useState<TransferenciaCaja | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState("")

  // Form state
  const [formSucursal, setFormSucursal] = useState("")
  const [formCajaDesde, setFormCajaDesde] = useState("")
  const [formCajaHasta, setFormCajaHasta] = useState("")
  const [formValor, setFormValor] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formConcepto, setFormConcepto] = useState("Transferencia")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formObs, setFormObs] = useState("")

  // Valores tab
  const [valoresLineas, setValoresLineas] = useState<TransferenciaCajaValor[]>([])
  const [tabActiva, setTabActiva] = useState<"valores" | "info" | "observaciones">("valores")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarLista(); cargarCajas() }, [])

  const cargarCajas = async () => {
    const { data } = await supabase.from("cajas").select("id, nombre, sucursal").eq("activa", true)
    if (data) setCajas(data)
    const { data: vals } = await supabase.from("caja_valores").select("id, caja_id, nombre")
    if (vals) setValoresCaja(vals)
  }

  const cargarLista = async () => {
    const { data } = await supabase
      .from("transferencias_caja")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase
      .from("transferencias_caja")
      .select("*")
      .eq("id", id)
      .single()
    if (data) {
      setSeleccion(data)
      setFormSucursal(data.sucursal || "")
      setFormCajaDesde(data.caja_desde_id || "")
      setFormCajaHasta(data.caja_hasta_id || "")
      setFormValor(data.valor_id || "")
      setFormImporte(data.importe || 0)
      setFormConcepto(data.concepto || "Transferencia")
      setFormFecha(data.fecha || new Date().toISOString().split("T")[0])
      setFormObs(data.observaciones || "")
      setModoCrear(false)
      // Cargar valores
      const { data: vals } = await supabase
        .from("transferencia_caja_valores")
        .select("*")
        .eq("transferencia_id", id)
      setValoresLineas(vals || [])
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null)
    setModoCrear(true)
    setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormCajaDesde("")
    setFormCajaHasta("")
    setFormValor("")
    setFormImporte(0)
    setFormConcepto("Transferencia")
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormObs("")
    setValoresLineas([])
    setTabActiva("valores")
  }

  const guardar = async () => {
    if (!formCajaDesde || !formCajaHasta) { alert("Seleccioná caja origen y destino"); return }
    if (formCajaDesde === formCajaHasta) { alert("La caja origen y destino no pueden ser la misma"); return }
    if (formImporte <= 0 && valoresLineas.length === 0) { alert("El importe debe ser mayor a 0"); return }

    setGuardando(true)
    const cajaDesde = cajas.find(c => c.id === formCajaDesde)
    const cajaHasta = cajas.find(c => c.id === formCajaHasta)
    const valor = valoresCaja.find(v => v.id === formValor)
    const importeTotal = valoresLineas.length > 0
      ? valoresLineas.reduce((s, v) => s + v.importe, 0)
      : formImporte

    if (modoCrear) {
      // Generar número
      const { data: numData } = await supabase.rpc("generar_numero_transferencia_caja", { p_sucursal: formSucursal })
      const numero = numData || `TRC-${Date.now()}`

      const { data: nuevo, error } = await supabase.from("transferencias_caja").insert({
        numero,
        sucursal: formSucursal,
        caja_desde_id: formCajaDesde,
        caja_desde_nombre: cajaDesde?.nombre || "",
        caja_hasta_id: formCajaHasta,
        caja_hasta_nombre: cajaHasta?.nombre || "",
        valor_id: formValor || null,
        valor_nombre: valor?.nombre || "",
        importe: importeTotal,
        concepto: formConcepto,
        fecha: formFecha,
        observaciones: formObs,
      }).select().single()

      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo && valoresLineas.length > 0) {
        await supabase.from("transferencia_caja_valores").insert(
          valoresLineas.map(v => ({ transferencia_id: nuevo.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe }))
        )
      }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("transferencias_caja").update({
        sucursal: formSucursal,
        caja_desde_id: formCajaDesde,
        caja_desde_nombre: cajaDesde?.nombre || "",
        caja_hasta_id: formCajaHasta,
        caja_hasta_nombre: cajaHasta?.nombre || "",
        valor_id: formValor || null,
        valor_nombre: valor?.nombre || "",
        importe: importeTotal,
        concepto: formConcepto,
        fecha: formFecha,
        observaciones: formObs,
        updated_at: new Date().toISOString(),
      }).eq("id", seleccion.id)

      // Reemplazar valores
      await supabase.from("transferencia_caja_valores").delete().eq("transferencia_id", seleccion.id)
      if (valoresLineas.length > 0) {
        await supabase.from("transferencia_caja_valores").insert(
          valoresLineas.map(v => ({ transferencia_id: seleccion.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe }))
        )
      }
      await cargarLista()
      await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarTransferencia = async () => {
    if (!seleccion || guardando) return
    setGuardando(true)
    try {
    // 1. Verificar extracto abierto en caja origen
    const { data: extractoOrigen } = await supabase
      .from("extractos_caja").select("id")
      .eq("caja_id", seleccion.caja_desde_id).eq("estado", "abierto").single()
    if (!extractoOrigen) {
      alert(`No hay extracto abierto para "${seleccion.caja_desde_nombre}".`)
      return
    }

    // 2. Verificar extracto abierto en caja destino
    const { data: extractoDestino } = await supabase
      .from("extractos_caja").select("id")
      .eq("caja_id", seleccion.caja_hasta_id).eq("estado", "abierto").single()
    if (!extractoDestino) {
      alert(`No hay extracto abierto para "${seleccion.caja_hasta_nombre}".`)
      return
    }

    // 3. Movimiento de SALIDA en extracto origen (egreso)
    const { data: movSalida } = await supabase
      .from("movimientos_caja").insert({
        extracto_id: extractoOrigen.id,
        valor_id: seleccion.valor_id,
        valor_nombre: seleccion.valor_nombre,
        tipo_movimiento: "egreso",
        importe: seleccion.importe,
        concepto: `Transf. a ${seleccion.caja_hasta_nombre}`,
        documento_origen_tipo: "transferencia_caja_salida",
        documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero,
        estado_movimiento: "confirmado",
      }).select().single()

    // 4. Movimiento de ENTRADA en extracto destino (ingreso, pendiente)
    const { data: movEntrada } = await supabase
      .from("movimientos_caja").insert({
        extracto_id: extractoDestino.id,
        valor_id: seleccion.valor_id,
        valor_nombre: seleccion.valor_nombre,
        tipo_movimiento: "ingreso",
        importe: seleccion.importe,
        concepto: `Transf. desde ${seleccion.caja_desde_nombre}`,
        documento_origen_tipo: "transferencia_caja_entrada",
        documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero,
        estado_movimiento: "pendiente",
      }).select().single()

    // 5. Actualizar transferencia
    await supabase.from("transferencias_caja").update({
      estado: "pendiente",
      comprobante_salida_id: movSalida?.id,
      comprobante_entrada_id: movEntrada?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", seleccion.id)

    await cargarLista()
    await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const recibirTransferencia = async () => {
    if (!seleccion || seleccion.estado !== "pendiente") return
    // Confirmar el movimiento de entrada
    await supabase.from("movimientos_caja")
      .update({ estado_movimiento: "confirmado" })
      .eq("id", seleccion.comprobante_entrada_id)
    // Cambiar estado a publicado
    await supabase.from("transferencias_caja")
      .update({ estado: "publicado", updated_at: new Date().toISOString() })
      .eq("id", seleccion.id)
    await cargarLista()
    await cargarDetalle(seleccion.id)
  }

  const cancelarTransferencia = async () => {
    if (!seleccion || seleccion.estado !== "pendiente") return
    // Cancelar AMBOS movimientos
    const ids = [seleccion.comprobante_salida_id, seleccion.comprobante_entrada_id].filter(Boolean)
    if (ids.length > 0) {
      await supabase.from("movimientos_caja")
        .update({ estado_movimiento: "cancelado" })
        .in("id", ids)
    }
    await supabase.from("transferencias_caja")
      .update({ estado: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", seleccion.id)
    await cargarLista()
    await cargarDetalle(seleccion.id)
  }

  // Agregar valor a la grilla
  const agregarValor = () => {
    if (!formValor) return
    const val = valoresCaja.find(v => v.id === formValor)
    if (!val) return
    setValoresLineas([...valoresLineas, {
      id: crypto.randomUUID(),
      transferencia_id: seleccion?.id || "",
      valor_id: val.id,
      valor_nombre: val.nombre,
      importe: 0,
    }])
  }

  const eliminarValor = (idx: number) => {
    setValoresLineas(valoresLineas.filter((_, i) => i !== idx))
  }

  const actualizarImporteValor = (idx: number, importe: number) => {
    setValoresLineas(valoresLineas.map((v, i) => i === idx ? { ...v, importe } : v))
  }

  // Filtrado
  const valoresDisponibles = valoresCaja.filter(v => v.caja_id === formCajaDesde)
  const cajasDestinoFiltradas = cajas.filter(c => c.id !== formCajaDesde)
  const listaFiltrada = lista.filter(t => {
    if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false
    if (busqueda) {
      const b = busqueda.toLowerCase()
      return t.numero.toLowerCase().includes(b) || t.caja_desde_nombre?.toLowerCase().includes(b) || t.caja_hasta_nombre?.toLowerCase().includes(b)
    }
    return true
  })

  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false

  const badgeEstado = (estado: string) => {
    const map: Record<string, string> = {
      borrador: "bg-gray-100 text-gray-700",
      pendiente: "bg-yellow-100 text-yellow-700",
      publicado: "bg-green-100 text-green-700",
      cancelado: "bg-red-100 text-red-700",
    }
    const labels: Record<string, string> = {
      borrador: "Borrador", pendiente: "Pendiente", publicado: "Publicado", cancelado: "Cancelado",
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[estado] || ""}`}>{labels[estado] || estado}</span>
  }

  // ── Vista Lista ──
  if (!seleccion && !modoCrear) {
    return (
      <FinanzasListSection<TransferenciaCaja>
        title="Transferencias de Caja" moduleName="finanzas_transferencias_caja"
        data={lista}
        searchFields={["numero", "caja_desde_nombre", "caja_hasta_nombre", "sucursal", "concepto"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "sucursal", label: "Sucursal" }]}
        actions={<button onClick={iniciarCreacion} className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"><Plus className="w-4 h-4" /> Nueva Transferencia</button>}
      >
        {(filtered) => (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">N° Transferencia</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Sucursal</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Caja Desde</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Caja Hasta</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Concepto</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500">No hay transferencias</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} onClick={() => cargarDetalle(t.id)}
                  className={`border-b cursor-pointer hover:bg-gray-50 ${t.estado === "pendiente" ? "bg-yellow-50" : ""}`}>
                  <td className="py-3 px-4 font-mono text-xs">{t.numero}</td>
                  <td className="py-3 px-4">{t.fecha}</td>
                  <td className="py-3 px-4">{t.sucursal}</td>
                  <td className="py-3 px-4">{t.caja_desde_nombre}</td>
                  <td className="py-3 px-4">{t.caja_hasta_nombre}</td>
                  <td className="py-3 px-4">{t.concepto}</td>
                  <td className="py-3 px-4 text-right font-medium">${t.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-center">{badgeEstado(t.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </FinanzasListSection>
    )
  }

  // ── Vista Detalle / Crear ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setSeleccion(null); setModoCrear(false) }}
          className="p-1.5 hover:bg-gray-100 rounded-md">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-amber-900">
            {modoCrear ? "Nueva Transferencia de Caja" : seleccion?.numero}
          </h2>
          {seleccion && <div className="mt-1">{badgeEstado(seleccion.estado)}</div>}
        </div>
        <div className="flex items-center gap-2">
          {(modoCrear || seleccion?.estado === "borrador") && (
            <button onClick={guardar} disabled={guardando}
              className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          )}
          {seleccion?.estado === "borrador" && (
            <button onClick={confirmarTransferencia} disabled={guardando}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4 inline mr-1" /> {guardando ? "Procesando..." : "Confirmar"}
            </button>
          )}
          {seleccion?.estado === "pendiente" && (
            <>
              <button onClick={recibirTransferencia}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <Check className="w-4 h-4 inline mr-1" /> Confirmar Recepción
              </button>
              <button onClick={cancelarTransferencia}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <X className="w-4 h-4 inline mr-1" /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mensajes de estado */}
      {seleccion?.estado === "pendiente" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4" />
          ¿Recibiste ${seleccion.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })} en {seleccion.valor_nombre || "valores"}? Confirmá o cancelá la recepción.
        </div>
      )}
      {seleccion?.estado === "publicado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
          <Check className="w-4 h-4" /> Transferencia completada
        </div>
      )}
      {seleccion?.estado === "cancelado" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
          <X className="w-4 h-4" /> Transferencia cancelada — el dinero permaneció en {seleccion.caja_desde_nombre}
        </div>
      )}

      {/* Formulario cabecera */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja Desde</label>
            <select value={formCajaDesde} onChange={e => { setFormCajaDesde(e.target.value); setFormValor("") }} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja Hasta</label>
            <select value={formCajaHasta} onChange={e => setFormCajaHasta(e.target.value)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cajasDestinoFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Valor Principal</label>
            <select value={formValor} onChange={e => setFormValor(e.target.value)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {valoresDisponibles.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
            <input type="number" value={formImporte} onChange={e => setFormImporte(parseFloat(e.target.value) || 0)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Concepto</label>
            <input value={formConcepto} onChange={e => setFormConcepto(e.target.value)} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex border-b">
          {[
            { id: "valores" as const, label: "Valores Transferidos" },
            { id: "info" as const, label: "Otra Información" },
            { id: "observaciones" as const, label: "Observaciones" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tabActiva === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tabActiva === "valores" && (
            <div className="space-y-3">
              {!esSoloLectura && (
                <button onClick={agregarValor} disabled={!formValor}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50">
                  <Plus className="w-3 h-3" /> Añadir valor
                </button>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Nombre (Valor)</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Importe</th>
                    {!esSoloLectura && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {valoresLineas.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-gray-500 text-xs">Sin valores — usá el importe principal</td></tr>
                  ) : valoresLineas.map((v, i) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 px-3">{v.valor_nombre}</td>
                      <td className="py-2 px-3 text-right">
                        {esSoloLectura ? `$${v.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : (
                          <input type="number" value={v.importe} onChange={e => actualizarImporteValor(i, parseFloat(e.target.value) || 0)}
                            className="w-32 text-right border border-gray-300 rounded px-2 py-1 text-sm" />
                        )}
                      </td>
                      {!esSoloLectura && (
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => eliminarValor(i)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tabActiva === "info" && (
            <div className="space-y-3">
              {seleccion?.comprobante_salida_id || seleccion?.comprobante_entrada_id ? (
                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-800">Documentos Generados</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Comprobante Salida</span>
                    <span className="font-mono text-xs">{seleccion.comprobante_salida_id?.slice(0, 8) || "—"}</span>
                    {seleccion.estado === "publicado" || seleccion.estado === "pendiente" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Publicado</span>
                    ) : seleccion.estado === "cancelado" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Cancelado</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Comprobante Entrada</span>
                    <span className="font-mono text-xs">{seleccion.comprobante_entrada_id?.slice(0, 8) || "—"}</span>
                    {seleccion.estado === "publicado" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Publicado</span>
                    ) : seleccion.estado === "pendiente" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Pendiente</span>
                    ) : seleccion.estado === "cancelado" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Cancelado</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Los comprobantes se generan al confirmar la transferencia.</p>
              )}
            </div>
          )}

          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={4} disabled={esSoloLectura}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Observaciones..." />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helper: Verificar valor compatible en caja ─────────────────────────────
async function verificarValorEnCaja(
  supabase: ReturnType<typeof createClient>,
  cajaDestinoId: string,
  moneda: string,
  tipo: string
): Promise<{ valido: boolean; valorId?: string; error?: string }> {
  const { data: valorDestino } = await supabase
    .from("caja_valores")
    .select("id, nombre")
    .eq("caja_id", cajaDestinoId)
    .eq("moneda", moneda)
    .eq("tipo", tipo)
    .eq("activo", true)
    .single()
  if (!valorDestino) {
    return { valido: false, error: `La caja destino no tiene un valor en ${moneda} de tipo ${tipo}. Configuralo en Configuración → Cajas → Valores Permitidos.` }
  }
  return { valido: true, valorId: valorDestino.id }
}

// ─── Sección Depósitos ──────────────────────────────────────────────────────
function Depositos() {
  const { sucursales } = useERP()
  const supabase = createClient()
  const [lista, setLista] = useState<Deposito[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [cajasActivas, setCajasActivas] = useState<{ id: string; nombre: string; sucursal: string }[]>([])
  const [valoresCaja, setValoresCaja] = useState<{ id: string; caja_id: string; nombre: string; moneda: string; tipo: string }[]>([])
  const [seleccion, setSeleccion] = useState<Deposito | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [formCuenta, setFormCuenta] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formSucursal, setFormSucursal] = useState("")
  const [formCajaEgreso, setFormCajaEgreso] = useState("")
  const [formTipoOp, setFormTipoOp] = useState("Depósito")
  const [formNumOp, setFormNumOp] = useState("")
  const [formFechaOp, setFormFechaOp] = useState("")
  const [formObs, setFormObs] = useState("")
  const [valoresLineas, setValoresLineas] = useState<DepositoValor[]>([])
  const [tabActiva, setTabActiva] = useState<"valores" | "observaciones">("valores")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarLista(); cargarRefs() }, [])

  const cargarRefs = async () => {
    const { data: cb } = await supabase.from("cuentas_bancarias").select("*").eq("activo", true)
    if (cb) setCuentasBancarias(cb)
    const { data: c } = await supabase.from("cajas").select("id, nombre, sucursal").eq("activa", true)
    if (c) setCajasActivas(c)
    const { data: v } = await supabase.from("caja_valores").select("id, caja_id, nombre, moneda, tipo").eq("activo", true)
    if (v) setValoresCaja(v)
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("depositos_bancarios").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("depositos_bancarios").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormCuenta(data.cuenta_bancaria_id || ""); setFormImporte(data.importe || 0)
      setFormSucursal(data.sucursal || ""); setFormCajaEgreso(data.caja_egreso_id || "")
      setFormTipoOp(data.tipo_operacion || "Depósito"); setFormNumOp(data.numero_operacion || "")
      setFormFechaOp(data.fecha_operacion || ""); setFormObs(data.observaciones || "")
      const { data: vals } = await supabase.from("deposito_bancario_valores").select("*").eq("deposito_id", id)
      setValoresLineas(vals || [])
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true)
    setFormCuenta(""); setFormImporte(0)
    setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormCajaEgreso(""); setFormTipoOp("Depósito"); setFormNumOp("")
    setFormFechaOp(""); setFormObs(""); setValoresLineas([]); setTabActiva("valores")
  }

  const guardar = async () => {
    if (!formCuenta || !formCajaEgreso) { alert("Seleccioná cuenta bancaria y caja de egreso"); return }
    const importeTotal = valoresLineas.length > 0 ? valoresLineas.reduce((s, v) => s + v.importe, 0) : formImporte
    if (importeTotal <= 0) { alert("El importe debe ser mayor a 0"); return }
    setGuardando(true)
    const cuenta = cuentasBancarias.find(c => c.id === formCuenta)
    const caja = cajasActivas.find(c => c.id === formCajaEgreso)
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_deposito_bancario", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("depositos_bancarios").insert({
        numero: numData || `DEP-${Date.now()}`, cuenta_bancaria_id: formCuenta,
        cuenta_bancaria_nombre: cuenta ? `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}` : "",
        importe: importeTotal, sucursal: formSucursal, caja_egreso_id: formCajaEgreso,
        caja_egreso_nombre: caja?.nombre || "", tipo_operacion: formTipoOp,
        numero_operacion: formNumOp || null, fecha_operacion: formFechaOp || null, observaciones: formObs,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo && valoresLineas.length > 0) {
        await supabase.from("deposito_bancario_valores").insert(valoresLineas.map(v => ({ deposito_id: nuevo.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe })))
      }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("depositos_bancarios").update({
        cuenta_bancaria_id: formCuenta, cuenta_bancaria_nombre: cuenta ? `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}` : "",
        importe: importeTotal, sucursal: formSucursal, caja_egreso_id: formCajaEgreso,
        caja_egreso_nombre: caja?.nombre || "", tipo_operacion: formTipoOp,
        numero_operacion: formNumOp || null, fecha_operacion: formFechaOp || null, observaciones: formObs,
      }).eq("id", seleccion.id)
      await supabase.from("deposito_bancario_valores").delete().eq("deposito_id", seleccion.id)
      if (valoresLineas.length > 0) {
        await supabase.from("deposito_bancario_valores").insert(valoresLineas.map(v => ({ deposito_id: seleccion.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe })))
      }
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarDeposito = async () => {
    if (!seleccion || guardando) return
    setGuardando(true)
    try {
    const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", seleccion.caja_egreso_id).eq("estado", "abierto").single()
    if (!extracto) { alert(`No hay extracto abierto para "${seleccion.caja_egreso_nombre}".`); return }
    // Cargar valores
    const { data: vals } = await supabase.from("deposito_bancario_valores").select("*").eq("deposito_id", seleccion.id)
    for (const valor of (vals || [])) {
      const { data: valorCaja } = await supabase.from("caja_valores").select("moneda").eq("id", valor.valor_id).single()
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id, valor_id: valor.valor_id, valor_nombre: valor.valor_nombre,
        tipo_movimiento: "egreso", importe: valor.importe, moneda: valorCaja?.moneda,
        concepto: `Depósito a ${seleccion.cuenta_bancaria_nombre}`,
        documento_origen_tipo: "deposito", documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
      })
    }
    const cuenta = cuentasBancarias.find(c => c.id === seleccion.cuenta_bancaria_id)
    await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: seleccion.cuenta_bancaria_id,
      cuenta_bancaria_nombre: seleccion.cuenta_bancaria_nombre,
      tipo_movimiento: "ingreso", importe: seleccion.importe, moneda: cuenta?.moneda || "ARS",
      tipo_operacion: "Depósito", concepto: `Depósito desde ${seleccion.caja_egreso_nombre}`,
      documento_origen_tipo: "deposito", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, conciliado: false,
    })
    await supabase.from("depositos_bancarios").update({ estado: "publicado" }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const valoresDisp = valoresCaja.filter(v => v.caja_id === formCajaEgreso)
  const agregarValor = () => {
    if (valoresDisp.length === 0) return
    const v = valoresDisp[0]
    setValoresLineas([...valoresLineas, { id: crypto.randomUUID(), deposito_id: seleccion?.id || "", valor_id: v.id, valor_nombre: v.nombre, importe: 0 }])
  }
  const listaFiltrada = lista.filter(d => {
    if (filtroEstado !== "todos" && d.estado !== filtroEstado) return false
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.cuenta_bancaria_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", deposito_pendiente: "bg-yellow-100 text-yellow-700", publicado: "bg-green-100 text-green-700" }
    const l: Record<string, string> = { borrador: "Borrador", deposito_pendiente: "Dep. Pendiente", publicado: "Publicado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  if (!seleccion && !modoCrear) {
    return (
      <FinanzasListSection<Deposito>
        title="Depósitos" moduleName="finanzas_depositos"
        data={lista}
        searchFields={["numero", "cuenta_bancaria_nombre", "sucursal", "caja_egreso_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "sucursal", label: "Sucursal" }, { field: "cuenta_bancaria_nombre", label: "Cuenta Bancaria" }]}
        actions={<button onClick={iniciarCreacion} className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"><Plus className="w-4 h-4" /> Nuevo Depósito</button>}
      >
        {(filtered) => (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">N° Depósito</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Cuenta Bancaria</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sucursal</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Caja Egreso</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Estado</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-gray-500">No hay depósitos</td></tr> :
              filtered.map(d => (
                <tr key={d.id} onClick={() => cargarDetalle(d.id)} className="border-b cursor-pointer hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{d.numero}</td>
                  <td className="py-3 px-4">{d.cuenta_bancaria_nombre}</td>
                  <td className="py-3 px-4">{d.sucursal}</td>
                  <td className="py-3 px-4">{d.caja_egreso_nombre}</td>
                  <td className="py-3 px-4 text-right font-medium">${d.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-center">{badgeEstado(d.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSeleccion(null); setModoCrear(false) }} className="p-1.5 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-amber-900">{modoCrear ? "Nuevo Depósito" : seleccion?.numero}</h2>
          {seleccion && <div className="mt-1">{badgeEstado(seleccion.estado)}</div>}
        </div>
        <div className="flex items-center gap-2">
          {(modoCrear || seleccion?.estado === "borrador") && (
            <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar"}</button>
          )}
          {seleccion?.estado === "borrador" && (
            <button onClick={confirmarDeposito} disabled={guardando} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4 inline mr-1" /> {guardando ? "Procesando..." : "Confirmar"}</button>
          )}
        </div>
      </div>
      {seleccion?.estado === "publicado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800"><Check className="w-4 h-4" /> Depósito publicado</div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Bancaria</label>
            <select value={formCuenta} onChange={e => setFormCuenta(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
            <input type="number" value={formImporte} onChange={e => setFormImporte(parseFloat(e.target.value) || 0)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja de Egreso</label>
            <select value={formCajaEgreso} onChange={e => setFormCajaEgreso(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cajasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Operación</label>
            <select value={formTipoOp} onChange={e => setFormTipoOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="Depósito">Depósito</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° Operación (Banco)</label>
            <input value={formNumOp} onChange={e => setFormNumOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Operación</label>
            <input type="date" value={formFechaOp} onChange={e => setFormFechaOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex border-b">
          {[{ id: "valores" as const, label: "Valores" }, { id: "observaciones" as const, label: "Observaciones" }].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tabActiva === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "valores" && (
            <div className="space-y-3">
              {!esSoloLectura && <button onClick={agregarValor} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100"><Plus className="w-3 h-3" /> Añadir valor</button>}
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Valor</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700">Importe</th>
                {!esSoloLectura && <th className="w-10"></th>}
              </tr></thead><tbody>
                {valoresLineas.length === 0 ? <tr><td colSpan={3} className="py-6 text-center text-gray-500 text-xs">Sin valores</td></tr> :
                valoresLineas.map((v, i) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 px-3">
                      {esSoloLectura ? v.valor_nombre : (
                        <select value={v.valor_id} onChange={e => { const val = valoresDisp.find(vd => vd.id === e.target.value); setValoresLineas(valoresLineas.map((vl, j) => j === i ? { ...vl, valor_id: e.target.value, valor_nombre: val?.nombre || "" } : vl)) }} className="border border-gray-300 rounded px-2 py-1 text-sm">
                          {valoresDisp.map(vd => <option key={vd.id} value={vd.id}>{vd.nombre}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {esSoloLectura ? `$${v.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` :
                        <input type="number" value={v.importe} onChange={e => setValoresLineas(valoresLineas.map((vl, j) => j === i ? { ...vl, importe: parseFloat(e.target.value) || 0 } : vl))} className="w-32 text-right border border-gray-300 rounded px-2 py-1 text-sm" />}
                    </td>
                    {!esSoloLectura && <td className="py-2 px-3 text-center"><button onClick={() => setValoresLineas(valoresLineas.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>}
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={4} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Observaciones..." />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Extracciones ───────────────────────────────────────────────────
function Extracciones() {
  const { sucursales } = useERP()
  const supabase = createClient()
  const [lista, setLista] = useState<Extraccion[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [cajasActivas, setCajasActivas] = useState<{ id: string; nombre: string; sucursal: string }[]>([])
  const [valoresCaja, setValoresCaja] = useState<{ id: string; caja_id: string; nombre: string; moneda: string; tipo: string }[]>([])
  const [seleccion, setSeleccion] = useState<Extraccion | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [formCuenta, setFormCuenta] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formSucursal, setFormSucursal] = useState("")
  const [formCajaIngreso, setFormCajaIngreso] = useState("")
  const [formTipoOp, setFormTipoOp] = useState("Extracción")
  const [formNumOp, setFormNumOp] = useState("")
  const [formFechaOp, setFormFechaOp] = useState("")
  const [formObs, setFormObs] = useState("")
  const [valoresLineas, setValoresLineas] = useState<ExtraccionValor[]>([])
  const [tabActiva, setTabActiva] = useState<"valores" | "observaciones">("valores")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarLista(); cargarRefs() }, [])

  const cargarRefs = async () => {
    const { data: cb } = await supabase.from("cuentas_bancarias").select("*").eq("activo", true)
    if (cb) setCuentasBancarias(cb)
    const { data: c } = await supabase.from("cajas").select("id, nombre, sucursal").eq("activa", true)
    if (c) setCajasActivas(c)
    const { data: v } = await supabase.from("caja_valores").select("id, caja_id, nombre, moneda, tipo").eq("activo", true)
    if (v) setValoresCaja(v)
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("extracciones").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("extracciones").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormCuenta(data.cuenta_bancaria_id || ""); setFormImporte(data.importe || 0)
      setFormSucursal(data.sucursal || ""); setFormCajaIngreso(data.caja_ingreso_id || "")
      setFormTipoOp(data.tipo_operacion || "Extracción"); setFormNumOp(data.numero_operacion || "")
      setFormFechaOp(data.fecha_operacion || ""); setFormObs(data.observaciones || "")
      const { data: vals } = await supabase.from("extraccion_valores").select("*").eq("extraccion_id", id)
      setValoresLineas(vals || [])
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true)
    setFormCuenta(""); setFormImporte(0)
    setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormCajaIngreso(""); setFormTipoOp("Extracción"); setFormNumOp("")
    setFormFechaOp(""); setFormObs(""); setValoresLineas([]); setTabActiva("valores")
  }

  const guardar = async () => {
    if (!formCuenta || !formCajaIngreso) { alert("Seleccioná cuenta bancaria y caja de ingreso"); return }
    const importeTotal = valoresLineas.length > 0 ? valoresLineas.reduce((s, v) => s + v.importe, 0) : formImporte
    if (importeTotal <= 0) { alert("El importe debe ser mayor a 0"); return }
    setGuardando(true)
    const cuenta = cuentasBancarias.find(c => c.id === formCuenta)
    const caja = cajasActivas.find(c => c.id === formCajaIngreso)
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_extraccion", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("extracciones").insert({
        numero: numData || `EXT-${Date.now()}`, cuenta_bancaria_id: formCuenta,
        cuenta_bancaria_nombre: cuenta ? `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}` : "",
        importe: importeTotal, sucursal: formSucursal, caja_ingreso_id: formCajaIngreso,
        caja_ingreso_nombre: caja?.nombre || "", tipo_operacion: formTipoOp,
        numero_operacion: formNumOp || null, fecha_operacion: formFechaOp || null, observaciones: formObs,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo && valoresLineas.length > 0) {
        await supabase.from("extraccion_valores").insert(valoresLineas.map(v => ({ extraccion_id: nuevo.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe })))
      }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("extracciones").update({
        cuenta_bancaria_id: formCuenta, cuenta_bancaria_nombre: cuenta ? `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}` : "",
        importe: importeTotal, sucursal: formSucursal, caja_ingreso_id: formCajaIngreso,
        caja_ingreso_nombre: caja?.nombre || "", tipo_operacion: formTipoOp,
        numero_operacion: formNumOp || null, fecha_operacion: formFechaOp || null, observaciones: formObs,
      }).eq("id", seleccion.id)
      await supabase.from("extraccion_valores").delete().eq("extraccion_id", seleccion.id)
      if (valoresLineas.length > 0) {
        await supabase.from("extraccion_valores").insert(valoresLineas.map(v => ({ extraccion_id: seleccion.id, valor_id: v.valor_id, valor_nombre: v.valor_nombre, importe: v.importe })))
      }
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarExtraccion = async () => {
    if (!seleccion || guardando) return
    setGuardando(true)
    try {
    const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", seleccion.caja_ingreso_id).eq("estado", "abierto").single()
    if (!extracto) { alert(`No hay extracto abierto para "${seleccion.caja_ingreso_nombre}".`); return }
    // Validar valor compatible
    const { data: cuentaBancaria } = await supabase.from("cuentas_bancarias").select("moneda").eq("id", seleccion.cuenta_bancaria_id).single()
    const validacion = await verificarValorEnCaja(supabase, seleccion.caja_ingreso_id, cuentaBancaria?.moneda || "ARS", "efectivo")
    if (!validacion.valido) { alert(validacion.error); return }
    const { data: vals } = await supabase.from("extraccion_valores").select("*").eq("extraccion_id", seleccion.id)
    for (const valor of (vals || [])) {
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id, valor_id: valor.valor_id, valor_nombre: valor.valor_nombre,
        tipo_movimiento: "ingreso", importe: valor.importe,
        concepto: `Extracción de ${seleccion.cuenta_bancaria_nombre}`,
        documento_origen_tipo: "extraccion", documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
      })
    }
    await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: seleccion.cuenta_bancaria_id,
      cuenta_bancaria_nombre: seleccion.cuenta_bancaria_nombre,
      tipo_movimiento: "egreso", importe: seleccion.importe,
      tipo_operacion: seleccion.tipo_operacion,
      concepto: `Extracción a ${seleccion.caja_ingreso_nombre}`,
      documento_origen_tipo: "extraccion", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, conciliado: false,
    })
    await supabase.from("extracciones").update({ estado: "publicado" }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const valoresDisp = valoresCaja.filter(v => v.caja_id === formCajaIngreso)
  const agregarValor = () => {
    if (valoresDisp.length === 0) return
    const v = valoresDisp[0]
    setValoresLineas([...valoresLineas, { id: crypto.randomUUID(), extraccion_id: seleccion?.id || "", valor_id: v.id, valor_nombre: v.nombre, importe: 0 }])
  }
  const listaFiltrada = lista.filter(d => {
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.cuenta_bancaria_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", publicado: "bg-green-100 text-green-700" }
    const l: Record<string, string> = { borrador: "Borrador", publicado: "Publicado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  if (!seleccion && !modoCrear) {
    return (
      <FinanzasListSection<Extraccion>
        title="Extracciones" moduleName="finanzas_extracciones"
        data={lista}
        searchFields={["numero", "cuenta_bancaria_nombre", "sucursal", "caja_ingreso_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }, { field: "sucursal", label: "Sucursal" }, { field: "cuenta_bancaria_nombre", label: "Cuenta Bancaria" }]}
        actions={<button onClick={iniciarCreacion} className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"><Plus className="w-4 h-4" /> Nueva Extracción</button>}
      >
        {(filtered) => (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">N° Extracción</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Cuenta Bancaria</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sucursal</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Caja Ingreso</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Estado</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-gray-500">No hay extracciones</td></tr> :
              filtered.map(d => (
                <tr key={d.id} onClick={() => cargarDetalle(d.id)} className="border-b cursor-pointer hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{d.numero}</td>
                  <td className="py-3 px-4">{d.cuenta_bancaria_nombre}</td>
                  <td className="py-3 px-4">{d.sucursal}</td>
                  <td className="py-3 px-4">{d.caja_ingreso_nombre}</td>
                  <td className="py-3 px-4 text-right font-medium">${d.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-center">{badgeEstado(d.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSeleccion(null); setModoCrear(false) }} className="p-1.5 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-amber-900">{modoCrear ? "Nueva Extracción" : seleccion?.numero}</h2>
          {seleccion && <div className="mt-1">{badgeEstado(seleccion.estado)}</div>}
        </div>
        <div className="flex items-center gap-2">
          {(modoCrear || seleccion?.estado === "borrador") && (
            <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar"}</button>
          )}
          {seleccion?.estado === "borrador" && (
            <button onClick={confirmarExtraccion} disabled={guardando} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4 inline mr-1" /> {guardando ? "Procesando..." : "Confirmar"}</button>
          )}
        </div>
      </div>
      {seleccion?.estado === "publicado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800"><Check className="w-4 h-4" /> Extracción publicada</div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Bancaria</label>
            <select value={formCuenta} onChange={e => setFormCuenta(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
            <input type="number" value={formImporte} onChange={e => setFormImporte(parseFloat(e.target.value) || 0)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja de Ingreso</label>
            <select value={formCajaIngreso} onChange={e => setFormCajaIngreso(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cajasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Operación</label>
            <select value={formTipoOp} onChange={e => setFormTipoOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="Extracción">Extracción</option>
              <option value="Extracción con Cheque">Extracción con Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° Operación (Banco)</label>
            <input value={formNumOp} onChange={e => setFormNumOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Operación</label>
            <input type="date" value={formFechaOp} onChange={e => setFormFechaOp(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex border-b">
          {[{ id: "valores" as const, label: "Valores" }, { id: "observaciones" as const, label: "Observaciones" }].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tabActiva === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "valores" && (
            <div className="space-y-3">
              {!esSoloLectura && <button onClick={agregarValor} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100"><Plus className="w-3 h-3" /> Añadir valor</button>}
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Valor</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700">Importe</th>
                {!esSoloLectura && <th className="w-10"></th>}
              </tr></thead><tbody>
                {valoresLineas.length === 0 ? <tr><td colSpan={3} className="py-6 text-center text-gray-500 text-xs">Sin valores</td></tr> :
                valoresLineas.map((v, i) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 px-3">
                      {esSoloLectura ? v.valor_nombre : (
                        <select value={v.valor_id} onChange={e => { const val = valoresDisp.find(vd => vd.id === e.target.value); setValoresLineas(valoresLineas.map((vl, j) => j === i ? { ...vl, valor_id: e.target.value, valor_nombre: val?.nombre || "" } : vl)) }} className="border border-gray-300 rounded px-2 py-1 text-sm">
                          {valoresDisp.map(vd => <option key={vd.id} value={vd.id}>{vd.nombre}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {esSoloLectura ? `$${v.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` :
                        <input type="number" value={v.importe} onChange={e => setValoresLineas(valoresLineas.map((vl, j) => j === i ? { ...vl, importe: parseFloat(e.target.value) || 0 } : vl))} className="w-32 text-right border border-gray-300 rounded px-2 py-1 text-sm" />}
                    </td>
                    {!esSoloLectura && <td className="py-2 px-3 text-center"><button onClick={() => setValoresLineas(valoresLineas.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>}
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={4} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Observaciones..." />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Transferencias Bancarias ───────────────────────────────────────
function TransferenciasBancarias() {
  const { sucursales } = useERP()
  const supabase = createClient()
  const [lista, setLista] = useState<TransferenciaBancaria[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [seleccion, setSeleccion] = useState<TransferenciaBancaria | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [formDesde, setFormDesde] = useState("")
  const [formHasta, setFormHasta] = useState("")
  const [formSucursal, setFormSucursal] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formTipoOpOrigen, setFormTipoOpOrigen] = useState("Transferencia")
  const [formNumOpOrigen, setFormNumOpOrigen] = useState("")
  const [formFechaOpOrigen, setFormFechaOpOrigen] = useState("")
  const [formTipoOpDestino, setFormTipoOpDestino] = useState("Transferencia")
  const [formNumOpDestino, setFormNumOpDestino] = useState("")
  const [formFechaOpDestino, setFormFechaOpDestino] = useState("")
  const [formObs, setFormObs] = useState("")
  const [tabActiva, setTabActiva] = useState<"banco_origen" | "banco_destino" | "observaciones">("banco_origen")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarLista(); cargarCuentas() }, [])

  const cargarCuentas = async () => {
    const { data } = await supabase.from("cuentas_bancarias").select("*").eq("activo", true)
    if (data) setCuentasBancarias(data)
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("transferencias_bancarias").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("transferencias_bancarias").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormDesde(data.desde_cuenta_id || ""); setFormHasta(data.hasta_cuenta_id || "")
      setFormSucursal(data.sucursal || ""); setFormImporte(data.importe_origen || 0)
      setFormTipoOpOrigen(data.tipo_operacion_origen || "Transferencia")
      setFormNumOpOrigen(data.numero_operacion_origen || "")
      setFormFechaOpOrigen(data.fecha_operacion_origen || "")
      setFormTipoOpDestino(data.tipo_operacion_destino || "Transferencia")
      setFormNumOpDestino(data.numero_operacion_destino || "")
      setFormFechaOpDestino(data.fecha_operacion_destino || "")
      setFormObs(data.observaciones || "")
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true)
    setFormDesde(""); setFormHasta("")
    setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormImporte(0); setFormTipoOpOrigen("Transferencia"); setFormNumOpOrigen("")
    setFormFechaOpOrigen(""); setFormTipoOpDestino("Transferencia")
    setFormNumOpDestino(""); setFormFechaOpDestino(""); setFormObs("")
    setTabActiva("banco_origen")
  }

  const guardar = async () => {
    if (!formDesde || !formHasta) { alert("Seleccioná ambas cuentas bancarias"); return }
    if (formDesde === formHasta) { alert("La cuenta origen y destino no pueden ser la misma"); return }
    if (formImporte <= 0) { alert("El importe debe ser mayor a 0"); return }
    setGuardando(true)
    const desde = cuentasBancarias.find(c => c.id === formDesde)
    const hasta = cuentasBancarias.find(c => c.id === formHasta)
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_transf_bancaria", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("transferencias_bancarias").insert({
        numero: numData || `TB-${Date.now()}`,
        desde_cuenta_id: formDesde, desde_cuenta_nombre: desde ? `${desde.banco_nombre} - ${desde.numero_cuenta}` : "",
        hasta_cuenta_id: formHasta, hasta_cuenta_nombre: hasta ? `${hasta.banco_nombre} - ${hasta.numero_cuenta}` : "",
        sucursal: formSucursal, importe_origen: formImporte,
        tipo_operacion_origen: formTipoOpOrigen, numero_operacion_origen: formNumOpOrigen || null,
        fecha_operacion_origen: formFechaOpOrigen || null,
        tipo_operacion_destino: formTipoOpDestino, numero_operacion_destino: formNumOpDestino || null,
        fecha_operacion_destino: formFechaOpDestino || null, observaciones: formObs,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("transferencias_bancarias").update({
        desde_cuenta_id: formDesde, desde_cuenta_nombre: desde ? `${desde.banco_nombre} - ${desde.numero_cuenta}` : "",
        hasta_cuenta_id: formHasta, hasta_cuenta_nombre: hasta ? `${hasta.banco_nombre} - ${hasta.numero_cuenta}` : "",
        sucursal: formSucursal, importe_origen: formImporte,
        tipo_operacion_origen: formTipoOpOrigen, numero_operacion_origen: formNumOpOrigen || null,
        fecha_operacion_origen: formFechaOpOrigen || null,
        tipo_operacion_destino: formTipoOpDestino, numero_operacion_destino: formNumOpDestino || null,
        fecha_operacion_destino: formFechaOpDestino || null, observaciones: formObs,
      }).eq("id", seleccion.id)
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarTransferenciaBancaria = async () => {
    if (!seleccion || guardando) return
    setGuardando(true)
    try {
    if (seleccion.desde_cuenta_id === seleccion.hasta_cuenta_id) {
      alert("La cuenta origen y destino no pueden ser la misma."); return
    }
    await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: seleccion.desde_cuenta_id,
      cuenta_bancaria_nombre: seleccion.desde_cuenta_nombre,
      tipo_movimiento: "egreso", importe: seleccion.importe_origen,
      tipo_operacion: "Transferencia entre Cuentas Propias",
      numero_operacion: seleccion.numero_operacion_origen,
      fecha_operacion: seleccion.fecha_operacion_origen,
      concepto: `Transferencia a ${seleccion.hasta_cuenta_nombre}`,
      documento_origen_tipo: "transferencia_bancaria", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, conciliado: false,
    })
    await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: seleccion.hasta_cuenta_id,
      cuenta_bancaria_nombre: seleccion.hasta_cuenta_nombre,
      tipo_movimiento: "ingreso", importe: seleccion.importe_origen,
      tipo_operacion: "Transferencia entre Cuentas Propias",
      numero_operacion: seleccion.numero_operacion_destino,
      fecha_operacion: seleccion.fecha_operacion_destino,
      concepto: `Transferencia desde ${seleccion.desde_cuenta_nombre}`,
      documento_origen_tipo: "transferencia_bancaria", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, conciliado: false,
    })
    await supabase.from("transferencias_bancarias").update({ estado: "publicado" }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const cuentasDestino = cuentasBancarias.filter(c => c.id !== formDesde)
  const listaFiltrada = lista.filter(d => {
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.desde_cuenta_nombre?.toLowerCase().includes(b) || d.hasta_cuenta_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", publicado: "bg-green-100 text-green-700" }
    const l: Record<string, string> = { borrador: "Borrador", publicado: "Publicado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  if (!seleccion && !modoCrear) {
    return (
      <FinanzasListSection<TransferenciaBancaria>
        title="Transferencias Bancarias"
        moduleName="finanzas_transferencias_bancarias"
        data={lista}
        searchFields={["numero", "desde_cuenta_nombre", "hasta_cuenta_nombre", "sucursal"]}
        filterFields={[
          { field: "estado", label: "Estado" },
          { field: "sucursal", label: "Sucursal" },
        ]}
        actions={<button onClick={iniciarCreacion} className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"><Plus className="w-4 h-4" /> Nueva Transferencia</button>}
      >
        {(filtered) => (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">N° Transferencia</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Desde Cuenta</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Hasta Cuenta</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Sucursal</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Estado</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-gray-500">No hay transferencias bancarias</td></tr> :
                filtered.map(d => (
                  <tr key={d.id} onClick={() => cargarDetalle(d.id)} className="border-b cursor-pointer hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs">{d.numero}</td>
                    <td className="py-3 px-4">{d.desde_cuenta_nombre}</td>
                    <td className="py-3 px-4">{d.hasta_cuenta_nombre}</td>
                    <td className="py-3 px-4">{d.sucursal}</td>
                    <td className="py-3 px-4 text-right font-medium">${d.importe_origen?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-center">{badgeEstado(d.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanzasListSection>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSeleccion(null); setModoCrear(false) }} className="p-1.5 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-amber-900">{modoCrear ? "Nueva Transferencia Bancaria" : seleccion?.numero}</h2>
          {seleccion && <div className="mt-1">{badgeEstado(seleccion.estado)}</div>}
        </div>
        <div className="flex items-center gap-2">
          {(modoCrear || seleccion?.estado === "borrador") && (
            <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar"}</button>
          )}
          {seleccion?.estado === "borrador" && (
            <button onClick={confirmarTransferenciaBancaria} disabled={guardando} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4 inline mr-1" /> {guardando ? "Procesando..." : "Confirmar"}</button>
          )}
        </div>
      </div>
      {seleccion?.estado === "publicado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800"><Check className="w-4 h-4" /> Transferencia publicada</div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde Cuenta</label>
            <select value={formDesde} onChange={e => setFormDesde(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta Cuenta</label>
            <select value={formHasta} onChange={e => setFormHasta(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cuentasDestino.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
            <input type="number" value={formImporte} onChange={e => setFormImporte(parseFloat(e.target.value) || 0)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex border-b">
          {[{ id: "banco_origen" as const, label: "Banco Origen" }, { id: "banco_destino" as const, label: "Banco Destino" }, { id: "observaciones" as const, label: "Observaciones" }].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tabActiva === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "banco_origen" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta</label>
                <input value={cuentasBancarias.find(c => c.id === formDesde)?.banco_nombre || ""} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Operación</label>
                <select value={formTipoOpOrigen} onChange={e => setFormTipoOpOrigen(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° Operación</label>
                <input value={formNumOpOrigen} onChange={e => setFormNumOpOrigen(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Operación</label>
                <input type="date" value={formFechaOpOrigen} onChange={e => setFormFechaOpOrigen(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
              </div>
            </div>
          )}
          {tabActiva === "banco_destino" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta</label>
                <input value={cuentasBancarias.find(c => c.id === formHasta)?.banco_nombre || ""} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Operación</label>
                <select value={formTipoOpDestino} onChange={e => setFormTipoOpDestino(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° Operación</label>
                <input value={formNumOpDestino} onChange={e => setFormNumOpDestino(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Operación</label>
                <input type="date" value={formFechaOpDestino} onChange={e => setFormFechaOpDestino(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
              </div>
            </div>
          )}
          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={4} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Observaciones..." />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Conversión de Monedas ──────────────────────────────────────────
function ConversionMonedas() {
  const { sucursales } = useERP()
  const supabase = createClient()
  const [lista, setLista] = useState<ConversionMoneda[]>([])
  const [cajasActivas, setCajasActivas] = useState<{ id: string; nombre: string; sucursal: string }[]>([])
  const [valoresCaja, setValoresCaja] = useState<{ id: string; caja_id: string; nombre: string; moneda: string; tipo: string }[]>([])
  const [seleccion, setSeleccion] = useState<ConversionMoneda | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [formCaja, setFormCaja] = useState("")
  const [formSucursal, setFormSucursal] = useState("")
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formValorOrigen, setFormValorOrigen] = useState("")
  const [formValorDestino, setFormValorDestino] = useState("")
  const [formImporteOrigen, setFormImporteOrigen] = useState(0)
  const [formTipoCotizacion, setFormTipoCotizacion] = useState("Divisa")
  const [formCotizacion, setFormCotizacion] = useState(0)
  const [formObs, setFormObs] = useState("")
  const [tabActiva, setTabActiva] = useState<"info" | "observaciones">("info")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarLista(); cargarRefs() }, [])

  const cargarRefs = async () => {
    const { data: c } = await supabase.from("cajas").select("id, nombre, sucursal").eq("activa", true)
    if (c) setCajasActivas(c)
    const { data: v } = await supabase.from("caja_valores").select("id, caja_id, nombre, moneda, tipo").eq("activo", true)
    if (v) setValoresCaja(v)
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("conversiones_moneda").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("conversiones_moneda").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormCaja(data.caja_id || ""); setFormSucursal(data.sucursal || "")
      setFormFecha(data.fecha || new Date().toISOString().split("T")[0])
      setFormValorOrigen(data.valor_origen_id || ""); setFormValorDestino(data.valor_destino_id || "")
      setFormImporteOrigen(data.importe_origen || 0); setFormTipoCotizacion(data.tipo_cotizacion || "Divisa")
      setFormCotizacion(data.cotizacion || 0); setFormObs(data.observaciones || "")
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true)
    setFormCaja(""); setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormValorOrigen(""); setFormValorDestino("")
    setFormImporteOrigen(0); setFormTipoCotizacion("Divisa"); setFormCotizacion(0)
    setFormObs(""); setTabActiva("info")
  }

  // Cálculo en tiempo real
  const calcularConversion = (importeOrigen: number, cotizacion: number) => {
    if (cotizacion <= 0) return { importeDestino: 0, diferencia: 0 }
    const importeDestinoExacto = importeOrigen / cotizacion
    const importeDestino = Math.round(importeDestinoExacto * 100) / 100
    const diferencia = Math.round(((importeDestino * cotizacion) - importeOrigen) * 100) / 100
    return { importeDestino, diferencia }
  }

  const { importeDestino, diferencia } = calcularConversion(formImporteOrigen, formCotizacion)

  // Valores filtrados por caja y tipo efectivo
  const valoresEfectivoCaja = valoresCaja.filter(v => v.caja_id === formCaja && v.tipo === "efectivo")
  const valOrigen = valoresCaja.find(v => v.id === formValorOrigen)
  const valoresDestinoFiltrados = valoresEfectivoCaja.filter(v => v.id !== formValorOrigen && v.moneda !== valOrigen?.moneda)

  const guardar = async () => {
    if (!formCaja) { alert("Seleccioná una caja"); return }
    if (!formValorOrigen || !formValorDestino) { alert("Seleccioná valor origen y destino"); return }
    if (formValorOrigen === formValorDestino) { alert("El valor origen y destino no pueden ser el mismo"); return }
    if (formImporteOrigen <= 0) { alert("El importe debe ser mayor a 0"); return }
    if (formCotizacion <= 0) { alert("La cotización debe ser mayor a 0"); return }
    setGuardando(true)
    const caja = cajasActivas.find(c => c.id === formCaja)
    const valDest = valoresCaja.find(v => v.id === formValorDestino)
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_conversion", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("conversiones_moneda").insert({
        numero: numData || `CD-${Date.now()}`, caja_id: formCaja, caja_nombre: caja?.nombre || "",
        sucursal: formSucursal, valor_origen_id: formValorOrigen, valor_origen_nombre: valOrigen?.nombre || "",
        moneda_origen: valOrigen?.moneda || "", importe_origen: formImporteOrigen,
        valor_destino_id: formValorDestino, valor_destino_nombre: valDest?.nombre || "",
        moneda_destino: valDest?.moneda || "", importe_destino: importeDestino,
        tipo_cotizacion: formTipoCotizacion, cotizacion: formCotizacion,
        diferencia_redondeo: diferencia, fecha: formFecha, observaciones: formObs,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("conversiones_moneda").update({
        caja_id: formCaja, caja_nombre: caja?.nombre || "", sucursal: formSucursal,
        valor_origen_id: formValorOrigen, valor_origen_nombre: valOrigen?.nombre || "",
        moneda_origen: valOrigen?.moneda || "", importe_origen: formImporteOrigen,
        valor_destino_id: formValorDestino, valor_destino_nombre: valDest?.nombre || "",
        moneda_destino: valDest?.moneda || "", importe_destino: importeDestino,
        tipo_cotizacion: formTipoCotizacion, cotizacion: formCotizacion,
        diferencia_redondeo: diferencia, fecha: formFecha, observaciones: formObs,
      }).eq("id", seleccion.id)
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarConversion = async () => {
    if (!seleccion || guardando) return
    setGuardando(true)
    try {
    const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", seleccion.caja_id).eq("estado", "abierto").single()
    if (!extracto) { alert(`No hay extracto abierto para "${seleccion.caja_nombre}".`); return }
    const validacion = await verificarValorEnCaja(supabase, seleccion.caja_id, seleccion.moneda_destino, "efectivo")
    if (!validacion.valido) { alert(validacion.error); return }
    // Egreso del valor origen
    await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.id, valor_id: seleccion.valor_origen_id, valor_nombre: seleccion.valor_origen_nombre,
      tipo_movimiento: "egreso", importe: seleccion.importe_origen, moneda: seleccion.moneda_origen,
      concepto: `Conversión a ${seleccion.moneda_destino} @ ${seleccion.cotizacion}`,
      documento_origen_tipo: "conversion_moneda", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
    })
    // Ingreso del valor destino
    await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.id, valor_id: seleccion.valor_destino_id, valor_nombre: seleccion.valor_destino_nombre,
      tipo_movimiento: "ingreso", importe: seleccion.importe_destino, moneda: seleccion.moneda_destino,
      concepto: `Conversión desde ${seleccion.moneda_origen} @ ${seleccion.cotizacion}`,
      documento_origen_tipo: "conversion_moneda", documento_origen_id: seleccion.id,
      documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
    })
    // Diferencia de redondeo
    if (Math.abs(seleccion.diferencia_redondeo) > 0.001) {
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id, valor_id: seleccion.valor_origen_id, valor_nombre: seleccion.valor_origen_nombre,
        tipo_movimiento: seleccion.diferencia_redondeo > 0 ? "egreso" : "ingreso",
        importe: Math.abs(seleccion.diferencia_redondeo), moneda: seleccion.moneda_origen,
        concepto: `Diferencia redondeo conversión ${seleccion.numero}`,
        documento_origen_tipo: "conversion_moneda_redondeo", documento_origen_id: seleccion.id,
        estado_movimiento: "confirmado",
      })
    }
    await supabase.from("conversiones_moneda").update({ estado: "publicado" }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const listaFiltrada = lista.filter(d => {
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.caja_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", publicado: "bg-green-100 text-green-700" }
    const l: Record<string, string> = { borrador: "Borrador", publicado: "Publicado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  if (!seleccion && !modoCrear) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-900">Conversión de Monedas</h2>
          <button onClick={iniciarCreacion} className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"><Plus className="w-4 h-4" /> Nueva Conversión</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="ml-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">N° Conversión</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Caja</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Origen</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Destino</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Cotización</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Estado</th>
            </tr></thead>
            <tbody>
              {listaFiltrada.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-gray-500">No hay conversiones</td></tr> :
              listaFiltrada.map(d => (
                <tr key={d.id} onClick={() => cargarDetalle(d.id)} className="border-b cursor-pointer hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{d.numero}</td>
                  <td className="py-3 px-4">{d.fecha}</td>
                  <td className="py-3 px-4">{d.caja_nombre}</td>
                  <td className="py-3 px-4">{d.moneda_origen} ${d.importe_origen?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4">{d.moneda_destino} ${d.importe_destino?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right font-medium">${d.importe_origen?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right">{d.cotizacion}</td>
                  <td className="py-3 px-4 text-center">{badgeEstado(d.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSeleccion(null); setModoCrear(false) }} className="p-1.5 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-amber-900">{modoCrear ? "Nueva Conversión de Moneda" : seleccion?.numero}</h2>
          {seleccion && <div className="mt-1">{badgeEstado(seleccion.estado)}</div>}
        </div>
        <div className="flex items-center gap-2">
          {(modoCrear || seleccion?.estado === "borrador") && (
            <button onClick={guardar} disabled={guardando} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar"}</button>
          )}
          {seleccion?.estado === "borrador" && (
            <button onClick={confirmarConversion} disabled={guardando} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"><Check className="w-4 h-4 inline mr-1" /> {guardando ? "Procesando..." : "Confirmar"}</button>
          )}
        </div>
      </div>
      {seleccion?.estado === "publicado" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800"><Check className="w-4 h-4" /> Conversión publicada</div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja</label>
            <select value={formCaja} onChange={e => { setFormCaja(e.target.value); setFormValorOrigen(""); setFormValorDestino("") }} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {cajasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Valor Origen</label>
            <select value={formValorOrigen} onChange={e => { setFormValorOrigen(e.target.value); setFormValorDestino("") }} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {valoresEfectivoCaja.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Valor Destino</label>
            <select value={formValorDestino} onChange={e => setFormValorDestino(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {valoresDestinoFiltrados.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe Origen</label>
            <input type="number" value={formImporteOrigen} onChange={e => setFormImporteOrigen(parseFloat(e.target.value) || 0)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Seleccionar...</option>
              {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Cotización</label>
            <select value={formTipoCotizacion} onChange={e => setFormTipoCotizacion(e.target.value)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="Divisa">Divisa</option>
              <option value="Billete">Billete</option>
              <option value="Blue">Blue</option>
              <option value="Oficial">Oficial</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cotización</label>
            <input type="number" step="0.0001" value={formCotizacion} onChange={e => setFormCotizacion(parseFloat(e.target.value) || 0)} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
        {/* Cálculo en tiempo real */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe Destino (calculado)</label>
            <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 font-medium">
              {importeDestino.toLocaleString("es-AR", { minimumFractionDigits: 2 })} {valoresCaja.find(v => v.id === formValorDestino)?.moneda || ""}
            </div>
          </div>
          {Math.abs(diferencia) > 0.001 && (
            <div>
              <label className="block text-xs font-medium text-orange-600 mb-1">Diferencia Redondeo</label>
              <div className="w-full border border-orange-200 rounded-md px-3 py-2 text-sm bg-orange-50 font-medium text-orange-700">
                {diferencia > 0 ? "+" : ""}{diferencia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex border-b">
          {[{ id: "info" as const, label: "Otra Información" }, { id: "observaciones" as const, label: "Observaciones" }].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tabActiva === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="p-4">
          {tabActiva === "info" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Período Contable</label>
                <input disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100" placeholder="Se completará desde Contabilidad" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asiento Contable</label>
                <input disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100" placeholder="Se completará desde Contabilidad" />
              </div>
            </div>
          )}
          {tabActiva === "observaciones" && (
            <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={4} disabled={esSoloLectura} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Observaciones..." />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Generación de Cuotas ────────────────────────────────────────────────────
const generarCuotas = (prestamo: { id: string; capital: number; tasa_porcentaje: number; cantidad_cuotas: number; fecha_primera_cuota: string; sistema_amortizacion: string }): Omit<PrestamoCuota, 'id'>[] => {
  const cuotas: Omit<PrestamoCuota, 'id'>[] = []
  const { capital, tasa_porcentaje, cantidad_cuotas, fecha_primera_cuota, sistema_amortizacion } = prestamo
  const tasaMensual = (tasa_porcentaje || 0) / 100 / 12
  let saldoCapital = capital
  let fechaCuota = new Date(fecha_primera_cuota)

  for (let i = 1; i <= cantidad_cuotas; i++) {
    let capitalCuota = 0, interesCuota = 0, totalCuota = 0

    switch (sistema_amortizacion) {
      case 'frances': {
        const cuotaFija = tasaMensual > 0
          ? capital * (tasaMensual * Math.pow(1 + tasaMensual, cantidad_cuotas)) / (Math.pow(1 + tasaMensual, cantidad_cuotas) - 1)
          : capital / cantidad_cuotas
        interesCuota = saldoCapital * tasaMensual
        capitalCuota = cuotaFija - interesCuota
        totalCuota = cuotaFija
        break
      }
      case 'aleman':
        capitalCuota = capital / cantidad_cuotas
        interesCuota = saldoCapital * tasaMensual
        totalCuota = capitalCuota + interesCuota
        break
      case 'americano':
        interesCuota = capital * tasaMensual
        capitalCuota = i === cantidad_cuotas ? capital : 0
        totalCuota = capitalCuota + interesCuota
        break
      case 'bullet':
        capitalCuota = i === cantidad_cuotas ? capital : 0
        interesCuota = i === cantidad_cuotas ? capital * tasaMensual * cantidad_cuotas : 0
        totalCuota = capitalCuota + interesCuota
        break
    }

    saldoCapital -= capitalCuota
    cuotas.push({
      prestamo_id: prestamo.id, numero_cuota: i,
      fecha_vencimiento: fechaCuota.toISOString().split('T')[0],
      capital: Math.round(capitalCuota * 100) / 100,
      interes: Math.round(interesCuota * 100) / 100,
      iva: 0, percepciones: 0,
      total: Math.round(totalCuota * 100) / 100,
      saldo: Math.round(Math.max(saldoCapital, 0) * 100) / 100,
      estado: 'pendiente', fecha_pago: null,
    })

    fechaCuota = new Date(fechaCuota)
    const mesesAvance = sistema_amortizacion === 'bullet' ? 0 : 1
    fechaCuota.setMonth(fechaCuota.getMonth() + (mesesAvance || 1))
  }
  return cuotas
}

// ─── Préstamos ───────────────────────────────────────────────────────────────
function Prestamos() {
  const supabase = createClient()
  const { sucursales } = useERP()
  const [lista, setLista] = useState<Prestamo[]>([])
  const [seleccion, setSeleccion] = useState<Prestamo | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [tabActiva, setTabActiva] = useState("cuotas")

  // Refs
  const [tiposPrestamo, setTiposPrestamo] = useState<TipoPrestamo[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [cajasActivas, setCajasActivas] = useState<Caja[]>([])
  const [cuotas, setCuotas] = useState<PrestamoCuota[]>([])
  const [gastos, setGastos] = useState<PrestamoGasto[]>([])

  // Form
  const [formTipo, setFormTipo] = useState("")
  const [formEntidad, setFormEntidad] = useState("")
  const [formNroPrestamo, setFormNroPrestamo] = useState("")
  const [formMoneda, setFormMoneda] = useState("ARS")
  const [formCapital, setFormCapital] = useState(0)
  const [formTasa, setFormTasa] = useState(0)
  const [formIva, setFormIva] = useState(0)
  const [formPercIva, setFormPercIva] = useState(0)
  const [formPercIibb, setFormPercIibb] = useState(0)
  const [formOtrosGastos, setFormOtrosGastos] = useState(0)
  const [formFecha, setFormFecha] = useState("")
  const [formSucursal, setFormSucursal] = useState("")
  const [formCaja, setFormCaja] = useState("")
  const [formSistema, setFormSistema] = useState<string>("frances")
  const [formPreexistente, setFormPreexistente] = useState(false)
  const [formCuotas, setFormCuotas] = useState(12)
  const [formPeriodicidad, setFormPeriodicidad] = useState("mensual")
  const [formFechaPrimeraCuota, setFormFechaPrimeraCuota] = useState("")
  const [formImporteRefinanciado, setFormImporteRefinanciado] = useState(0)
  const [formImporteAcreditado, setFormImporteAcreditado] = useState(0)
  const [formTipoGarante, setFormTipoGarante] = useState("")
  const [formGarante, setFormGarante] = useState("")
  const [formFormaPago, setFormFormaPago] = useState("")
  const [formTipoTasa, setFormTipoTasa] = useState("")
  const [formDistribucionPago, setFormDistribucionPago] = useState("Proporcional")
  const [formPeriodoGracia, setFormPeriodoGracia] = useState(0)
  const [formObs, setFormObs] = useState("")

  // Gasto form
  const [gastoDesc, setGastoDesc] = useState("")
  const [gastoImporte, setGastoImporte] = useState(0)
  const [gastoCuenta, setGastoCuenta] = useState("")

  useEffect(() => { cargarRefs(); cargarLista() }, [])

  const cargarRefs = async () => {
    const [tp, cb, cj] = await Promise.all([
      supabase.from("tipos_prestamo").select("*").eq("activo", true),
      supabase.from("cuentas_bancarias").select("*").eq("activo", true),
      supabase.from("cajas").select("*").eq("activo", true),
    ])
    if (tp.data) setTiposPrestamo(tp.data)
    if (cb.data) setCuentasBancarias(cb.data)
    if (cj.data) setCajasActivas(cj.data)
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("prestamos").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("prestamos").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormTipo(data.tipo_id || ""); setFormEntidad(data.entidad_id || "")
      setFormNroPrestamo(data.nro_prestamo || ""); setFormMoneda(data.moneda || "ARS")
      setFormCapital(data.capital || 0); setFormTasa(data.tasa_porcentaje || 0)
      setFormIva(data.iva || 0); setFormPercIva(data.percepcion_iva || 0)
      setFormPercIibb(data.percepcion_iibb || 0); setFormOtrosGastos(data.otros_gastos || 0)
      setFormFecha(data.fecha || ""); setFormSucursal(data.sucursal || "")
      setFormCaja(data.caja_id || ""); setFormSistema(data.sistema_amortizacion || "frances")
      setFormPreexistente(data.es_preexistente || false); setFormCuotas(data.cantidad_cuotas || 12)
      setFormPeriodicidad(data.periodicidad || "mensual")
      setFormFechaPrimeraCuota(data.fecha_primera_cuota || "")
      setFormImporteRefinanciado(data.importe_refinanciado || 0)
      setFormImporteAcreditado(data.importe_acreditado || 0)
      setFormTipoGarante(data.tipo_garante || ""); setFormGarante(data.garante || "")
      setFormFormaPago(data.forma_pago || ""); setFormTipoTasa(data.tipo_tasa || "")
      setFormDistribucionPago(data.distribucion_pago || "Proporcional")
      setFormPeriodoGracia(data.periodo_gracia || 0); setFormObs(data.observaciones || "")
      // Cuotas y gastos
      const { data: c } = await supabase.from("prestamo_cuotas").select("*").eq("prestamo_id", id).order("numero_cuota")
      setCuotas(c || [])
      const { data: g } = await supabase.from("prestamo_gastos").select("*").eq("prestamo_id", id)
      setGastos(g || [])
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true); setCuotas([]); setGastos([])
    setFormTipo(""); setFormEntidad(""); setFormNroPrestamo(""); setFormMoneda("ARS")
    setFormCapital(0); setFormTasa(0); setFormIva(0); setFormPercIva(0); setFormPercIibb(0)
    setFormOtrosGastos(0); setFormFecha(""); setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormCaja(""); setFormSistema("frances"); setFormPreexistente(false); setFormCuotas(12)
    setFormPeriodicidad("mensual"); setFormFechaPrimeraCuota(""); setFormImporteRefinanciado(0)
    setFormImporteAcreditado(0); setFormTipoGarante(""); setFormGarante(""); setFormFormaPago("")
    setFormTipoTasa(""); setFormDistribucionPago("Proporcional"); setFormPeriodoGracia(0)
    setFormObs(""); setTabActiva("cuotas")
  }

  const guardar = async () => {
    if (!formCapital || formCapital <= 0) { alert("El capital es obligatorio"); return }
    if (!formFecha) { alert("La fecha es obligatoria"); return }
    if (!formCuotas || formCuotas <= 0) { alert("Las cuotas son obligatorias"); return }
    setGuardando(true)
    const tipo = tiposPrestamo.find(t => t.id === formTipo)
    const entidad = cuentasBancarias.find(c => c.id === formEntidad)
    const caja = cajasActivas.find(c => c.id === formCaja)
    const payload = {
      tipo_id: formTipo || null, tipo_nombre: tipo?.nombre || "",
      entidad_id: formEntidad || null, entidad_nombre: entidad ? `${entidad.banco_nombre} - ${entidad.numero_cuenta}` : "",
      nro_prestamo: formNroPrestamo, moneda: formMoneda, capital: formCapital, tasa_porcentaje: formTasa,
      iva: formIva, percepcion_iva: formPercIva, percepcion_iibb: formPercIibb, otros_gastos: formOtrosGastos,
      fecha: formFecha, sucursal: formSucursal, caja_id: formCaja || null, caja_nombre: caja?.nombre || "",
      sistema_amortizacion: formSistema, es_preexistente: formPreexistente,
      cantidad_cuotas: formCuotas, periodicidad: formPeriodicidad,
      fecha_primera_cuota: formFechaPrimeraCuota || null,
      importe_refinanciado: formImporteRefinanciado, importe_acreditado: formImporteAcreditado,
      tipo_garante: formTipoGarante, garante: formGarante, forma_pago: formFormaPago,
      tipo_tasa: formTipoTasa, distribucion_pago: formDistribucionPago,
      periodo_gracia: formPeriodoGracia, observaciones: formObs,
    }
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_prestamo", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("prestamos").insert({
        ...payload, numero: numData || `PRES-${Date.now()}`,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo) { await cargarLista(); await cargarDetalle(nuevo.id) }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("prestamos").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", seleccion.id)
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const confirmarPrestamo = async () => {
    if (!seleccion || seleccion.estado !== "borrador" || guardando) return
    setGuardando(true)
    try {
    if (!seleccion.fecha_primera_cuota) { alert("Definí la fecha de primera cuota antes de confirmar"); return }
    // 1. Generar cuotas
    const cuotasGen = generarCuotas(seleccion)
    const { error: errCuotas } = await supabase.from("prestamo_cuotas").insert(cuotasGen)
    if (errCuotas) { alert("Error generando cuotas: " + errCuotas.message); return }
    // 2. Si no es preexistente, registrar ingreso en caja
    if (seleccion.caja_id && !seleccion.es_preexistente) {
      const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", seleccion.caja_id).eq("estado", "abierto").single()
      if (extracto) {
        const { data: valor } = await supabase.from("caja_valores").select("id, nombre").eq("caja_id", seleccion.caja_id).eq("moneda", seleccion.moneda).eq("tipo", "efectivo").single()
        if (valor) {
          await supabase.from("movimientos_caja").insert({
            extracto_id: extracto.id, valor_id: valor.id, valor_nombre: valor.nombre,
            tipo_movimiento: "ingreso", importe: seleccion.importe_acreditado || seleccion.capital,
            concepto: `Alta préstamo ${seleccion.numero} - ${seleccion.entidad_nombre}`,
            documento_origen_tipo: "prestamo", documento_origen_id: seleccion.id,
            documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
          })
        }
      }
    }
    // 3. Actualizar préstamo
    const totalIntereses = cuotasGen.reduce((a, c) => a + c.interes, 0)
    const totalPrestamo = cuotasGen.reduce((a, c) => a + c.total, 0)
    await supabase.from("prestamos").update({
      estado: "pendiente", intereses_total: Math.round(totalIntereses * 100) / 100,
      total: Math.round(totalPrestamo * 100) / 100, saldo: seleccion.capital,
      capital_pendiente: seleccion.capital, updated_at: new Date().toISOString(),
    }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
    } finally { setGuardando(false) }
  }

  const pagarCuota = async (cuota: PrestamoCuota) => {
    if (!seleccion) return
    const cajaId = seleccion.caja_id
    if (!cajaId) { alert("No hay caja asignada al préstamo"); return }
    const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", cajaId).eq("estado", "abierto").single()
    if (!extracto) { alert("No hay extracto abierto para esta caja."); return }
    const { data: valor } = await supabase.from("caja_valores").select("id, nombre").eq("caja_id", cajaId).eq("tipo", "efectivo").single()
    // Egreso en caja
    await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.id, valor_id: valor?.id, valor_nombre: valor?.nombre,
      tipo_movimiento: "egreso", importe: cuota.total,
      concepto: `Pago cuota ${cuota.numero_cuota} - préstamo ${seleccion.numero}`,
      documento_origen_tipo: "prestamo_pago", documento_origen_id: cuota.id,
      documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
    })
    // Registrar pago
    await supabase.from("prestamo_pagos").insert({
      prestamo_id: seleccion.id, cuota_id: cuota.id, fecha: new Date().toISOString().split('T')[0],
      importe: cuota.total, caja_id: cajaId,
    })
    // Marcar cuota
    await supabase.from("prestamo_cuotas").update({ estado: "conciliado", fecha_pago: new Date().toISOString().split('T')[0] }).eq("id", cuota.id)
    // Actualizar capital pendiente
    const nuevoCapPend = Math.max((seleccion.capital_pendiente || 0) - cuota.capital, 0)
    const nuevoSaldo = Math.max((seleccion.saldo || 0) - cuota.total, 0)
    await supabase.from("prestamos").update({
      capital_pendiente: nuevoCapPend, saldo: nuevoSaldo, updated_at: new Date().toISOString(),
      ...(nuevoCapPend <= 0 ? { estado: "cerrado" } : {}),
    }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
  }

  const agregarGasto = async () => {
    if (!seleccion || !gastoDesc || gastoImporte <= 0) return
    await supabase.from("prestamo_gastos").insert({ prestamo_id: seleccion.id, descripcion: gastoDesc, importe: gastoImporte, cuenta_contable: gastoCuenta })
    setGastoDesc(""); setGastoImporte(0); setGastoCuenta("")
    const { data: g } = await supabase.from("prestamo_gastos").select("*").eq("prestamo_id", seleccion.id)
    setGastos(g || [])
  }

  const listaFiltrada = lista.filter(d => {
    if (filtroEstado !== "todos" && d.estado !== filtroEstado) return false
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.entidad_nombre?.toLowerCase().includes(b) || d.tipo_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", pendiente: "bg-blue-100 text-blue-700", cerrado: "bg-green-100 text-green-700", cancelado: "bg-red-100 text-red-700" }
    const l: Record<string, string> = { borrador: "Borrador", pendiente: "Pendiente", cerrado: "Cerrado", cancelado: "Cancelado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold text-amber-900">Préstamos</h2>
        <button onClick={iniciarCreacion} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="h-4 w-4" />Nuevo</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r overflow-y-auto">
          <div className="p-2 space-y-2">
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full text-sm border rounded p-1">
              <option value="todos">Todos</option><option value="borrador">Borrador</option><option value="pendiente">Pendiente</option><option value="cerrado">Cerrado</option>
            </select>
          </div>
          {listaFiltrada.map(item => (
            <div key={item.id} onClick={() => cargarDetalle(item.id)} className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${seleccion?.id === item.id ? "bg-indigo-50" : ""}`}>
              <div className="flex justify-between items-start"><span className="font-medium text-sm">{item.numero}</span>{badgeEstado(item.estado)}</div>
              <div className="text-xs text-gray-500 mt-1">{item.entidad_nombre}</div>
              <div className="text-xs text-gray-500">{item.tipo_nombre} · ${item.capital?.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!seleccion && !modoCrear ? (
            <div className="flex items-center justify-center h-full text-gray-400">Seleccioná un préstamo o creá uno nuevo</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div><h3 className="text-lg font-bold">{modoCrear ? "Nuevo Préstamo" : seleccion?.numero}</h3>{seleccion && badgeEstado(seleccion.estado)}</div>
                <div className="flex gap-2">
                  {(modoCrear || seleccion?.estado === "borrador") && <button onClick={guardar} disabled={guardando} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"><Check className="h-4 w-4" />{guardando ? "Guardando..." : "Guardar"}</button>}
                  {seleccion?.estado === "borrador" && <button onClick={confirmarPrestamo} disabled={guardando} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><FileCheck className="h-4 w-4" />{guardando ? "Procesando..." : "Confirmar"}</button>}
                </div>
              </div>
              {/* Cabecera dos columnas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-gray-500">Tipo</label>
                    <select value={formTipo} onChange={e => setFormTipo(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="">-- Seleccionar --</option>{tiposPrestamo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">Entidad</label>
                    <select value={formEntidad} onChange={e => setFormEntidad(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="">-- Seleccionar --</option>{cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">N° Préstamo (banco)</label><input value={formNroPrestamo} onChange={e => setFormNroPrestamo(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Moneda</label><select value={formMoneda} onChange={e => setFormMoneda(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="ARS">ARS</option><option value="USD">USD</option></select></div>
                    <div><label className="text-xs font-medium text-gray-500">Capital</label><input type="number" value={formCapital} onChange={e => setFormCapital(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Tasa %</label><input type="number" step="0.01" value={formTasa} onChange={e => setFormTasa(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Capital Pendiente</label><input value={seleccion?.capital_pendiente?.toLocaleString() || "—"} disabled className="w-full border rounded px-2 py-1.5 text-sm h-8 bg-gray-50" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">IVA</label><input type="number" value={formIva} onChange={e => setFormIva(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Perc. IVA</label><input type="number" value={formPercIva} onChange={e => setFormPercIva(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Perc. IIBB</label><input type="number" value={formPercIibb} onChange={e => setFormPercIibb(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Otros Gastos</label><input type="number" value={formOtrosGastos} onChange={e => setFormOtrosGastos(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Distrib. Pago</label><select value={formDistribucionPago} onChange={e => setFormDistribucionPago(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="Proporcional">Proporcional</option><option value="Capital">Capital</option></select></div>
                  </div>
                  <div><label className="text-xs font-medium text-gray-500">Período de Gracia (meses)</label><input type="number" value={formPeriodoGracia} onChange={e => setFormPeriodoGracia(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                </div>
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-gray-500">Fecha</label><input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Sucursal</label><select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5">{sucursales.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">Caja</label><select value={formCaja} onChange={e => setFormCaja(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="">-- Sin caja --</option>{cajasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">Sistema de Amortización</label><select value={formSistema} onChange={e => setFormSistema(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="frances">Francés</option><option value="aleman">Alemán</option><option value="americano">Americano</option><option value="bullet">Bullet</option></select></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={formPreexistente} onChange={e => setFormPreexistente(e.target.checked)} disabled={esSoloLectura} className="rounded" /><label className="text-xs font-medium text-gray-500">Préstamo Preexistente</label></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Cuotas</label><input type="number" value={formCuotas} onChange={e => setFormCuotas(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Periodicidad</label><select value={formPeriodicidad} onChange={e => setFormPeriodicidad(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></div>
                  </div>
                  <div><label className="text-xs font-medium text-gray-500">Fecha Primera Cuota</label><input type="date" value={formFechaPrimeraCuota} onChange={e => setFormFechaPrimeraCuota(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Imp. Refinanciado</label><input type="number" value={formImporteRefinanciado} onChange={e => setFormImporteRefinanciado(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Imp. Acreditado</label><input type="number" value={formImporteAcreditado} onChange={e => setFormImporteAcreditado(Number(e.target.value))} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Tipo Garante</label><input value={formTipoGarante} onChange={e => setFormTipoGarante(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Garante</label><input value={formGarante} onChange={e => setFormGarante(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium text-gray-500">Forma de Pago</label><input value={formFormaPago} onChange={e => setFormFormaPago(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                    <div><label className="text-xs font-medium text-gray-500">Tipo de Tasa</label><input value={formTipoTasa} onChange={e => setFormTipoTasa(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  </div>
                </div>
              </div>
              {/* Totales */}
              {seleccion && seleccion.estado !== "borrador" && (
                <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 rounded">
                  <div><span className="text-xs text-gray-500">Intereses</span><p className="font-medium">${seleccion.intereses_total?.toLocaleString() || "—"}</p></div>
                  <div><span className="text-xs text-gray-500">Total</span><p className="font-medium">${seleccion.total?.toLocaleString() || "—"}</p></div>
                  <div><span className="text-xs text-gray-500">Capital Pend.</span><p className="font-medium">${seleccion.capital_pendiente?.toLocaleString() || "—"}</p></div>
                  <div><span className="text-xs text-gray-500">Saldo</span><p className="font-medium">${seleccion.saldo?.toLocaleString() || "—"}</p></div>
                </div>
              )}
              {/* Tabs */}
              <div className="border-b flex gap-4">
                {["cuotas", "gastos", "observaciones"].map(t => (
                  <button key={t} onClick={() => setTabActiva(t)} className={`pb-2 text-sm font-medium ${tabActiva === t ? "border-b-2 border-indigo-600 text-indigo-700" : "text-gray-500"}`}>{t === "cuotas" ? "Cuotas" : t === "gastos" ? "Gastos" : "Observaciones"}</button>
                ))}
              </div>
              {tabActiva === "cuotas" && (
                <div>
                  {cuotas.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">Las cuotas se generan al confirmar el préstamo.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2 w-12">#</th><th>Vencimiento</th><th className="text-right">Capital</th><th className="text-right">Interés</th><th className="text-right">IVA</th><th className="text-right">Total</th><th className="text-right">Saldo</th><th className="text-center">Estado</th><th></th></tr></thead>
                      <tbody>
                        {cuotas.map(c => {
                          const vencida = c.estado === "pendiente" && c.fecha_vencimiento < hoy
                          return (
                            <tr key={c.id} className={`border-b ${c.estado === "conciliado" ? "text-green-700" : vencida ? "text-red-600" : ""}`}>
                              <td className="py-1.5">{c.numero_cuota}</td>
                              <td>{c.fecha_vencimiento}</td>
                              <td className="text-right">${c.capital?.toLocaleString()}</td>
                              <td className="text-right">${c.interes?.toLocaleString()}</td>
                              <td className="text-right">${c.iva?.toLocaleString()}</td>
                              <td className="text-right font-medium">${c.total?.toLocaleString()}</td>
                              <td className="text-right">${c.saldo?.toLocaleString()}</td>
                              <td className="text-center"><span className={`px-1.5 py-0.5 rounded text-xs ${c.estado === "conciliado" ? "bg-green-100 text-green-700" : vencida ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>{vencida ? "Vencida" : c.estado === "conciliado" ? "Conciliado" : "Pendiente"}</span></td>
                              <td>{c.estado === "pendiente" && seleccion?.estado === "pendiente" && <button onClick={() => pagarCuota(c)} className="h-6 px-2 border rounded text-xs hover:bg-gray-50">Pagar</button>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {tabActiva === "gastos" && (
                <div className="space-y-3">
                  {seleccion && seleccion.estado !== "cerrado" && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><label className="text-xs text-gray-500">Descripción</label><input value={gastoDesc} onChange={e => setGastoDesc(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <div className="w-32"><label className="text-xs text-gray-500">Importe</label><input type="number" value={gastoImporte} onChange={e => setGastoImporte(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <div className="w-40"><label className="text-xs text-gray-500">Cuenta</label><input value={gastoCuenta} onChange={e => setGastoCuenta(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <button onClick={agregarGasto} className="h-8 px-3 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center"><Plus className="h-4 w-4" /></button>
                    </div>
                  )}
                  {gastos.length > 0 && (
                    <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">Descripción</th><th className="text-right">Importe</th><th>Cuenta</th></tr></thead>
                      <tbody>{gastos.map(g => (<tr key={g.id} className="border-b"><td className="py-1.5">{g.descripcion}</td><td className="text-right">${g.importe?.toLocaleString()}</td><td>{g.cuenta_contable}</td></tr>))}</tbody></table>
                  )}
                </div>
              )}
              {tabActiva === "observaciones" && (
                <textarea value={formObs} onChange={e => setFormObs(e.target.value)} disabled={esSoloLectura} className="w-full h-40 text-sm border rounded p-2" placeholder="Observaciones..." />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Negociación de Cheques ──────────────────────────────────────────────────
function NegociacionChequesComp() {
  const supabase = createClient()
  const { sucursales } = useERP()
  const [lista, setLista] = useState<NegociacionCheques[]>([])
  const [seleccion, setSeleccion] = useState<NegociacionCheques | null>(null)
  const [modoCrear, setModoCrear] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [tabActiva, setTabActiva] = useState("cheques")

  const [cajasActivas, setCajasActivas] = useState<Caja[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [chequesEnCartera, setChequesEnCartera] = useState<ChequeTercero[]>([])
  const [itemsCheques, setItemsCheques] = useState<NegociacionChequeItem[]>([])
  const [gastosNeg, setGastosNeg] = useState<NegociacionGasto[]>([])
  const [devueltos, setDevueltos] = useState<{id: string; cheque_id: string; motivo_rechazo: string; fecha_rechazo: string; nd_generada_id: string | null}[]>([])

  const [formCaja, setFormCaja] = useState("")
  const [formTipoAcred, setFormTipoAcred] = useState("neto")
  const [formFecha, setFormFecha] = useState("")
  const [formSucursal, setFormSucursal] = useState("")
  const [formDestinoTipo, setFormDestinoTipo] = useState<string>("banco")
  const [formProveedorNombre, setFormProveedorNombre] = useState("")
  const [formCuentaBancaria, setFormCuentaBancaria] = useState("")
  const [formObs, setFormObs] = useState("")

  const [gCuenta, setGCuenta] = useState("")
  const [gDesc, setGDesc] = useState("")
  const [gImporte, setGImporte] = useState(0)
  const [gImpuestos, setGImpuestos] = useState(0)

  useEffect(() => { cargarRefs(); cargarLista() }, [])

  const cargarRefs = async () => {
    const [cj, cb] = await Promise.all([
      supabase.from("cajas").select("*").eq("activo", true),
      supabase.from("cuentas_bancarias").select("*").eq("activo", true),
    ])
    if (cj.data) setCajasActivas(cj.data)
    if (cb.data) setCuentasBancarias(cb.data)
  }

  const cargarChequesEnCartera = async (cajaId: string) => {
    const { data } = await supabase.from("cheques_terceros").select("*").eq("caja_id", cajaId).eq("estado", "en_cartera")
    setChequesEnCartera(data || [])
  }

  const cargarLista = async () => {
    const { data } = await supabase.from("negociaciones_cheques").select("*").order("created_at", { ascending: false })
    if (data) setLista(data)
  }

  const cargarDetalle = async (id: string) => {
    const { data } = await supabase.from("negociaciones_cheques").select("*").eq("id", id).single()
    if (data) {
      setSeleccion(data); setModoCrear(false)
      setFormCaja(data.caja_id || ""); setFormTipoAcred(data.tipo_acreditacion || "neto")
      setFormFecha(data.fecha || ""); setFormSucursal(data.sucursal || "")
      setFormDestinoTipo(data.destino_tipo || "banco")
      setFormProveedorNombre(data.proveedor_nombre || "")
      setFormCuentaBancaria(data.cuenta_bancaria_id || ""); setFormObs(data.observaciones || "")
      if (data.caja_id) cargarChequesEnCartera(data.caja_id)
      const { data: items } = await supabase.from("negociacion_cheques_items").select("*").eq("negociacion_id", id)
      setItemsCheques(items || [])
      const { data: g } = await supabase.from("negociacion_gastos").select("*").eq("negociacion_id", id)
      setGastosNeg(g || [])
      const { data: d } = await supabase.from("negociacion_cheques_devueltos").select("*").eq("negociacion_id", id)
      setDevueltos(d || [])
    }
  }

  const iniciarCreacion = () => {
    setSeleccion(null); setModoCrear(true); setItemsCheques([]); setGastosNeg([]); setDevueltos([])
    setFormCaja(""); setFormTipoAcred("neto"); setFormFecha("")
    setFormSucursal(sucursales.find(s => s.activa)?.nombre || "")
    setFormDestinoTipo("banco"); setFormProveedorNombre(""); setFormCuentaBancaria(""); setFormObs("")
    setTabActiva("cheques"); setChequesEnCartera([])
  }

  const guardar = async () => {
    if (!formCaja) { alert("Seleccioná una caja"); return }
    if (!formFecha) { alert("La fecha es obligatoria"); return }
    setGuardando(true)
    const caja = cajasActivas.find(c => c.id === formCaja)
    const cuenta = cuentasBancarias.find(c => c.id === formCuentaBancaria)
    const totalNegVal = itemsCheques.reduce((s, i) => s + i.importe, 0)
    const totalGasVal = gastosNeg.reduce((s, g) => s + g.total, 0)
    const payload = {
      caja_id: formCaja, caja_nombre: caja?.nombre || "",
      tipo_acreditacion: formTipoAcred, fecha: formFecha, sucursal: formSucursal,
      destino_tipo: formDestinoTipo,
      proveedor_nombre: formDestinoTipo === "proveedor" ? formProveedorNombre : null,
      cuenta_bancaria_id: formDestinoTipo === "banco" ? formCuentaBancaria : null,
      cuenta_bancaria_nombre: formDestinoTipo === "banco" && cuenta ? `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}` : null,
      total_negociado: totalNegVal, total_gastos: totalGasVal, total_recibido: totalNegVal - totalGasVal,
      observaciones: formObs,
    }
    if (modoCrear) {
      const { data: numData } = await supabase.rpc("generar_numero_negociacion", { p_sucursal: formSucursal })
      const { data: nuevo, error } = await supabase.from("negociaciones_cheques").insert({
        ...payload, numero: numData || `NCHQ-${Date.now()}`,
      }).select().single()
      if (error) { alert("Error: " + error.message); setGuardando(false); return }
      if (nuevo) {
        if (itemsCheques.length > 0) {
          await supabase.from("negociacion_cheques_items").insert(itemsCheques.map(i => ({
            negociacion_id: nuevo.id, cheque_id: i.cheque_id, valor_nombre: i.valor_nombre,
            valor_id: i.valor_id || null, importe: i.importe,
          })))
        }
        if (gastosNeg.length > 0) {
          await supabase.from("negociacion_gastos").insert(gastosNeg.map(g => ({
            negociacion_id: nuevo.id, tipo: g.tipo, cuenta_contable: g.cuenta_contable,
            cuenta_analitica: g.cuenta_analitica, descripcion: g.descripcion,
            importe: g.importe, impuestos: g.impuestos, total: g.total, moneda: g.moneda,
          })))
        }
        await cargarLista(); await cargarDetalle(nuevo.id)
      }
    } else if (seleccion && seleccion.estado === "borrador") {
      await supabase.from("negociaciones_cheques").update(payload).eq("id", seleccion.id)
      await supabase.from("negociacion_cheques_items").delete().eq("negociacion_id", seleccion.id)
      if (itemsCheques.length > 0) {
        await supabase.from("negociacion_cheques_items").insert(itemsCheques.map(i => ({
          negociacion_id: seleccion.id, cheque_id: i.cheque_id, valor_nombre: i.valor_nombre,
          valor_id: i.valor_id || null, importe: i.importe,
        })))
      }
      await supabase.from("negociacion_gastos").delete().eq("negociacion_id", seleccion.id)
      if (gastosNeg.length > 0) {
        await supabase.from("negociacion_gastos").insert(gastosNeg.map(g => ({
          negociacion_id: seleccion.id, tipo: g.tipo, cuenta_contable: g.cuenta_contable,
          cuenta_analitica: g.cuenta_analitica, descripcion: g.descripcion,
          importe: g.importe, impuestos: g.impuestos, total: g.total, moneda: g.moneda,
        })))
      }
      await cargarLista(); await cargarDetalle(seleccion.id)
    }
    setGuardando(false)
  }

  const avanzarEstado = async () => {
    if (!seleccion) return
    const flujo: Record<string, string> = { borrador: "en_negociacion", en_negociacion: "cobranza", cobranza: "liquidacion", liquidacion: "finalizada" }
    const siguiente = flujo[seleccion.estado]
    if (!siguiente) return
    if (siguiente === "finalizada") { await finalizarNegociacion(); return }
    await supabase.from("negociaciones_cheques").update({ estado: siguiente }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
  }

  const finalizarNegociacion = async () => {
    if (!seleccion) return
    const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", seleccion.caja_id).eq("estado", "abierto").single()
    if (!extracto) { alert("No hay extracto abierto para esta caja."); return }
    for (const item of itemsCheques) {
      await supabase.from("movimientos_caja").insert({
        extracto_id: extracto.id, valor_id: item.valor_id || null, valor_nombre: item.valor_nombre,
        tipo_movimiento: "egreso", importe: item.importe,
        concepto: `Negociación cheques ${seleccion.numero}`,
        documento_origen_tipo: "negociacion_cheques", documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero, estado_movimiento: "confirmado",
      })
      await supabase.from("cheques_terceros").update({
        estado: seleccion.destino_tipo === "banco" ? "negociado" : "endosado",
        fecha_egreso: new Date().toISOString(),
        destino_tipo: seleccion.destino_tipo,
        destino_nombre: seleccion.destino_tipo === "banco" ? seleccion.cuenta_bancaria_nombre : seleccion.proveedor_nombre,
      }).eq("id", item.cheque_id)
    }
    if (seleccion.destino_tipo === "banco" && seleccion.cuenta_bancaria_id) {
      await supabase.from("movimientos_banco").insert({
        cuenta_bancaria_id: seleccion.cuenta_bancaria_id,
        cuenta_bancaria_nombre: seleccion.cuenta_bancaria_nombre,
        tipo_movimiento: "ingreso", importe: seleccion.total_recibido,
        tipo_operacion: "Negociación Cheques",
        concepto: `Negociación cheques ${seleccion.numero}`,
        documento_origen_tipo: "negociacion_cheques", documento_origen_id: seleccion.id,
        documento_origen_numero: seleccion.numero, conciliado: false,
      })
    }
    await supabase.from("negociaciones_cheques").update({ estado: "finalizada" }).eq("id", seleccion.id)
    await cargarLista(); await cargarDetalle(seleccion.id)
  }

  const crearNDChequeRechazado = async (chequeId: string) => {
    if (!seleccion) return
    const { data: cheque } = await supabase.from("cheques_terceros").select("*").eq("id", chequeId).single()
    if (!cheque) { alert("Cheque no encontrado"); return }
    const total = cheque.importe
    const { data: nd } = await supabase.from("notas_debito_cheque_rechazado").insert({
      numero: `ND-CHQ-${Date.now()}`, negociacion_id: seleccion.id, cheque_id: chequeId,
      cliente_nombre: cheque.origen_nombre || "", importe_cheque: cheque.importe,
      gastos_bancarios: 0, total, fecha: new Date().toISOString().split('T')[0],
    }).select().single()
    await supabase.from("cheques_terceros").update({ estado: "rechazado", fecha_egreso: new Date().toISOString() }).eq("id", chequeId)
    if (nd) {
      await supabase.from("negociacion_cheques_devueltos").upsert({
        negociacion_id: seleccion.id, cheque_id: chequeId, nd_generada_id: nd.id,
        fecha_rechazo: new Date().toISOString().split('T')[0], motivo_rechazo: "Rechazado por el banco",
      })
    }
    await cargarDetalle(seleccion.id)
    alert("Nota de Débito generada: " + nd?.numero)
  }

  const agregarCheque = (cheque: ChequeTercero) => {
    if (itemsCheques.find(i => i.cheque_id === cheque.id)) return
    setItemsCheques([...itemsCheques, {
      id: crypto.randomUUID(), negociacion_id: seleccion?.id || "",
      cheque_id: cheque.id, valor_nombre: `Cheque ${cheque.numero_cheque} - ${cheque.banco_nombre}`,
      valor_id: "", importe: cheque.importe,
    }])
  }
  const quitarCheque = (chequeId: string) => setItemsCheques(itemsCheques.filter(i => i.cheque_id !== chequeId))

  const agregarGasto = () => {
    if (!gDesc || gImporte <= 0) return
    const total = gImporte + gImpuestos
    setGastosNeg([...gastosNeg, { id: crypto.randomUUID(), negociacion_id: seleccion?.id || "", tipo: "Cuenta Contable", cuenta_contable: gCuenta, cuenta_analitica: "", descripcion: gDesc, importe: gImporte, impuestos: gImpuestos, total, moneda: "ARS" }])
    setGDesc(""); setGImporte(0); setGImpuestos(0); setGCuenta("")
  }

  const totalNeg = itemsCheques.reduce((s, i) => s + i.importe, 0)
  const totalGas = gastosNeg.reduce((s, g) => s + g.total, 0)
  const totalRecibido = totalNeg - totalGas
  const listaFiltrada = lista.filter(d => {
    if (busqueda) { const b = busqueda.toLowerCase(); return d.numero.toLowerCase().includes(b) || d.caja_nombre?.toLowerCase().includes(b) }
    return true
  })
  const esSoloLectura = seleccion ? seleccion.estado !== "borrador" : false
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { borrador: "bg-gray-100 text-gray-700", en_negociacion: "bg-blue-100 text-blue-700", cobranza: "bg-yellow-100 text-yellow-700", liquidacion: "bg-purple-100 text-purple-700", finalizada: "bg-green-100 text-green-700", cancelada: "bg-red-100 text-red-700" }
    const l: Record<string, string> = { borrador: "Borrador", en_negociacion: "En Negociación", cobranza: "Cobranza", liquidacion: "Liquidación", finalizada: "Finalizada", cancelada: "Cancelada" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold text-amber-900">Negociación de Cheques</h2>
        <button onClick={iniciarCreacion} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="h-4 w-4" />Nuevo</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r overflow-y-auto">
          <div className="p-2"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div></div>
          {listaFiltrada.map(item => (
            <div key={item.id} onClick={() => cargarDetalle(item.id)} className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${seleccion?.id === item.id ? "bg-indigo-50" : ""}`}>
              <div className="flex justify-between items-start"><span className="font-medium text-sm">{item.numero}</span>{badgeEstado(item.estado)}</div>
              <div className="text-xs text-gray-500 mt-1">{item.caja_nombre} · ${item.total_negociado?.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!seleccion && !modoCrear ? (
            <div className="flex items-center justify-center h-full text-gray-400">Seleccioná una negociación o creá una nueva</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div><h3 className="text-lg font-bold">{modoCrear ? "Nueva Negociación" : seleccion?.numero}</h3>{seleccion && badgeEstado(seleccion.estado)}</div>
                <div className="flex gap-2">
                  {(modoCrear || seleccion?.estado === "borrador") && <button onClick={guardar} disabled={guardando} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"><Check className="h-4 w-4" />{guardando ? "Guardando..." : "Guardar"}</button>}
                  {seleccion && !["finalizada", "cancelada"].includes(seleccion.estado) && <button onClick={avanzarEstado} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><FileCheck className="h-4 w-4" />{seleccion.estado === "liquidacion" ? "Finalizar" : "Avanzar"}</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-gray-500">Caja</label><select value={formCaja} onChange={e => { setFormCaja(e.target.value); cargarChequesEnCartera(e.target.value) }} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="">-- Seleccionar --</option>{cajasActivas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">Tipo Acreditación</label><select value={formTipoAcred} onChange={e => setFormTipoAcred(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="neto">Neto</option><option value="bruto">Bruto</option></select></div>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded text-sm">
                    <div><span className="text-xs text-gray-500">Negociado</span><p className="font-medium">${totalNeg.toLocaleString()}</p></div>
                    <div><span className="text-xs text-gray-500">Gastos</span><p className="font-medium">${totalGas.toLocaleString()}</p></div>
                    <div><span className="text-xs text-gray-500">Recibido</span><p className="font-medium text-green-700">${totalRecibido.toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-gray-500">Fecha</label><input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Sucursal</label><select value={formSucursal} onChange={e => setFormSucursal(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5">{sucursales.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}</select></div>
                  <div><label className="text-xs font-medium text-gray-500">Destino</label><select value={formDestinoTipo} onChange={e => setFormDestinoTipo(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="banco">Banco</option><option value="proveedor">Proveedor</option></select></div>
                  {formDestinoTipo === "banco" && <div><label className="text-xs font-medium text-gray-500">Cuenta Bancaria</label><select value={formCuentaBancaria} onChange={e => setFormCuentaBancaria(e.target.value)} disabled={esSoloLectura} className="w-full text-sm border rounded p-1.5"><option value="">-- Seleccionar --</option>{cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} - {c.numero_cuenta}</option>)}</select></div>}
                  {formDestinoTipo === "proveedor" && <div><label className="text-xs font-medium text-gray-500">Proveedor</label><input value={formProveedorNombre} onChange={e => setFormProveedorNombre(e.target.value)} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>}
                </div>
              </div>
              <div className="border-b flex gap-4">
                {["cheques", "devueltos", "gastos", "observaciones"].map(t => (
                  <button key={t} onClick={() => setTabActiva(t)} className={`pb-2 text-sm font-medium ${tabActiva === t ? "border-b-2 border-indigo-600 text-indigo-700" : "text-gray-500"}`}>
                    {t === "cheques" ? "Cheques" : t === "devueltos" ? "Devueltos" : t === "gastos" ? "Gastos" : "Observaciones"}
                  </button>
                ))}
              </div>
              {tabActiva === "cheques" && (
                <div className="space-y-3">
                  {!esSoloLectura && chequesEnCartera.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Cheques en cartera de esta caja:</label>
                      <div className="max-h-40 overflow-y-auto border rounded">
                        {chequesEnCartera.filter(c => !itemsCheques.find(i => i.cheque_id === c.id)).map(c => (
                          <div key={c.id} className="flex justify-between items-center p-2 border-b hover:bg-gray-50 cursor-pointer" onClick={() => agregarCheque(c)}>
                            <div><span className="text-sm font-medium">Chq #{c.numero_cheque}</span><span className="text-xs text-gray-500 ml-2">{c.banco_nombre} · Vto: {c.fecha_vencimiento}</span></div>
                            <div className="flex items-center gap-2"><span className="text-sm font-medium">${c.importe?.toLocaleString()}</span><Plus className="h-4 w-4 text-indigo-600" /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {itemsCheques.length > 0 ? (
                    <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">Cheque</th><th className="text-right">Importe</th><th></th></tr></thead>
                      <tbody>{itemsCheques.map(i => (
                        <tr key={i.id} className="border-b"><td className="py-1.5">{i.valor_nombre}</td><td className="text-right">${i.importe?.toLocaleString()}</td>
                          <td className="text-right">{!esSoloLectura && <button onClick={() => quitarCheque(i.cheque_id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}</td></tr>
                      ))}</tbody></table>
                  ) : <p className="text-sm text-gray-400 py-4">No hay cheques agregados.</p>}
                </div>
              )}
              {tabActiva === "devueltos" && (
                <div className="space-y-3">
                  {devueltos.length === 0 ? <p className="text-sm text-gray-400 py-4">Sin cheques devueltos.</p> : (
                    <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">Cheque</th><th>Motivo</th><th>Fecha</th><th>N.D.</th><th></th></tr></thead>
                      <tbody>{devueltos.map(d => (
                        <tr key={d.id} className="border-b"><td className="py-1.5">{d.cheque_id.slice(0, 8)}...</td><td>{d.motivo_rechazo}</td><td>{d.fecha_rechazo}</td><td>{d.nd_generada_id ? "Generada" : "—"}</td>
                          <td>{!d.nd_generada_id && seleccion?.estado === "finalizada" && <button onClick={() => crearNDChequeRechazado(d.cheque_id)} className="h-6 px-2 border rounded text-xs hover:bg-gray-50">Crear N.D.</button>}</td></tr>
                      ))}</tbody></table>
                  )}
                  {seleccion?.estado === "finalizada" && itemsCheques.length > 0 && (
                    <div><label className="text-xs font-medium text-gray-500">Marcar cheque como rechazado:</label>
                      <div className="flex gap-2 flex-wrap mt-1">{itemsCheques.map(i => (
                        <button key={i.id} onClick={() => crearNDChequeRechazado(i.cheque_id)} className="px-2 py-1 border rounded text-xs hover:bg-gray-50">{i.valor_nombre}</button>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}
              {tabActiva === "gastos" && (
                <div className="space-y-3">
                  {!esSoloLectura && (
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="w-40"><label className="text-xs text-gray-500">Cuenta Contable</label><input value={gCuenta} onChange={e => setGCuenta(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <div className="flex-1"><label className="text-xs text-gray-500">Descripción</label><input value={gDesc} onChange={e => setGDesc(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <div className="w-28"><label className="text-xs text-gray-500">Importe</label><input type="number" value={gImporte} onChange={e => setGImporte(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <div className="w-28"><label className="text-xs text-gray-500">Impuestos</label><input type="number" value={gImpuestos} onChange={e => setGImpuestos(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm h-8" /></div>
                      <button onClick={agregarGasto} className="h-8 px-3 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center"><Plus className="h-4 w-4" /></button>
                    </div>
                  )}
                  {gastosNeg.length > 0 && (
                    <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">Cuenta</th><th>Descripción</th><th className="text-right">Importe</th><th className="text-right">Impuestos</th><th className="text-right">Total</th></tr></thead>
                      <tbody>{gastosNeg.map(g => (
                        <tr key={g.id} className="border-b"><td className="py-1.5">{g.cuenta_contable}</td><td>{g.descripcion}</td><td className="text-right">${g.importe?.toLocaleString()}</td><td className="text-right">${g.impuestos?.toLocaleString()}</td><td className="text-right font-medium">${g.total?.toLocaleString()}</td></tr>
                      ))}</tbody></table>
                  )}
                </div>
              )}
              {tabActiva === "observaciones" && (
                <textarea value={formObs} onChange={e => setFormObs(e.target.value)} disabled={esSoloLectura} className="w-full h-40 text-sm border rounded p-2" placeholder="Observaciones..." />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cheques de Terceros ─────────────────────────────────────────────────────
function ChequesTerceros() {
  const supabase = createClient()
  const [lista, setLista] = useState<ChequeTercero[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  useEffect(() => { cargar() }, [])
  const cargar = async () => {
    const { data } = await supabase.from("cheques_terceros").select("*").order("fecha_vencimiento", { ascending: false })
    if (data) setLista(data)
  }

  const listaFiltrada = lista.filter(c => {
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false
    if (busqueda) { const b = busqueda.toLowerCase(); return c.numero_cheque.toLowerCase().includes(b) || c.banco_nombre?.toLowerCase().includes(b) || c.origen_nombre?.toLowerCase().includes(b) }
    return true
  })
  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { en_cartera: "bg-blue-100 text-blue-700", negociado: "bg-green-100 text-green-700", depositado: "bg-teal-100 text-teal-700", endosado: "bg-purple-100 text-purple-700", rechazado: "bg-red-100 text-red-700", cancelado: "bg-gray-100 text-gray-700" }
    const l: Record<string, string> = { en_cartera: "En Cartera", negociado: "Negociado", depositado: "Depositado", endosado: "Endosado", rechazado: "Rechazado", cancelado: "Cancelado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold text-amber-900">Cheques de Terceros</h2>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar por número, banco, origen..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="text-sm border rounded px-2">
            <option value="todos">Todos</option><option value="en_cartera">En Cartera</option><option value="negociado">Negociado</option><option value="depositado">Depositado</option><option value="endosado">Endosado</option><option value="rechazado">Rechazado</option>
          </select>
        </div>
        <div className="text-xs text-gray-500">{listaFiltrada.length} cheque(s)</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">N° Cheque</th><th>Banco</th><th>Origen</th><th>Vencimiento</th><th className="text-right">Importe</th><th>Moneda</th><th>Caja</th><th className="text-center">Estado</th></tr></thead>
          <tbody>{listaFiltrada.map(c => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="py-1.5 font-medium">{c.numero_cheque}</td><td>{c.banco_nombre}</td><td>{c.origen_nombre}</td><td>{c.fecha_vencimiento}</td>
              <td className="text-right">${c.importe?.toLocaleString()}</td><td>{c.moneda}</td><td>{c.caja_nombre}</td><td className="text-center">{badgeEstado(c.estado)}</td>
            </tr>
          ))}</tbody>
        </table>
        {listaFiltrada.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay cheques de terceros registrados. Los cheques ingresan automáticamente desde Ventas cuando el cliente paga con cheque.</p>}
      </div>
    </div>
  )
}

// ─── Cheques Propios ─────────────────────────────────────────────────────────
function ChequesPropios() {
  const supabase = createClient()
  const [lista, setLista] = useState<{id: string; numero_cheque: string; banco_nombre: string; importe: number; moneda: string; fecha_emision: string; beneficiario: string; estado: string}[]>([])
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => { cargar() }, [])
  const cargar = async () => { setLista([]) }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold text-amber-900">Cheques Propios</h2>
      </div>
      <div className="p-4">
        <div className="relative mb-3"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div>
        {lista.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay cheques propios registrados. Los cheques propios se generan al pagar con cheque en Compras → Órdenes de Pago.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">N° Cheque</th><th>Banco</th><th>Beneficiario</th><th>Emisión</th><th className="text-right">Importe</th><th>Moneda</th><th className="text-center">Estado</th></tr></thead>
            <tbody>{lista.map(c => (
              <tr key={c.id} className="border-b"><td className="py-1.5 font-medium">{c.numero_cheque}</td><td>{c.banco_nombre}</td><td>{c.beneficiario}</td><td>{c.fecha_emision}</td><td className="text-right">${c.importe?.toLocaleString()}</td><td>{c.moneda}</td><td className="text-center">{c.estado}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Conciliación Bancaria ───────────────────────────────────────────────────

function ConciliacionBancaria() {
  const supabase = createClient()
  const { sucursales } = useERP()
  const [pantalla, setPantalla] = useState<'filtros' | 'movimientos'>('filtros')
  const [cuentas, setCuentas] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoBancoConciliacion[]>([])
  const [cambios, setCambios] = useState<Record<string,boolean>>({})
  const [busqueda, setBusqueda] = useState("")
  const [filtroImporte, setFiltroImporte] = useState("")
  const [filtroDebeHaber, setFiltroDebeHaber] = useState<'todos'|'debe'|'haber'>('todos')
  const [tabActivo, setTabActivo] = useState<'filtros'|'movimientos'>('movimientos')
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosConciliacion>({
    cuentaBancariaId: '',
    desde: '2000-01-01',
    hasta: new Date().toISOString().split('T')[0],
    tipoFecha: 'fecha_operacion',
    sucursales: sucursales.filter(s => s.activa).map(s => s.nombre),
    tiposMovimiento: ['Transferencia','Cheque Diferido','Cheque Corriente','Extracción','Depósito','Débito Bancario','Débito Automático','Transferencia entre Cuentas Propias','Acreditación de Tarjeta','Extracción con Cheque'],
    incluirNoClasificados: true,
    soloConciliados: false,
  })
  const [modalAjuste, setModalAjuste] = useState<MovimientoBancoConciliacion|null>(null)
  const [ajusteConcepto, setAjusteConcepto] = useState("")
  const [ajusteImporte, setAjusteImporte] = useState(0)

  useEffect(() => {
    supabase.from('cuentas_bancarias').select('*').order('banco_nombre').then(({data}) => setCuentas(data||[]))
  }, [])

  const cargarMovimientos = async () => {
    if (!filtros.cuentaBancariaId) return
    setLoading(true)
    let query = supabase.from('movimientos_banco').select('*').eq('cuenta_bancaria_id', filtros.cuentaBancariaId).order('fecha_operacion', { ascending: true })
    if (filtros.tipoFecha === 'fecha_operacion') {
      query = query.gte('fecha_operacion', filtros.desde).lte('fecha_operacion', filtros.hasta)
    } else {
      query = query.gte('fecha_creacion', filtros.desde).lte('fecha_creacion', filtros.hasta)
    }
    if (filtros.soloConciliados === true) query = query.eq('conciliado', true)
    else if (filtros.soloConciliados === false) query = query.eq('conciliado', false)
    if (filtros.tiposMovimiento.length > 0) query = query.in('tipo_operacion', filtros.tiposMovimiento)
    const { data } = await query
    setMovimientos(data || [])
    setCambios({})
    setLoading(false)
  }

  const metricas = useMemo<MetricasConciliacion>(() => {
    const sumar = (movs: MovimientoBancoConciliacion[]) => movs.reduce((a,m) => a + (m.tipo_movimiento === 'ingreso' ? m.importe : -m.importe), 0)
    const efectivos = movimientos.map(m => ({ ...m, conciliado: cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado }))
    const conc = efectivos.filter(m => m.conciliado)
    const noConc = efectivos.filter(m => !m.conciliado)
    return { saldoEntreFechas: sumar(noConc), saldoActual: sumar(efectivos), totalConciliados: sumar(conc), totalNoConciliados: sumar(noConc), cantidadModificados: Object.keys(cambios).length }
  }, [movimientos, cambios])

  const toggleConciliado = async (m: MovimientoBancoConciliacion) => {
    const nuevo = cambios[m.id] !== undefined ? !cambios[m.id] : !m.conciliado
    setCambios(prev => ({ ...prev, [m.id]: nuevo }))
    await supabase.from('movimientos_banco').update({ conciliado: nuevo, fecha_conciliacion: nuevo ? new Date().toISOString() : null }).eq('id', m.id)
  }

  const guardarCambios = async () => {
    const updates = Object.entries(cambios).map(([id, conciliado]) =>
      supabase.from('movimientos_banco').update({ conciliado, fecha_conciliacion: conciliado ? new Date().toISOString() : null }).eq('id', id)
    )
    await Promise.all(updates)
    setCambios({})
    await cargarMovimientos()
  }

  const crearAjuste = async () => {
    if (!modalAjuste) return
    const cuenta = cuentas.find(c => c.id === filtros.cuentaBancariaId)
    await supabase.from('ajustes_banco').insert({
      cuenta_bancaria_id: filtros.cuentaBancariaId,
      cuenta_bancaria_nombre: cuenta?.banco_nombre,
      tipo: ajusteImporte >= 0 ? 'ingreso' : 'egreso',
      importe: Math.abs(ajusteImporte),
      concepto: ajusteConcepto,
      fecha: new Date().toISOString().split('T')[0],
      sucursal: sucursales.find(s => s.activa)?.nombre || '',
      estado: 'confirmado',
    })
    await supabase.from('movimientos_banco').update({ conciliado: true, fecha_conciliacion: new Date().toISOString() }).eq('id', modalAjuste.id)
    setModalAjuste(null)
    setAjusteConcepto("")
    setAjusteImporte(0)
    await cargarMovimientos()
  }

  const descargarCSV = () => {
    const headers = ['Fecha Op.','Fecha Creación','Tipo Op.','N° Op.','Chequera','N° Cheque','Debe','Haber','Conciliado']
    const rows = movimientosFiltrados.map(m => [
      m.fecha_operacion||'', m.fecha_creacion||'', m.tipo_operacion||'', m.numero_operacion||'', m.chequera||'', m.numero_cheque||'',
      m.tipo_movimiento==='egreso'?m.importe:'', m.tipo_movimiento==='ingreso'?m.importe:'', m.conciliado?'Sí':'No'
    ])
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='conciliacion_bancaria.csv'; a.click()
  }

  const movimientosFiltrados = useMemo(() => {
    let f = movimientos
    if (busqueda) { const b=busqueda.toLowerCase(); f=f.filter(m=>(m.concepto||'').toLowerCase().includes(b)||(m.numero_operacion||'').toLowerCase().includes(b)||(m.tipo_operacion||'').toLowerCase().includes(b)) }
    if (filtroImporte) { const imp=Number(filtroImporte); f=f.filter(m=>m.importe===imp) }
    if (filtroDebeHaber==='debe') f=f.filter(m=>m.tipo_movimiento==='egreso')
    if (filtroDebeHaber==='haber') f=f.filter(m=>m.tipo_movimiento==='ingreso')
    return f
  },[movimientos,busqueda,filtroImporte,filtroDebeHaber])

  const eliminarSucursal = (idx:number) => setFiltros(p=>({...p, sucursales: p.sucursales.filter((_,i)=>i!==idx)}))
  const agregarSucursal = () => setFiltros(p=>({...p, sucursales: [...p.sucursales, '']}))
  const eliminarTipo = (idx:number) => setFiltros(p=>({...p, tiposMovimiento: p.tiposMovimiento.filter((_,i)=>i!==idx)}))
  const agregarTipo = () => setFiltros(p=>({...p, tiposMovimiento: [...p.tiposMovimiento, '']}))

  if (pantalla === 'filtros') {
    return (
      <div className="p-6 max-w-4xl">
        <h2 className="text-2xl font-bold text-amber-900 mb-6">Conciliación Bancaria — Filtros</h2>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Banco</label>
            <select value={filtros.cuentaBancariaId} onChange={e=>setFiltros(p=>({...p,cuentaBancariaId:e.target.value}))} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map(c=><option key={c.id} value={c.id}>{c.banco_nombre} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Fecha</label>
            <select value={filtros.tipoFecha} onChange={e=>setFiltros(p=>({...p,tipoFecha:e.target.value as any}))} className="w-full border rounded px-3 py-2 text-sm">
              <option value="fecha_operacion">Fecha de operación</option>
              <option value="fecha_creacion">Fecha de creación</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Desde</label>
            <input type="date" value={filtros.desde} onChange={e=>setFiltros(p=>({...p,desde:e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Hasta</label>
            <input type="date" value={filtros.hasta} onChange={e=>setFiltros(p=>({...p,hasta:e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Conciliado</label>
            <select value={filtros.soloConciliados===null?'todos':filtros.soloConciliados?'si':'no'} onChange={e=>{ const v=e.target.value; setFiltros(p=>({...p,soloConciliados:v==='todos'?null:v==='si'})) }} className="w-full border rounded px-3 py-2 text-sm">
              <option value="no">No</option><option value="si">Sí</option><option value="todos">Todos</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Sucursales</h3>
            <div className="border rounded p-3 space-y-1">
              {filtros.sucursales.map((s,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <input value={s} onChange={e=>{const ns=[...filtros.sucursales]; ns[i]=e.target.value; setFiltros(p=>({...p,sucursales:ns}))}} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Nombre" />
                  <button onClick={()=>eliminarSucursal(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
              <button onClick={agregarSucursal} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3"/>Añadir elemento</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tipos de Movimiento</h3>
            <div className="border rounded p-3 space-y-1">
              {filtros.tiposMovimiento.map((t,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <input value={t} onChange={e=>{const nt=[...filtros.tiposMovimiento]; nt[i]=e.target.value; setFiltros(p=>({...p,tiposMovimiento:nt}))}} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Tipo" />
                  <button onClick={()=>eliminarTipo(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
              <button onClick={agregarTipo} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3"/>Añadir elemento</button>
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input type="checkbox" checked={filtros.incluirNoClasificados} onChange={e=>setFiltros(p=>({...p,incluirNoClasificados:e.target.checked}))} className="rounded" />
                Movimientos no Clasificados
              </label>
            </div>
          </div>
        </div>
        <button onClick={()=>{cargarMovimientos(); setPantalla('movimientos')}} disabled={!filtros.cuentaBancariaId} className="px-6 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">Confirmar Filtros</button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-900">Conciliación Bancaria</h2>
        <div className="flex gap-2">
          <button onClick={()=>setPantalla('filtros')} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><Filter className="w-4 h-4"/>Cambiar Filtros</button>
          <button onClick={descargarCSV} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><Download className="w-4 h-4"/>Descargar</button>
          <button onClick={guardarCambios} disabled={Object.keys(cambios).length===0} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"><Check className="w-4 h-4"/>Guardar</button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Saldo entre Fechas', val: metricas.saldoEntreFechas },
          { label: 'Saldo Actual', val: metricas.saldoActual },
          { label: 'Total Mov. Conciliados', val: metricas.totalConciliados },
          { label: 'Total Mov. No Conciliados', val: metricas.totalNoConciliados },
        ].map(m=>(
          <div key={m.label} className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-lg font-bold ${m.val<0?'text-red-600':'text-gray-900'}`}>$ {m.val.toLocaleString('es-AR',{minimumFractionDigits:2})}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-4">
        <button onClick={()=>setTabActivo('filtros')} className={`pb-2 text-sm font-medium ${tabActivo==='filtros'?'border-b-2 border-indigo-600 text-indigo-600':'text-gray-500'}`}>Filtros</button>
        <button onClick={()=>setTabActivo('movimientos')} className={`pb-2 text-sm font-medium ${tabActivo==='movimientos'?'border-b-2 border-indigo-600 text-indigo-600':'text-gray-500'}`}>Movimientos Bancarios</button>
      </div>

      {tabActivo === 'filtros' ? (
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Cuenta:</strong> {cuentas.find(c=>c.id===filtros.cuentaBancariaId)?.banco_nombre}</p>
          <p><strong>Período:</strong> {filtros.desde} al {filtros.hasta} ({filtros.tipoFecha==='fecha_operacion'?'Fecha de operación':'Fecha de creación'})</p>
          <p><strong>Conciliado:</strong> {filtros.soloConciliados===null?'Todos':filtros.soloConciliados?'Sí':'No'}</p>
          <p><strong>Sucursales:</strong> {filtros.sucursales.join(', ')}</p>
          <p><strong>Tipos:</strong> {filtros.tiposMovimiento.join(', ')}</p>
        </div>
      ) : (
        <>
          {/* Mini-filtros */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"/><input placeholder="Buscar en concepto, operación..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="w-full pl-8 h-9 border rounded text-sm" /></div>
            <input type="number" placeholder="Filtrar por importe" value={filtroImporte} onChange={e=>setFiltroImporte(e.target.value)} className="w-36 border rounded px-2 h-9 text-sm" />
            <select value={filtroDebeHaber} onChange={e=>setFiltroDebeHaber(e.target.value as any)} className="border rounded px-2 h-9 text-sm">
              <option value="todos">Todos</option><option value="debe">En el Debe</option><option value="haber">En el Haber</option>
            </select>
            <span className="text-xs text-gray-500">Modificado(s): {metricas.cantidadModificados}</span>
          </div>

          {loading ? <p className="text-center py-8 text-gray-400">Cargando...</p> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                  <th className="py-2 px-2">Fecha Op.</th><th className="px-2">Fecha Creac.</th><th className="px-2">Tipo Op. / Ref.</th><th className="px-2">N° Op.</th><th className="px-2">Chequera</th><th className="px-2">N° Cheque</th><th className="px-2 text-right">Debe</th><th className="px-2 text-right">Haber</th><th className="px-2 text-center">Conc.</th><th className="px-2">Acc.</th>
                </tr></thead>
                <tbody>{movimientosFiltrados.map(m=>{
                  const esConciliado = cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado
                  const bgColor = esConciliado ? 'bg-green-50' : !m.documento_origen_tipo ? 'bg-gray-50' : ''
                  return (
                    <tr key={m.id} className={`border-b ${bgColor}`}>
                      <td className="py-1.5 px-2">{m.fecha_operacion||'—'}</td>
                      <td className="px-2 text-gray-500">{m.fecha_creacion ? new Date(m.fecha_creacion).toLocaleDateString() : '—'}</td>
                      <td className="px-2">{m.tipo_operacion||m.concepto||'—'}</td>
                      <td className="px-2">{m.numero_operacion||'—'}</td>
                      <td className="px-2">{m.chequera||'—'}</td>
                      <td className="px-2">{m.numero_cheque||'—'}</td>
                      <td className="px-2 text-right text-red-600">{m.tipo_movimiento==='egreso'?`$${m.importe.toLocaleString('es-AR',{minimumFractionDigits:2})}`:''}</td>
                      <td className="px-2 text-right text-green-600">{m.tipo_movimiento==='ingreso'?`$${m.importe.toLocaleString('es-AR',{minimumFractionDigits:2})}`:''}</td>
                      <td className="px-2 text-center"><input type="checkbox" checked={esConciliado} onChange={()=>toggleConciliado(m)} className="rounded" /></td>
                      <td className="px-2">
                        <div className="flex gap-1">
                          {m.documento_origen_tipo && <button title="Ver documento" className="text-gray-400 hover:text-indigo-600"><Eye className="w-3.5 h-3.5"/></button>}
                          <button title="Crear ajuste" onClick={()=>{setModalAjuste(m); setAjusteImporte(m.importe); setAjusteConcepto(m.concepto||'')}} className="text-gray-400 hover:text-indigo-600"><Plus className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
              {movimientosFiltrados.length===0 && <p className="text-center py-8 text-gray-400">No hay movimientos para los filtros aplicados</p>}
            </div>
          )}
        </>
      )}

      {/* Modal Ajuste de Banco */}
      {modalAjuste && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[450px]">
            <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Crear Ajuste de Banco</h3><button onClick={()=>setModalAjuste(null)}><X className="w-4 h-4"/></button></div>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-500">Cuenta</label><p className="text-sm font-medium">{cuentas.find(c=>c.id===filtros.cuentaBancariaId)?.banco_nombre}</p></div>
              <div><label className="text-sm text-gray-500 block">Concepto</label><input value={ajusteConcepto} onChange={e=>setAjusteConcepto(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
              <div><label className="text-sm text-gray-500 block">Importe</label><input type="number" value={ajusteImporte} onChange={e=>setAjusteImporte(Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={()=>setModalAjuste(null)} className="px-4 py-2 border rounded text-sm">Cancelar</button>
              <button onClick={crearAjuste} className="px-4 py-2 bg-indigo-900 text-white rounded text-sm">Guardar Ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cupones (listado global) ────────────────────────────────────────────────

function Cupones() {
  const supabase = createClient()
  const [cupones, setCupones] = useState<CuponTarjeta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [sinCancelados, setSinCancelados] = useState(true)
  const [sinRechazados, setSinRechazados] = useState(true)
  const [sinConciliados, setSinConciliados] = useState(true)
  const [detalle, setDetalle] = useState<CuponTarjeta|null>(null)

  useEffect(() => { cargar() }, [sinCancelados, sinRechazados, sinConciliados])

  const cargar = async () => {
    let query = supabase.from('cupones_tarjeta').select('*').order('fecha_ing_egr', { ascending: false })
    if (sinCancelados) query = query.neq('estado', 'cancelado')
    if (sinRechazados) query = query.neq('estado', 'rechazado')
    if (sinConciliados) query = query.neq('estado', 'conciliado')
    const { data } = await query
    setCupones(data || [])
  }

  const filtrados = useMemo(() => {
    if (!busqueda) return cupones
    const b = busqueda.toLowerCase()
    return cupones.filter(c => (c.numero_cupon||'').toLowerCase().includes(b) || (c.tarjeta_nombre||'').toLowerCase().includes(b) || (c.cliente_nombre||'').toLowerCase().includes(b) || (c.forma_pago_nombre||'').toLowerCase().includes(b))
  }, [cupones, busqueda])

  const badgeEstado = (e: string) => {
    const map: Record<string,string> = { en_cartera: 'bg-blue-100 text-blue-700', conciliado: 'bg-green-100 text-green-700', rechazado: 'bg-red-100 text-red-700', cancelado: 'bg-gray-100 text-gray-600' }
    const labels: Record<string,string> = { en_cartera: 'En cartera', conciliado: 'Conciliado', rechazado: 'Rechazado', cancelado: 'Cancelado' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[e]||''}`}>{labels[e]||e}</span>
  }

  if (detalle) {
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={()=>setDetalle(null)} className="text-sm text-indigo-600 hover:underline mb-4 flex items-center gap-1"><X className="w-3 h-3"/>Volver al listado</button>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Cupón — {detalle.tarjeta_nombre} {detalle.numero_cupon}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Tarjeta:</span> <strong>{detalle.tarjeta_nombre}</strong></div>
            <div><span className="text-gray-500">N° Cupón:</span> <strong>{detalle.numero_cupon}</strong></div>
            <div><span className="text-gray-500">N° Lote:</span> <strong>{detalle.numero_lote||'—'}</strong></div>
            <div><span className="text-gray-500">Fecha:</span> <strong>{detalle.fecha_ing_egr ? new Date(detalle.fecha_ing_egr).toLocaleDateString() : '—'}</strong></div>
            <div><span className="text-gray-500">Cliente:</span> <strong>{detalle.cliente_nombre}</strong></div>
            <div><span className="text-gray-500">Forma de Pago:</span> <strong>{detalle.forma_pago_nombre}</strong></div>
            <div><span className="text-gray-500">Sucursal:</span> <strong>{detalle.sucursal}</strong></div>
            <div><span className="text-gray-500">Importe:</span> <strong>${detalle.importe?.toLocaleString('es-AR',{minimumFractionDigits:2})} {detalle.moneda}</strong></div>
            <div><span className="text-gray-500">Estado:</span> {badgeEstado(detalle.estado)}</div>
            <div><span className="text-gray-500">Venta:</span> <strong>{detalle.venta_numero||'—'}</strong></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-amber-900 mb-4">Cupones de Tarjeta</h2>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"/><input placeholder="Buscar por tarjeta, cupón, cliente..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="w-full pl-8 h-9 border rounded text-sm" /></div>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinCancelados} onChange={e=>setSinCancelados(e.target.checked)} className="rounded"/>Sin Cancelados</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinRechazados} onChange={e=>setSinRechazados(e.target.checked)} className="rounded"/>Sin Rechazados</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinConciliados} onChange={e=>setSinConciliados(e.target.checked)} className="rounded"/>Sin Conciliados</label>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0"/>Los cupones se generan automáticamente cuando el cliente paga con tarjeta en Ventas.</div>
      {filtrados.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No hay cupones que coincidan con los filtros</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
              <th className="py-2 px-2">Tarjeta</th><th className="px-2">N° Cupón</th><th className="px-2">N° Lote</th><th className="px-2">Fecha</th><th className="px-2">Cliente</th><th className="px-2">Forma de Pago</th><th className="px-2">Sucursal</th><th className="px-2 text-center">Estado</th><th className="px-2 text-right">Importe</th>
            </tr></thead>
            <tbody>{filtrados.map(c=>(
              <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>setDetalle(c)}>
                <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                <td className="px-2">{c.numero_cupon||'—'}</td>
                <td className="px-2">{c.numero_lote||'—'}</td>
                <td className="px-2">{c.fecha_ing_egr ? new Date(c.fecha_ing_egr).toLocaleDateString() : '—'}</td>
                <td className="px-2">{c.cliente_nombre}</td>
                <td className="px-2">{c.forma_pago_nombre}</td>
                <td className="px-2">{c.sucursal}</td>
                <td className="px-2 text-center">{badgeEstado(c.estado)}</td>
                <td className="px-2 text-right font-medium">${c.importe?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Conciliación de Tarjetas ────────────────────────────────────────────────

function ConciliacionTarjetas() {
  const supabase = createClient()
  const { sucursales } = useERP()
  const sucActiva = sucursales.find(s => s.activa)?.nombre || ''
  const [lista, setLista] = useState<ConciliacionTarjeta[]>([])
  const [detalle, setDetalle] = useState<ConciliacionTarjeta|null>(null)
  const [form, setForm] = useState<Partial<ConciliacionTarjeta>>({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [cupones, setCupones] = useState<(CuponTarjeta & {conciliado?:boolean; rechazado?:boolean})[]>([])
  const [cargos, setCargos] = useState<ConciliacionTarjetaCargo[]>([])
  const [guardando, setGuardando] = useState(false)
  const [cuponesRechazados, setCuponesRechazados] = useState<CuponTarjeta[]>([])
  const [tabActivo, setTabActivo] = useState<'filtros'|'cupones'|'rechazados'|'cargos'|'observaciones'>('cupones')
  const [busqueda, setBusqueda] = useState("")
  // Filtros de cupones
  const [filtroSucs, setFiltroSucs] = useState<string[]>([])
  const [filtroDesde, setFiltroDesde] = useState("2000-01-01")
  const [filtroHasta, setFiltroHasta] = useState(new Date().toISOString().split('T')[0])
  // Cargo form
  const [cargoDesc, setCargoDesc] = useState("")
  const [cargoCuenta, setCargoCuenta] = useState("")
  const [cargoImporte, setCargoImporte] = useState(0)
  const [cargoImpuestos, setCargoImpuestos] = useState(0)

  useEffect(() => { cargarLista() }, [])

  const cargarLista = async () => {
    const { data } = await supabase.from('conciliaciones_tarjetas').select('*').order('created_at', { ascending: false })
    setLista(data || [])
  }

  const nuevaConciliacion = async () => {
    const { data: num } = await supabase.rpc('generar_numero_conciliacion_tarjeta', { p_sucursal: sucActiva })
    const nueva: Partial<ConciliacionTarjeta> = { numero: num, grupo_tarjeta: '', liquidacion: '', fecha: new Date().toISOString().split('T')[0], sucursal: sucActiva, estado: 'borrador', observaciones: '' }
    const { data } = await supabase.from('conciliaciones_tarjetas').insert(nueva).select().single()
    if (data) { setDetalle(data); setForm(data); setModoEdicion(true); setCupones([]); setCargos([]); setCuponesRechazados([]); setFiltroSucs(sucursales.filter(s=>s.activa).map(s=>s.nombre)) }
  }

  const abrirDetalle = async (c: ConciliacionTarjeta) => {
    setDetalle(c); setForm(c); setModoEdicion(false)
    // Cargar cupones vinculados
    const { data: items } = await supabase.from('conciliacion_tarjeta_cupones').select('*, cupon:cupon_id(*)').eq('conciliacion_id', c.id)
    const cups = (items||[]).map((it:any) => ({ ...it.cupon, conciliado: it.conciliado, rechazado: it.rechazado }))
    setCupones(cups)
    setCuponesRechazados(cups.filter((cp:any)=>cp.rechazado))
    // Cargar cargos
    const { data: cgs } = await supabase.from('conciliacion_tarjeta_cargos').select('*').eq('conciliacion_id', c.id)
    setCargos(cgs||[])
  }

  const guardarCabecera = async () => {
    if (!detalle) return
    await supabase.from('conciliaciones_tarjetas').update({ grupo_tarjeta: form.grupo_tarjeta, liquidacion: form.liquidacion, fecha: form.fecha, sucursal: form.sucursal, observaciones: form.observaciones }).eq('id', detalle.id)
    setDetalle({...detalle, ...form} as ConciliacionTarjeta)
    setModoEdicion(false)
    cargarLista()
  }

  const cargarCuponesDisponibles = async () => {
    if (!detalle) return
    let query = supabase.from('cupones_tarjeta').select('*').eq('estado', 'en_cartera').gte('fecha_ing_egr', filtroDesde).lte('fecha_ing_egr', filtroHasta + 'T23:59:59')
    if (filtroSucs.length > 0) query = query.in('sucursal', filtroSucs)
    const { data } = await query
    const existentes = cupones.map(c=>c.id)
    const nuevos = (data||[]).filter(c=>!existentes.includes(c.id)).map(c=>({...c, conciliado: false, rechazado: false}))
    // Insertar en conciliacion_tarjeta_cupones
    if (nuevos.length > 0 && detalle) {
      await supabase.from('conciliacion_tarjeta_cupones').insert(nuevos.map(c=>({ conciliacion_id: detalle.id, cupon_id: c.id, conciliado: false, rechazado: false })))
    }
    setCupones([...cupones, ...nuevos])
    setTabActivo('cupones')
  }

  const toggleConciliado = async (cupon: CuponTarjeta & {conciliado?:boolean}) => {
    if (!detalle) return
    const nuevo = !cupon.conciliado
    await supabase.from('conciliacion_tarjeta_cupones').update({ conciliado: nuevo, rechazado: false }).eq('conciliacion_id', detalle.id).eq('cupon_id', cupon.id)
    await supabase.from('cupones_tarjeta').update({ estado: nuevo ? 'conciliado' : 'en_cartera', fecha_conciliacion: nuevo ? new Date().toISOString() : null, conciliacion_id: nuevo ? detalle.id : null }).eq('id', cupon.id)
    setCupones(cupones.map(c => c.id === cupon.id ? { ...c, conciliado: nuevo, rechazado: false, estado: nuevo ? 'conciliado' as const : 'en_cartera' as const } : c))
    recalcularImportes()
  }

  const toggleRechazado = async (cupon: CuponTarjeta & {rechazado?:boolean}) => {
    if (!detalle) return
    const nuevo = !cupon.rechazado
    await supabase.from('conciliacion_tarjeta_cupones').update({ rechazado: nuevo, conciliado: false }).eq('conciliacion_id', detalle.id).eq('cupon_id', cupon.id)
    await supabase.from('cupones_tarjeta').update({ estado: nuevo ? 'rechazado' : 'en_cartera', conciliacion_id: nuevo ? detalle.id : null }).eq('id', cupon.id)
    setCupones(cupones.map(c => c.id === cupon.id ? { ...c, rechazado: nuevo, conciliado: false, estado: nuevo ? 'rechazado' as const : 'en_cartera' as const } : c))
    setCuponesRechazados(nuevo ? [...cuponesRechazados, {...cupon, rechazado: true}] : cuponesRechazados.filter(c=>c.id!==cupon.id))
    recalcularImportes()
  }

  const conciliarTodos = async () => {
    if (!detalle) return
    for (const c of cupones.filter(c=>!c.conciliado&&!c.rechazado)) { await toggleConciliado(c) }
  }

  const desconciliarTodos = async () => {
    if (!detalle) return
    for (const c of cupones.filter(c=>c.conciliado)) { await toggleConciliado(c) }
  }

  const recalcularImportes = () => {
    if (!detalle) return
    const impConc = cupones.filter(c=>c.conciliado).reduce((a,c)=>a+c.importe,0)
    const impCargos = cargos.reduce((a,c)=>a+c.total,0)
    const impRech = cupones.filter(c=>c.rechazado).reduce((a,c)=>a+c.importe,0)
    const updated = { ...detalle, importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech }
    setDetalle(updated); setForm(updated)
    supabase.from('conciliaciones_tarjetas').update({ importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech }).eq('id', detalle.id)
  }

  const agregarCargo = async () => {
    if (!detalle) return
    const total = cargoImporte + cargoImpuestos
    const { data } = await supabase.from('conciliacion_tarjeta_cargos').insert({ conciliacion_id: detalle.id, descripcion: cargoDesc, cuenta_contable: cargoCuenta, importe: cargoImporte, impuestos: cargoImpuestos, total }).select().single()
    if (data) { setCargos([...cargos, data]); setCargoDesc(''); setCargoCuenta(''); setCargoImporte(0); setCargoImpuestos(0); recalcularImportes() }
  }

  const eliminarCargo = async (id: string) => {
    await supabase.from('conciliacion_tarjeta_cargos').delete().eq('id', id)
    setCargos(cargos.filter(c=>c.id!==id))
    recalcularImportes()
  }

  const confirmarConciliacion = async () => {
    if (!detalle || guardando) return
    setGuardando(true)
    try {
    const impConc = cupones.filter(c=>c.conciliado).reduce((a,c)=>a+c.importe,0)
    const impCargos = cargos.reduce((a,c)=>a+c.total,0)
    const impRech = cupones.filter(c=>c.rechazado).reduce((a,c)=>a+c.importe,0)
    await supabase.from('conciliaciones_tarjetas').update({ importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech, estado: 'confirmado' }).eq('id', detalle.id)
    const updated = { ...detalle, importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech, estado: 'confirmado' as const }
    setDetalle(updated); setForm(updated)
    cargarLista()
    } finally { setGuardando(false) }
  }

  // Detalle view
  if (detalle) {
    const cuponesFiltered = busqueda ? cupones.filter(c => (c.tarjeta_nombre||'').toLowerCase().includes(busqueda.toLowerCase()) || (c.numero_cupon||'').toLowerCase().includes(busqueda.toLowerCase()) || (c.cliente_nombre||'').toLowerCase().includes(busqueda.toLowerCase())) : cupones

    return (
      <div className="p-6">
        <button onClick={()=>{setDetalle(null); cargarLista()}} className="text-sm text-indigo-600 hover:underline mb-4 flex items-center gap-1"><X className="w-3 h-3"/>Volver al listado</button>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-amber-900">{detalle.numero}</h2>
          <div className="flex gap-2">
            {detalle.estado==='borrador' && (
              <>
                <button onClick={conciliarTodos} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><Check className="w-4 h-4"/>Conciliar Todos</button>
                <button onClick={desconciliarTodos} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><X className="w-4 h-4"/>Desconciliar Todos</button>
                <button onClick={confirmarConciliacion} disabled={guardando} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><Lock className="w-4 h-4"/>{guardando ? "Procesando..." : "Confirmar"}</button>
              </>
            )}
            {!modoEdicion && detalle.estado==='borrador' && <button onClick={()=>setModoEdicion(true)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><Edit className="w-4 h-4"/>Editar</button>}
            {modoEdicion && <button onClick={guardarCabecera} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Check className="w-4 h-4"/>Guardar</button>}
          </div>
        </div>

        {/* Cabecera */}
        <div className="grid grid-cols-2 gap-6 mb-4 bg-white border rounded-lg p-4">
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block">Grupo</label>{modoEdicion ? <input value={form.grupo_tarjeta||''} onChange={e=>setForm(f=>({...f,grupo_tarjeta:e.target.value}))} className="w-full border rounded px-3 py-1.5 text-sm" placeholder="Payway, Viumi, Nave, Getnet" /> : <p className="text-sm font-medium">{detalle.grupo_tarjeta||'—'}</p>}</div>
            <div><label className="text-xs text-gray-500 block">Liquidación</label>{modoEdicion ? <input value={form.liquidacion||''} onChange={e=>setForm(f=>({...f,liquidacion:e.target.value}))} className="w-full border rounded px-3 py-1.5 text-sm" /> : <p className="text-sm font-medium">{detalle.liquidacion||'—'}</p>}</div>
            <div><label className="text-xs text-gray-500">Importe Conciliado</label><p className="text-sm font-medium">${detalle.importe_conciliado?.toLocaleString('es-AR',{minimumFractionDigits:2})}</p></div>
            <div><label className="text-xs text-gray-500">Importe Cargos</label><p className="text-sm font-medium text-red-600">${detalle.importe_cargos?.toLocaleString('es-AR',{minimumFractionDigits:2})}</p></div>
            <div><label className="text-xs text-gray-500">Importe Total</label><p className="text-sm font-bold">${detalle.importe_total?.toLocaleString('es-AR',{minimumFractionDigits:2})}</p></div>
            <div><label className="text-xs text-gray-500">Imp. Cupones Rechazados</label><p className="text-sm font-medium text-red-600">${detalle.importe_cupones_rechazados?.toLocaleString('es-AR',{minimumFractionDigits:2})}</p></div>
          </div>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block">Fecha</label>{modoEdicion ? <input type="date" value={form.fecha||''} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} className="w-full border rounded px-3 py-1.5 text-sm" /> : <p className="text-sm font-medium">{detalle.fecha}</p>}</div>
            <div><label className="text-xs text-gray-500 block">Sucursal</label>{modoEdicion ? <select value={form.sucursal||''} onChange={e=>setForm(f=>({...f,sucursal:e.target.value}))} className="w-full border rounded px-3 py-1.5 text-sm">{sucursales.filter(s=>s.activa).map(s=><option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}</select> : <p className="text-sm font-medium">{detalle.sucursal}</p>}</div>
            <div><label className="text-xs text-gray-500">Estado</label><p className="text-sm"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detalle.estado==='confirmado'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{detalle.estado==='confirmado'?'Confirmado':'Borrador'}</span></p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-4">
          {(['filtros','cupones','rechazados','cargos','observaciones'] as const).map(t=>(
            <button key={t} onClick={()=>setTabActivo(t)} className={`pb-2 text-sm font-medium capitalize ${tabActivo===t?'border-b-2 border-indigo-600 text-indigo-600':'text-gray-500'}`}>{t==='rechazados'?'Cupones Rechazados':t}</button>
          ))}
        </div>

        {tabActivo === 'filtros' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sucursales</h3>
              <div className="border rounded p-3 space-y-1">
                {filtroSucs.map((s,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <input value={s} onChange={e=>{const ns=[...filtroSucs]; ns[i]=e.target.value; setFiltroSucs(ns)}} className="flex-1 border rounded px-2 py-1 text-sm" />
                    <button onClick={()=>setFiltroSucs(filtroSucs.filter((_,j)=>j!==i))} className="text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
                <button onClick={()=>setFiltroSucs([...filtroSucs,''])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/>Añadir</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500 block mb-1">Fecha Desde</label><input type="date" value={filtroDesde} onChange={e=>setFiltroDesde(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
              <div><label className="text-sm text-gray-500 block mb-1">Fecha Hasta</label><input type="date" value={filtroHasta} onChange={e=>setFiltroHasta(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={cargarCuponesDisponibles} className="px-4 py-2 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800">Aplicar filtros</button>
          </div>
        )}

        {tabActivo === 'cupones' && (
          <>
            <div className="relative mb-3"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"/><input placeholder="Buscar por tarjeta, cupón, cliente..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="w-full pl-8 h-9 border rounded text-sm" /></div>
            {cuponesFiltered.length === 0 ? <p className="text-center py-8 text-gray-400">No hay cupones. Use el tab Filtros para cargar cupones disponibles.</p> : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                    <th className="py-2 px-2">Tarjeta</th><th className="px-2">N° Cupón</th><th className="px-2">Fecha</th><th className="px-2">Cliente</th><th className="px-2">Forma de Pago</th><th className="px-2">Sucursal</th><th className="px-2 text-right">Importe</th><th className="px-2 text-center">Conc.</th><th className="px-2 text-center">Rech.</th>
                  </tr></thead>
                  <tbody>{cuponesFiltered.map(c=>(
                    <tr key={c.id} className={`border-b ${c.conciliado?'bg-green-50':c.rechazado?'bg-red-50':''}`}>
                      <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                      <td className="px-2">{c.numero_cupon||'—'}</td>
                      <td className="px-2">{c.fecha_ing_egr ? new Date(c.fecha_ing_egr).toLocaleDateString() : '—'}</td>
                      <td className="px-2">{c.cliente_nombre}</td>
                      <td className="px-2">{c.forma_pago_nombre}</td>
                      <td className="px-2">{c.sucursal}</td>
                      <td className="px-2 text-right font-medium">${c.importe?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                      <td className="px-2 text-center"><input type="checkbox" checked={!!c.conciliado} onChange={()=>toggleConciliado(c)} disabled={detalle.estado==='confirmado'} className="rounded" /></td>
                      <td className="px-2 text-center"><input type="checkbox" checked={!!c.rechazado} onChange={()=>toggleRechazado(c)} disabled={detalle.estado==='confirmado'} className="rounded" /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tabActivo === 'rechazados' && (
          cuponesRechazados.length === 0 ? <p className="text-center py-8 text-gray-400">No hay cupones rechazados</p> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                  <th className="py-2 px-2">Tarjeta</th><th className="px-2">N° Cupón</th><th className="px-2">Cliente</th><th className="px-2 text-right">Importe</th>
                </tr></thead>
                <tbody>{cuponesRechazados.map(c=>(
                  <tr key={c.id} className="border-b bg-red-50">
                    <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                    <td className="px-2">{c.numero_cupon||'—'}</td>
                    <td className="px-2">{c.cliente_nombre}</td>
                    <td className="px-2 text-right font-medium text-red-600">${c.importe?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )
        )}

        {tabActivo === 'cargos' && (
          <div>
            {detalle.estado==='borrador' && (
              <div className="flex gap-2 mb-3 items-end">
                <div className="flex-1"><label className="text-xs text-gray-500">Descripción</label><input value={cargoDesc} onChange={e=>setCargoDesc(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-40"><label className="text-xs text-gray-500">Cuenta Contable</label><input value={cargoCuenta} onChange={e=>setCargoCuenta(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-28"><label className="text-xs text-gray-500">Importe</label><input type="number" value={cargoImporte} onChange={e=>setCargoImporte(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-28"><label className="text-xs text-gray-500">Impuestos</label><input type="number" value={cargoImpuestos} onChange={e=>setCargoImpuestos(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <button onClick={agregarCargo} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4"/>Añadir</button>
              </div>
            )}
            {cargos.length === 0 ? <p className="text-center py-8 text-gray-400">No hay cargos registrados</p> : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                    <th className="py-2 px-2">Descripción</th><th className="px-2">Cuenta Contable</th><th className="px-2 text-right">Importe</th><th className="px-2 text-right">Impuestos</th><th className="px-2 text-right">Total</th>{detalle.estado==='borrador'&&<th className="px-2"></th>}
                  </tr></thead>
                  <tbody>{cargos.map(c=>(
                    <tr key={c.id} className="border-b">
                      <td className="py-1.5 px-2">{c.descripcion}</td>
                      <td className="px-2">{c.cuenta_contable}</td>
                      <td className="px-2 text-right">${c.importe?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                      <td className="px-2 text-right">${c.impuestos?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                      <td className="px-2 text-right font-medium">${c.total?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                      {detalle.estado==='borrador'&&<td className="px-2"><button onClick={()=>eliminarCargo(c.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5"/></button></td>}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tabActivo === 'observaciones' && (
          <div>
            <textarea value={form.observaciones||''} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} onBlur={()=>{ if(detalle) supabase.from('conciliaciones_tarjetas').update({observaciones:form.observaciones}).eq('id',detalle.id) }} className="w-full border rounded p-3 text-sm min-h-[120px]" placeholder="Observaciones..." disabled={detalle.estado==='confirmado'} />
          </div>
        )}
      </div>
    )
  }

  // Vista lista
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-900">Conciliación de Tarjetas</h2>
        <button onClick={nuevaConciliacion} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4"/>Nueva Conciliación</button>
      </div>
      {lista.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No hay conciliaciones de tarjetas registradas</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
              <th className="py-2 px-3">N°</th><th className="px-3">Grupo</th><th className="px-3">Liquidación</th><th className="px-3">Fecha</th><th className="px-3">Sucursal</th><th className="px-3 text-right">Conciliado</th><th className="px-3 text-right">Cargos</th><th className="px-3 text-right">Total</th><th className="px-3 text-center">Estado</th>
            </tr></thead>
            <tbody>{lista.map(c=>(
              <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>abrirDetalle(c)}>
                <td className="py-2 px-3 font-medium text-indigo-600">{c.numero}</td>
                <td className="px-3">{c.grupo_tarjeta||'—'}</td>
                <td className="px-3">{c.liquidacion||'—'}</td>
                <td className="px-3">{c.fecha}</td>
                <td className="px-3">{c.sucursal}</td>
                <td className="px-3 text-right">${c.importe_conciliado?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                <td className="px-3 text-right text-red-600">${c.importe_cargos?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                <td className="px-3 text-right font-medium">${c.importe_total?.toLocaleString('es-AR',{minimumFractionDigits:2})}</td>
                <td className="px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.estado==='confirmado'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{c.estado==='confirmado'?'Confirmado':'Borrador'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Bancos Config ──────────────────────────────────────────────────────────

function ListaBancos() {
  const [bancos, setBancos] = useState<Banco[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Banco | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', direccion: '', telefono: '', email: '', activo: true })

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('bancos').select('*').order('nombre')
    if (data) setBancos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditando(null); setForm({ codigo: '', nombre: '', direccion: '', telefono: '', email: '', activo: true }); setMostrarModal(true) }
  const abrirEditar = (b: Banco) => { setEditando(b); setForm({ codigo: b.codigo, nombre: b.nombre, direccion: b.direccion || '', telefono: b.telefono || '', email: b.email || '', activo: b.activo }); setMostrarModal(true) }

  const guardar = async () => {
    if (!form.codigo || !form.nombre) return
    const supabase = createClient()
    const datos = { ...form, direccion: form.direccion || null, telefono: form.telefono || null, email: form.email || null }
    if (editando) { await supabase.from('bancos').update(datos).eq('id', editando.id) }
    else { await supabase.from('bancos').insert(datos) }
    setMostrarModal(false); await cargar()
  }

  const toggleActivo = async (b: Banco) => {
    const supabase = createClient()
    await supabase.from('bancos').update({ activo: !b.activo }).eq('id', b.id)
    await cargar()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={abrirNuevo} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Banco</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Dirección</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bancos.map(b => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{b.codigo}</td>
                  <td className="py-3 px-4 font-medium">{b.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{b.direccion || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{b.telefono || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{b.email || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => abrirEditar(b)} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(b)} className="text-gray-500 hover:text-gray-700 text-sm">{b.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bancos.length === 0 && <div className="text-center py-12 text-gray-500">No hay bancos configurados</div>}
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editando ? 'Editar Banco' : 'Nuevo Banco'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código BCRA *</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 285" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                <span className="text-sm">Activo</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setMostrarModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListaCuentasBancarias() {
  const [cuentas, setCuentas] = useState<(CuentaBancaria & { banco_id?: string; disponible_facturas_credito?: boolean; direccion_propietario?: string })[]>([])
  const [bancosDisp, setBancosDisp] = useState<Banco[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista')
  const [editando, setEditando] = useState<any>(null)
  const [chequeras, setChequeras] = useState<Chequera[]>([])
  const [form, setForm] = useState({ banco_id: '', numero_cuenta: '', cbu: '', tipo_cuenta: 'cuenta_corriente', moneda: 'ARS', propietario: '', direccion_propietario: '', diario_nombre: '', disponible_facturas_credito: false, activo: true })
  const [guardando, setGuardando] = useState(false)
  const [formChequera, setFormChequera] = useState({ nombre: '', tipo: 'diferidos' as 'diferidos' | 'corrientes', desde_numero: 0, hasta_numero: 9999999, proximo_numero: 1 })

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const [ctRes, bRes] = await Promise.all([
      supabase.from('cuentas_bancarias').select('*').order('banco_nombre'),
      supabase.from('bancos').select('*').eq('activo', true).order('nombre'),
    ])
    setCuentas(ctRes.data || [])
    setBancosDisp(bRes.data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const cargarChequeras = async (cuentaId: string) => {
    const supabase = createClient()
    const { data } = await supabase.from('chequeras').select('*').eq('cuenta_bancaria_id', cuentaId).order('nombre')
    setChequeras(data || [])
  }

  const nueva = () => {
    setEditando(null); setChequeras([])
    setForm({ banco_id: '', numero_cuenta: '', cbu: '', tipo_cuenta: 'cuenta_corriente', moneda: 'ARS', propietario: '', direccion_propietario: '', diario_nombre: '', disponible_facturas_credito: false, activo: true })
    setVista('detalle')
  }

  const abrirDetalle = async (c: any) => {
    setEditando(c)
    setForm({
      banco_id: c.banco_id || '', numero_cuenta: c.numero_cuenta, cbu: c.cbu || '',
      tipo_cuenta: c.tipo_cuenta, moneda: c.moneda, propietario: c.propietario || '',
      direccion_propietario: c.direccion_propietario || '', diario_nombre: c.diario_nombre || '',
      disponible_facturas_credito: c.disponible_facturas_credito || false, activo: c.activo,
    })
    await cargarChequeras(c.id)
    setVista('detalle')
  }

  const guardar = async () => {
    if (!form.numero_cuenta) return
    setGuardando(true)
    const supabase = createClient()
    const banco = bancosDisp.find(b => b.id === form.banco_id)
    const datos = { ...form, banco_nombre: banco?.nombre || form.propietario || 'Sin banco', cbu: form.cbu || null, direccion_propietario: form.direccion_propietario || null }
    if (editando) { await supabase.from('cuentas_bancarias').update(datos).eq('id', editando.id) }
    else { await supabase.from('cuentas_bancarias').insert(datos) }
    setGuardando(false); await cargar(); setVista('lista')
  }

  const toggleActivo = async (c: CuentaBancaria) => {
    const supabase = createClient()
    await supabase.from('cuentas_bancarias').update({ activo: !c.activo }).eq('id', c.id)
    await cargar()
  }

  const agregarChequera = async () => {
    if (!editando || !formChequera.nombre) return
    const supabase = createClient()
    await supabase.from('chequeras').insert({ cuenta_bancaria_id: editando.id, ...formChequera })
    setFormChequera({ nombre: '', tipo: 'diferidos', desde_numero: 0, hasta_numero: 9999999, proximo_numero: 1 })
    await cargarChequeras(editando.id)
  }

  const eliminarChequera = async (id: string) => {
    const supabase = createClient()
    await supabase.from('chequeras').delete().eq('id', id)
    if (editando) await cargarChequeras(editando.id)
  }

  if (vista === 'detalle') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setVista('lista')} className="text-sm text-indigo-700 hover:text-indigo-900 font-medium">← Cuentas</button>
            <h2 className="text-2xl font-bold text-amber-900">{editando ? `Cuenta ${editando.numero_cuenta}` : 'Nueva Cuenta Bancaria'}</h2>
          </div>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Información del Banco</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                <select value={form.banco_id} onChange={e => setForm(f => ({ ...f, banco_id: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Seleccionar banco...</option>
                  {bancosDisp.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° de Cuenta *</label>
                <input value={form.numero_cuenta} onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CBU</label>
                <input value={form.cbu} onChange={e => setForm(f => ({ ...f, cbu: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
                <select value={form.tipo_cuenta} onChange={e => setForm(f => ({ ...f, tipo_cuenta: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="cuenta_corriente">Cuenta Corriente</option>
                  <option value="caja_ahorro">Caja de Ahorro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Propietario de la Cuenta</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Propietario</label>
                <input value={form.propietario} onChange={e => setForm(f => ({ ...f, propietario: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion_propietario} onChange={e => setForm(f => ({ ...f, direccion_propietario: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Información Contable</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Diario Contable</label>
                <input value={form.diario_nombre} onChange={e => setForm(f => ({ ...f, diario_nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: Banco Macro CC (ARS)" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2">
                  <input type="checkbox" checked={form.disponible_facturas_credito} onChange={e => setForm(f => ({ ...f, disponible_facturas_credito: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Disponible en Facturas de Crédito</span>
                </label>
              </div>
            </div>
          </div>

          {editando && form.moneda === 'ARS' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Chequeras</h3>
              <div className="flex gap-2 mb-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Nombre</label>
                  <input value={formChequera.nombre} onChange={e => setFormChequera(f => ({ ...f, nombre: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="w-36">
                  <label className="text-xs text-gray-500">Tipo</label>
                  <select value={formChequera.tipo} onChange={e => setFormChequera(f => ({ ...f, tipo: e.target.value as 'diferidos' | 'corrientes' }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="diferidos">Diferidos</option>
                    <option value="corrientes">Corrientes</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-500">Desde N°</label>
                  <input type="number" value={formChequera.desde_numero} onChange={e => setFormChequera(f => ({ ...f, desde_numero: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-500">Hasta N°</label>
                  <input type="number" value={formChequera.hasta_numero} onChange={e => setFormChequera(f => ({ ...f, hasta_numero: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-500">Próx. N°</label>
                  <input type="number" value={formChequera.proximo_numero} onChange={e => setFormChequera(f => ({ ...f, proximo_numero: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <button onClick={agregarChequera} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" />Agregar</button>
              </div>
              {chequeras.length === 0 ? <p className="text-center py-6 text-gray-400 text-sm">No hay chequeras</p> : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                        <th className="py-2 px-3">Nombre</th>
                        <th className="px-3">Tipo</th>
                        <th className="px-3 text-right">Desde</th>
                        <th className="px-3 text-right">Hasta</th>
                        <th className="px-3 text-right">Próximo</th>
                        <th className="px-3 text-center">Estado</th>
                        <th className="px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {chequeras.map(ch => (
                        <tr key={ch.id} className="border-b">
                          <td className="py-1.5 px-3 font-medium">{ch.nombre}</td>
                          <td className="px-3">{ch.tipo === 'diferidos' ? 'Diferidos' : 'Corrientes'}</td>
                          <td className="px-3 text-right font-mono">{ch.desde_numero}</td>
                          <td className="px-3 text-right font-mono">{ch.hasta_numero}</td>
                          <td className="px-3 text-right font-mono">{ch.proximo_numero}</td>
                          <td className="px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ch.estado === 'en_uso' ? 'bg-green-100 text-green-700' : ch.estado === 'agotada' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {ch.estado === 'en_uso' ? 'En uso' : ch.estado === 'agotada' ? 'Agotada' : 'Anulada'}
                            </span>
                          </td>
                          <td className="px-3"><button onClick={() => eliminarChequera(ch.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={nueva} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Cuenta Bancaria</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">N° Cuenta</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Banco</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Propietario</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => abrirDetalle(c)}>
                  <td className="py-3 px-4 font-mono text-sm text-indigo-900 font-medium">{c.numero_cuenta}</td>
                  <td className="py-3 px-4">{c.banco_nombre}</td>
                  <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-semibold">{c.moneda}</span></td>
                  <td className="py-3 px-4 text-sm text-gray-600">{c.tipo_cuenta === 'cuenta_corriente' ? 'Cuenta Corriente' : 'Caja de Ahorro'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{c.propietario || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => abrirDetalle(c)} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(c)} className="text-gray-500 hover:text-gray-700 text-sm">{c.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cuentas.length === 0 && <div className="text-center py-12 text-gray-500">No hay cuentas bancarias</div>}
        </div>
      )}
    </div>
  )
}

function ListaTiposMovimiento() {
  const [tipos, setTipos] = useState<TipoMovimientoBancario[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<TipoMovimientoBancario | null>(null)
  const [form, setForm] = useState({ nombre: '', codigo_causal: '', emite_cheques_diferidos: false, emite_cheques_corrientes: false, disponible_en_pagos: false, disponible_en_cobros: false, disponible_en_finanzas: true, activo: true })

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('tipos_movimiento_bancario').select('*').order('nombre')
    if (data) setTipos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', codigo_causal: '', emite_cheques_diferidos: false, emite_cheques_corrientes: false, disponible_en_pagos: false, disponible_en_cobros: false, disponible_en_finanzas: true, activo: true })
    setMostrarModal(true)
  }

  const abrirEditar = (t: TipoMovimientoBancario) => {
    setEditando(t)
    setForm({ nombre: t.nombre, codigo_causal: t.codigo_causal, emite_cheques_diferidos: t.emite_cheques_diferidos, emite_cheques_corrientes: t.emite_cheques_corrientes, disponible_en_pagos: t.disponible_en_pagos, disponible_en_cobros: t.disponible_en_cobros, disponible_en_finanzas: t.disponible_en_finanzas, activo: t.activo })
    setMostrarModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.codigo_causal) return
    const supabase = createClient()
    if (editando) { await supabase.from('tipos_movimiento_bancario').update(form).eq('id', editando.id) }
    else { await supabase.from('tipos_movimiento_bancario').insert(form) }
    setMostrarModal(false); await cargar()
  }

  const toggleActivo = async (t: TipoMovimientoBancario) => {
    const supabase = createClient()
    await supabase.from('tipos_movimiento_bancario').update({ activo: !t.activo }).eq('id', t.id)
    await cargar()
  }

  const checkIcon = (val: boolean) => val ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={abrirNuevo} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Tipo</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Chq. Dif.</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Chq. Corr.</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Pagos</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Cobros</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Finanzas</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{t.nombre}</td>
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{t.codigo_causal}</td>
                  <td className="py-3 px-3 text-center">{checkIcon(t.emite_cheques_diferidos)}</td>
                  <td className="py-3 px-3 text-center">{checkIcon(t.emite_cheques_corrientes)}</td>
                  <td className="py-3 px-3 text-center">{checkIcon(t.disponible_en_pagos)}</td>
                  <td className="py-3 px-3 text-center">{checkIcon(t.disponible_en_cobros)}</td>
                  <td className="py-3 px-3 text-center">{checkIcon(t.disponible_en_finanzas)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => abrirEditar(t)} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(t)} className="text-gray-500 hover:text-gray-700 text-sm">{t.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tipos.length === 0 && <div className="text-center py-12 text-gray-500">No hay tipos de movimiento</div>}
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editando ? 'Editar Tipo de Movimiento' : 'Nuevo Tipo de Movimiento'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código Causal *</label>
                  <input value={form.codigo_causal} onChange={e => setForm(f => ({ ...f, codigo_causal: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: TR, CHQD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.emite_cheques_diferidos} onChange={e => setForm(f => ({ ...f, emite_cheques_diferidos: e.target.checked }))} className="rounded" /><span className="text-sm">Emite Cheques Diferidos</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.emite_cheques_corrientes} onChange={e => setForm(f => ({ ...f, emite_cheques_corrientes: e.target.checked }))} className="rounded" /><span className="text-sm">Emite Cheques Corrientes</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.disponible_en_pagos} onChange={e => setForm(f => ({ ...f, disponible_en_pagos: e.target.checked }))} className="rounded" /><span className="text-sm">Disponible en Pagos</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.disponible_en_cobros} onChange={e => setForm(f => ({ ...f, disponible_en_cobros: e.target.checked }))} className="rounded" /><span className="text-sm">Disponible en Cobros</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.disponible_en_finanzas} onChange={e => setForm(f => ({ ...f, disponible_en_finanzas: e.target.checked }))} className="rounded" /><span className="text-sm">Disponible en Finanzas</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" /><span className="text-sm">Activo</span></label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setMostrarModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BancosConfig() {
  const [subVista, setSubVista] = useState<'bancos' | 'cuentas' | 'tipos'>('cuentas')

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
        <h1 className="text-2xl font-bold text-amber-900">Bancos</h1>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 mb-6 w-fit">
        {([
          { id: 'cuentas' as const, label: 'Cuentas Bancarias' },
          { id: 'bancos' as const, label: 'Bancos' },
          { id: 'tipos' as const, label: 'Tipos de Movimiento' },
        ]).map(item => (
          <button key={item.id} onClick={() => setSubVista(item.id)}
            className={`px-4 py-2 text-sm rounded transition-colors ${subVista === item.id ? 'bg-indigo-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {subVista === 'bancos' && <ListaBancos />}
      {subVista === 'cuentas' && <ListaCuentasBancarias />}
      {subVista === 'tipos' && <ListaTiposMovimiento />}
    </div>
  )
}

// ─── Conceptos ──────────────────────────────────────────────────────────────

function Conceptos() {
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<ConceptoRegistroCaja | null>(null)

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('conceptos_registro_caja').select('*').order('nombre')
    if (data) setConceptos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggleActivo = async (c: ConceptoRegistroCaja) => {
    const supabase = createClient()
    await supabase.from('conceptos_registro_caja').update({ activo: !c.activo }).eq('id', c.id)
    await cargar()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
          <h1 className="text-2xl font-bold text-amber-900">Conceptos</h1>
        </div>
        <button onClick={() => { setEditando(null); setMostrarModal(true) }} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Concepto</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aj. Caja</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aj. Banco</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Reg. Caja</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Reg. Banco</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Transf.</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Req. Obs.</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{c.codigo}</td>
                  <td className="py-3 px-4 font-medium">{c.nombre}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_ajuste_cajas ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_ajuste_banco ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_caja ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_banco ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_transferencias ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.requiere_observacion ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => { setEditando(c); setMostrarModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(c)} className="text-gray-500 hover:text-gray-700 text-sm">{c.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {conceptos.length === 0 && <div className="text-center py-12 text-gray-500">No hay conceptos configurados</div>}
        </div>
      )}

      {mostrarModal && (
        <ModalConcepto
          concepto={editando}
          onGuardar={async (datos) => {
            const supabase = createClient()
            if (editando) { await supabase.from('conceptos_registro_caja').update(datos).eq('id', editando.id) }
            else { await supabase.from('conceptos_registro_caja').insert(datos) }
            setMostrarModal(false); await cargar()
          }}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}

function ModalConcepto({ concepto, onGuardar, onCerrar }: { concepto: ConceptoRegistroCaja | null; onGuardar: (datos: any) => Promise<void>; onCerrar: () => void }) {
  const [form, setForm] = useState({
    codigo: concepto?.codigo || '',
    nombre: concepto?.nombre || '',
    cuenta_contable_ingresos: concepto?.cuenta_contable_ingresos || '',
    cuenta_contable_egresos: concepto?.cuenta_contable_egresos || '',
    visible_en_ajuste_cajas: concepto?.visible_en_ajuste_cajas || false,
    visible_en_ajuste_banco: concepto?.visible_en_ajuste_banco || false,
    visible_en_caja: concepto?.visible_en_caja || false,
    visible_en_banco: concepto?.visible_en_banco || false,
    visible_en_transferencias: concepto?.visible_en_transferencias || false,
    visible_en_cancelaciones: concepto?.visible_en_cancelaciones || false,
    requiere_observacion: concepto?.requiere_observacion || false,
    activo: concepto?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!form.codigo || !form.nombre) return
    setGuardando(true)
    await onGuardar({ ...form, cuenta_contable_ingresos: form.cuenta_contable_ingresos || null, cuenta_contable_egresos: form.cuenta_contable_egresos || null })
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{concepto ? 'Editar Concepto' : 'Nuevo Concepto'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: COM, DifCaja" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Contable de Ingresos</label>
              <input value={form.cuenta_contable_ingresos} onChange={e => setForm(f => ({ ...f, cuenta_contable_ingresos: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Contable de Egresos</label>
              <input value={form.cuenta_contable_egresos} onChange={e => setForm(f => ({ ...f, cuenta_contable_egresos: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Visible en</p>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_ajuste_cajas} onChange={e => setForm(f => ({ ...f, visible_en_ajuste_cajas: e.target.checked }))} className="rounded" /><span className="text-sm">Ajuste de Cajas</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_ajuste_banco} onChange={e => setForm(f => ({ ...f, visible_en_ajuste_banco: e.target.checked }))} className="rounded" /><span className="text-sm">Ajuste de Banco</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_caja} onChange={e => setForm(f => ({ ...f, visible_en_caja: e.target.checked }))} className="rounded" /><span className="text-sm">Registros de Caja</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_banco} onChange={e => setForm(f => ({ ...f, visible_en_banco: e.target.checked }))} className="rounded" /><span className="text-sm">Registros de Banco</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_transferencias} onChange={e => setForm(f => ({ ...f, visible_en_transferencias: e.target.checked }))} className="rounded" /><span className="text-sm">Transferencias entre Cajas</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_cancelaciones} onChange={e => setForm(f => ({ ...f, visible_en_cancelaciones: e.target.checked }))} className="rounded" /><span className="text-sm">Cancelaciones Auto.</span></label>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.requiere_observacion} onChange={e => setForm(f => ({ ...f, requiere_observacion: e.target.checked }))} className="rounded" /><span className="text-sm">Requiere Observación</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" /><span className="text-sm">Activo</span></label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Tipos de Préstamos ─────────────────────────────────────────────────────

function TiposPrestamos() {
  const [tipos, setTipos] = useState<TipoPrestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<TipoPrestamo | null>(null)

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('tipos_prestamo').select('*').order('nombre')
    if (data) setTipos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggleActivo = async (t: TipoPrestamo) => {
    const supabase = createClient()
    await supabase.from('tipos_prestamo').update({ activo: !t.activo }).eq('id', t.id)
    await cargar()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
          <h1 className="text-2xl font-bold text-amber-900">Tipos de Préstamos</h1>
        </div>
        <button onClick={() => { setEditando(null); setMostrarModal(true) }} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Tipo</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Préstamo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Intereses</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditando(t); setMostrarModal(true) }}>
                  <td className="py-3 px-4 font-medium text-indigo-900">{t.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{t.cuenta_prestamo || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{t.cuenta_intereses || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditando(t); setMostrarModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(t)} className="text-gray-500 hover:text-gray-700 text-sm">{t.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tipos.length === 0 && <div className="text-center py-12 text-gray-500">No hay tipos de préstamo configurados</div>}
        </div>
      )}

      {mostrarModal && (
        <ModalTipoPrestamo
          tipo={editando}
          onGuardar={async (datos) => {
            const supabase = createClient()
            if (editando) { await supabase.from('tipos_prestamo').update(datos).eq('id', editando.id) }
            else { await supabase.from('tipos_prestamo').insert(datos) }
            setMostrarModal(false); await cargar()
          }}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}

function ModalTipoPrestamo({ tipo, onGuardar, onCerrar }: { tipo: TipoPrestamo | null; onGuardar: (datos: any) => Promise<void>; onCerrar: () => void }) {
  const [form, setForm] = useState({
    nombre: tipo?.nombre || '',
    cuenta_prestamo: tipo?.cuenta_prestamo || '',
    cuenta_intereses: tipo?.cuenta_intereses || '',
    cuenta_intereses_devengar: tipo?.cuenta_intereses_devengar || '',
    cuenta_iva_devengar: tipo?.cuenta_iva_devengar || '',
    cuenta_percepciones_devengar: tipo?.cuenta_percepciones_devengar || '',
    cuenta_refinanciacion: tipo?.cuenta_refinanciacion || '',
    cuenta_preexistente: tipo?.cuenta_preexistente || '',
    concepto_liquidacion: tipo?.concepto_liquidacion || '',
    activo: tipo?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!form.nombre) return
    setGuardando(true)
    const datos = {
      ...form,
      cuenta_prestamo: form.cuenta_prestamo || null,
      cuenta_intereses: form.cuenta_intereses || null,
      cuenta_intereses_devengar: form.cuenta_intereses_devengar || null,
      cuenta_iva_devengar: form.cuenta_iva_devengar || null,
      cuenta_percepciones_devengar: form.cuenta_percepciones_devengar || null,
      cuenta_refinanciacion: form.cuenta_refinanciacion || null,
      cuenta_preexistente: form.cuenta_preexistente || null,
      concepto_liquidacion: form.concepto_liquidacion || null,
    }
    await onGuardar(datos)
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{tipo ? 'Editar Tipo de Préstamo' : 'Nuevo Tipo de Préstamo'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: SGR, Bancario" />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cuentas Contables</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Préstamo</label>
                <input value={form.cuenta_prestamo} onChange={e => setForm(f => ({ ...f, cuenta_prestamo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 21010705 Préstamo SGR" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Intereses</label>
                <input value={form.cuenta_intereses} onChange={e => setForm(f => ({ ...f, cuenta_intereses: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 62010103 Intereses Préstamos Bancarios Recibidos" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Intereses a Devengar</label>
                <input value={form.cuenta_intereses_devengar} onChange={e => setForm(f => ({ ...f, cuenta_intereses_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040403 Intereses Bancarios a Devengar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de IVA a Devengar</label>
                <input value={form.cuenta_iva_devengar} onChange={e => setForm(f => ({ ...f, cuenta_iva_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040101 I.V.A. Crédito Fiscal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Percepciones a Devengar</label>
                <input value={form.cuenta_percepciones_devengar} onChange={e => setForm(f => ({ ...f, cuenta_percepciones_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040102 I.V.A. Percepciones" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta para Saldos Cancelados / Refinanciación</label>
                <input value={form.cuenta_refinanciacion} onChange={e => setForm(f => ({ ...f, cuenta_refinanciacion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 99999998 Cuenta Puente para Movimientos Bancarios" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta para Préstamos Preexistentes</label>
                <input value={form.cuenta_preexistente} onChange={e => setForm(f => ({ ...f, cuenta_preexistente: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 21010704 Préstamos Bancarios" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Concepto por Defecto en Liquidación</label>
                <input value={form.concepto_liquidacion} onChange={e => setForm(f => ({ ...f, concepto_liquidacion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
            <span className="text-sm">Activo</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── FinanzasListSection (wrapper reutilizable con OdooFilterBar) ────────────

function FinanzasListSection<T extends object>({
  title, subtitle, moduleName, data, searchFields, filterFields, actions, children, loading,
}: {
  title: string
  subtitle?: string
  moduleName: string
  data: T[]
  searchFields: (keyof T)[]
  filterFields: { field: keyof T; label: string }[]
  actions?: React.ReactNode
  children: (filtered: T[]) => React.ReactNode
  loading?: boolean
}) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String(row[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field as keyof T] ?? "") === f.value)
    }
    return result
  }, [data, search, activeFilters, searchFields])

  const filterOptions = useMemo(() =>
    filterFields.map(ff => {
      const vals = [...new Set(data.map(row => String(row[ff.field] ?? "")).filter(v => v && v !== "null" && v !== "undefined"))]
      return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
    }).filter(f => f.values.length > 0),
  [data, filterFields])

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({ id: String(ff.field), label: ff.label, field: String(ff.field) }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          {subtitle && <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{subtitle}</p>}
          <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        </div>
        {actions}
      </div>
      <OdooFilterBar moduleName={moduleName} filterOptions={filterOptions} groupByOptions={groupByOptions}
        activeFilters={activeFilters} activeGroupBy={activeGroupBy} searchTerm={search}
        onFiltersChange={setActiveFilters} onGroupByChange={setActiveGroupBy} onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={(f) => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={(id) => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={(f) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
        totalCount={data.length} filteredCount={filtered.length}
      />
      <div className="mt-4">
        {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : children(filtered)}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Export de los datos para que ventas-module pueda usarlos
export type { RecargoTarjeta as RecargoTarjetaType }

export default function ModuloFinanzas() {
  const [activeItem, setActiveItem] = useState<string>("extractos_caja")
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [recargos, setRecargos] = useState<RecargoTarjeta[]>([])

  useEffect(() => {
    fetch("/api/tarjetas").then(r => r.json()).then(d => setTarjetas(Array.isArray(d) ? d : [])).catch(console.error)
    fetch("/api/grupos-tarjeta").then(r => r.json()).then(d => setGrupos(Array.isArray(d) ? d : [])).catch(console.error)
    fetch("/api/recargos-tarjeta").then(r => r.json()).then(d => setRecargos(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])
  const [menuExpandido, setMenuExpandido] = useState<Record<string, boolean>>({
    bancoYCaja: true, operaciones: false, cheques: false, tarjetasConc: false, configuracion: false,
  })

  const renderSidebar = () => (
    <div className="w-56 bg-white border-r border-gray-200 h-[calc(100vh-44px)] overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Finanzas</h2>
          </div>
        </div>

        {/* BANCO Y CAJA */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, bancoYCaja: !prev.bancoYCaja }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.bancoYCaja ? "rotate-90" : ""}`} />
            <Wallet className="w-3.5 h-3.5" />
            Banco y Caja
          </button>
          {menuExpandido.bancoYCaja && (
            <div className="ml-2">
              <button onClick={() => setActiveItem("extractos_caja")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "extractos_caja" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Receipt className="w-4 h-4" /> Extractos de Caja
              </button>
              <button onClick={() => setActiveItem("registros_caja")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "registros_caja" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <BookOpen className="w-4 h-4" /> Registros de Caja
              </button>
              <button onClick={() => setActiveItem("ajustes_caja")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "ajustes_caja" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Edit className="w-4 h-4" /> Ajustes de Caja
              </button>
              <button onClick={() => setActiveItem("registros_banco")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "registros_banco" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Landmark className="w-4 h-4" /> Registros de Banco
              </button>
              <button onClick={() => setActiveItem("ajustes_banco")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "ajustes_banco" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Edit className="w-4 h-4" /> Ajustes de Banco
              </button>
              <button onClick={() => setActiveItem("transferencias_caja")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "transferencias_caja" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <ArrowRightLeft className="w-4 h-4" /> Transferencias de Caja
              </button>
              <button onClick={() => setActiveItem("conciliacion_bancaria")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "conciliacion_bancaria" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <FileCheck className="w-4 h-4" /> Conciliación Bancaria
              </button>
            </div>
          )}
        </div>

        {/* OPERACIONES FINANCIERAS */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, operaciones: !prev.operaciones }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.operaciones ? "rotate-90" : ""}`} />
            <ArrowDownUp className="w-3.5 h-3.5" />
            Operaciones Financieras
          </button>
          {menuExpandido.operaciones && (
            <div className="ml-2">
              <button onClick={() => setActiveItem("depositos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "depositos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Banknote className="w-4 h-4" /> Depósitos
              </button>
              <button onClick={() => setActiveItem("extracciones")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "extracciones" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Banknote className="w-4 h-4" /> Extracciones
              </button>
              <button onClick={() => setActiveItem("transferencias_bancarias")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "transferencias_bancarias" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <ArrowRightLeft className="w-4 h-4" /> Transferencias Bancarias
              </button>
              <button onClick={() => setActiveItem("conversion_monedas")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "conversion_monedas" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <RefreshCw className="w-4 h-4" /> Conversión de Monedas
              </button>
              <button onClick={() => setActiveItem("prestamos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "prestamos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <DollarSign className="w-4 h-4" /> Préstamos
              </button>
              <button onClick={() => setActiveItem("negociacion_cheques")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "negociacion_cheques" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <FileCheck className="w-4 h-4" /> Negociación de Cheques
              </button>
            </div>
          )}
        </div>

        {/* CHEQUES */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, cheques: !prev.cheques }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.cheques ? "rotate-90" : ""}`} />
            <FileCheck className="w-3.5 h-3.5" />
            Cheques
          </button>
          {menuExpandido.cheques && (
            <div className="ml-2">
              <button onClick={() => setActiveItem("cheques_terceros")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "cheques_terceros" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <FileCheck className="w-4 h-4" /> Cheques de Terceros
              </button>
              <button onClick={() => setActiveItem("cheques_propios")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "cheques_propios" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <FileCheck className="w-4 h-4" /> Cheques Propios
              </button>
            </div>
          )}
        </div>

        {/* CONCILIACIÓN DE TARJETAS */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, tarjetasConc: !prev.tarjetasConc }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.tarjetasConc ? "rotate-90" : ""}`} />
            <CreditCard className="w-3.5 h-3.5" />
            Conciliación de Tarjetas
          </button>
          {menuExpandido.tarjetasConc && (
            <div className="ml-2">
              <button onClick={() => setActiveItem("cupones")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "cupones" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <CreditCard className="w-4 h-4" /> Cupones
              </button>
              <button onClick={() => setActiveItem("conciliacion_tarjetas")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "conciliacion_tarjetas" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <FileCheck className="w-4 h-4" /> Conciliación
              </button>
            </div>
          )}
        </div>

        {/* CONFIGURACIÓN */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, configuracion: !prev.configuracion }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.configuracion ? "rotate-90" : ""}`} />
            <Settings className="w-3.5 h-3.5" />
            Configuración
          </button>
          {menuExpandido.configuracion && (
            <div className="ml-2">
              <button onClick={() => setActiveItem("conceptos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "conceptos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <BookOpen className="w-4 h-4" /> Conceptos
              </button>
              <button onClick={() => setActiveItem("bancos_config")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "bancos_config" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Landmark className="w-4 h-4" /> Bancos
              </button>
              <button onClick={() => setActiveItem("cajas")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "cajas" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Wallet className="w-4 h-4" /> Cajas
              </button>
              <button onClick={() => setActiveItem("tarjetas")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "tarjetas" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <CreditCard className="w-4 h-4" /> Tarjetas
              </button>
              <button onClick={() => setActiveItem("grupos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "grupos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Building2 className="w-4 h-4" /> Grupos de Tarjetas
              </button>
              <button onClick={() => setActiveItem("recargos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "recargos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Percent className="w-4 h-4" /> Recargos de Tarjetas
              </button>
              <button onClick={() => setActiveItem("tipos_prestamos")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "tipos_prestamos" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <DollarSign className="w-4 h-4" /> Tipos de Préstamos
              </button>
              <button onClick={() => setActiveItem("simulador")}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeItem === "simulador" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                <Calculator className="w-4 h-4" /> Simulador de Recargos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-44px)]">
      {renderSidebar()}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-6">
          {activeItem === "tarjetas" && <SeccionTarjetas tarjetas={tarjetas} setTarjetas={setTarjetas} />}
          {activeItem === "grupos" && <SeccionGrupos tarjetas={tarjetas} grupos={grupos} setGrupos={setGrupos} />}
          {activeItem === "recargos" && <SeccionRecargos tarjetas={tarjetas} grupos={grupos} recargos={recargos} setRecargos={setRecargos} />}
          {activeItem === "extractos_caja" && <SeccionExtractosCaja />}
          {activeItem === "registros_caja" && <RegistrosCaja />}
          {activeItem === "ajustes_caja" && <AjustesCaja />}
          {activeItem === "registros_banco" && <RegistrosBanco />}
          {activeItem === "ajustes_banco" && <AjustesBanco />}
          {activeItem === "transferencias_caja" && <TransferenciasCaja />}
          {activeItem === "depositos" && <Depositos />}
          {activeItem === "extracciones" && <Extracciones />}
          {activeItem === "transferencias_bancarias" && <TransferenciasBancarias />}
          {activeItem === "conversion_monedas" && <ConversionMonedas />}
          {activeItem === "prestamos" && <Prestamos />}
          {activeItem === "negociacion_cheques" && <NegociacionChequesComp />}
          {activeItem === "cheques_terceros" && <ChequesTerceros />}
          {activeItem === "cheques_propios" && <ChequesPropios />}
          {activeItem === "conciliacion_bancaria" && <ConciliacionBancaria />}
          {activeItem === "cupones" && <Cupones />}
          {activeItem === "conciliacion_tarjetas" && <ConciliacionTarjetas />}
          {activeItem === "simulador" && <SeccionSimulador tarjetas={tarjetas} grupos={grupos} recargos={recargos} />}
          {activeItem === "cajas" && <ConfigCajas />}
          {activeItem === "bancos_config" && <BancosConfig />}
          {activeItem === "conceptos" && <Conceptos />}
          {activeItem === "tipos_prestamos" && <TiposPrestamos />}
        </div>
      </div>
    </div>
  )
}
