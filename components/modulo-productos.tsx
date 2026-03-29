"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import {
  Search, Plus, Edit2, Eye, ChevronDown, ChevronRight, X, Upload, Package,
  History, AlertCircle, CheckCircle, XCircle, Settings, ToggleLeft, ToggleRight,
  DollarSign, Tag, BarChart2, ShoppingBag, ShoppingCart, BookOpen, MessageSquare,
  Camera, Filter, MoreHorizontal
} from "lucide-react"

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoProducto = "almacenable" | "servicio" | "consumible"

interface HistorialCosto {
  fecha: string
  valor_anterior: number
  valor_nuevo: number
  moneda: string
  usuario: string
  origen: "manual" | "recepcion"
  referencia?: string
}

interface Producto {
  id: number
  // Cabecera
  imagen_url: string | null
  nombre: string
  codigo_interno: string
  categoria: string
  marca: string
  modelo: string
  color: string
  tipo: TipoProducto
  puede_venderse: boolean
  puede_comprarse: boolean
  activo: boolean
  // Inventario
  stock_real: number
  stock_minimo: number
  stock_maximo: number
  stock_critico: number
  tiene_numero_serie: boolean
  requiere_color: boolean
  requiere_bateria: boolean
  requiere_outlet: boolean
  requiere_observaciones: boolean
  // Abastecimiento
  costo_manual: number
  moneda_costo: string
  costo_contable: number
  historial_costos: HistorialCosto[]
  // Ventas
  garantia_propia_valor: number
  garantia_propia_unidad: "meses" | "dias"
  garantia_fabricante_valor: number
  garantia_fabricante_unidad: "meses" | "dias"
  // Contabilidad
  iva_venta: number
  iva_compra: number
  cuenta_ventas: string
  cuenta_existencias: string
  // Observaciones
  observaciones: string
}

// ─── Configuraciones maestras ─────────────────────────────────────────────────

const CATEGORIAS_MAESTRAS = [
  "Celulares", "Accesorios", "Repuestos", "Servicios", "Usados",
  "Tablets", "Laptops", "Audio", "Fundas y Protectores"
]

const MARCAS_MAESTRAS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "Huawei", "LG", "Sony",
  "OnePlus", "Genérica"
]

const COLORES_MAESTROS = [
  "Negro", "Blanco", "Azul", "Rojo", "Verde", "Oro", "Plata",
  "Rosa", "Violeta", "Transparente", "Gris"
]

const MONEDAS = ["ARS", "USD", "EUR"]

const OPCIONES_IVA = [
  { value: 0, label: "0%" },
  { value: 10.5, label: "10,5%" },
  { value: 21, label: "21%" },
]

const CUENTAS_CONTABLES = [
  "4.1.01 - Ventas de mercadería",
  "4.1.02 - Ventas de servicios",
  "1.1.03 - Mercaderías",
  "1.1.04 - Materias primas",
  "5.1.01 - Costo de mercaderías vendidas",
]

// ─── Datos mock ───────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number, moneda = "ARS") {
  if (n === 0) return "-"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "USD" ? "USD" : "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

const TIPO_LABELS: Record<TipoProducto, string> = {
  almacenable: "Almacenable",
  servicio: "Servicio",
  consumible: "Consumible",
}

const TIPO_COLORS: Record<TipoProducto, string> = {
  almacenable: "bg-blue-100 text-blue-700",
  servicio: "bg-purple-100 text-purple-700",
  consumible: "bg-amber-100 text-amber-700",
}

// ─── Componente Badge Estado ──────────────────────────────────────────────────

function BadgeActivo({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle className="w-3 h-3" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <XCircle className="w-3 h-3" />
      Inactivo
    </span>
  )
}

// ─── Modal Historial de Costos ────────────────────────────────────────────────

function ModalHistorialCostos({ historial, onClose }: { historial: HistorialCosto[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-900 text-white px-5 py-4 flex justify-between items-center">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial de costos
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          {historial.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Sin historial de cambios.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 text-left">Fecha</th>
                  <th className="pb-2 text-right">Anterior</th>
                  <th className="pb-2 text-right">Nuevo</th>
                  <th className="pb-2 text-left">Usuario</th>
                  <th className="pb-2 text-left">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-600">{formatDate(h.fecha)}</td>
                    <td className="py-2 text-right text-gray-500">{formatMoney(h.valor_anterior, h.moneda)}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{formatMoney(h.valor_nuevo, h.moneda)}</td>
                    <td className="py-2 text-gray-600">{h.usuario}</td>
                    <td className="py-2">
                      {h.origen === "recepcion" ? (
                        <span className="text-xs text-blue-600">Recepción {h.referencia && `(${h.referencia})`}</span>
                      ) : (
                        <span className="text-xs text-gray-500">Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-gray-50 px-5 py-3 flex justify-end border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulario de Producto ───────────────────────────────────────────────────

const TABS = [
  { id: "informacion", label: "Información", icon: Package },
  { id: "inventario", label: "Inventario", icon: BarChart2 },
  { id: "abastecimiento", label: "Abastecimiento", icon: ShoppingCart },
  { id: "ventas", label: "Ventas", icon: ShoppingBag },
  { id: "contabilidad", label: "Contabilidad", icon: BookOpen },
  { id: "observaciones", label: "Observaciones", icon: MessageSquare },
]

export type FormProducto = Omit<Producto, "id" | "historial_costos"> & { id?: number; historial_costos?: HistorialCosto[] }

interface FormProductoProps {
  inicial: FormProducto | null
  onGuardar: (p: FormProducto) => void
  onCancelar: () => void
  soloLectura?: boolean
}

export function FormularioProducto({ inicial, onGuardar, onCancelar, soloLectura = false }: FormProductoProps) {
  const esNuevo = !inicial?.id

  const defaultForm: FormProducto = {
    imagen_url: null,
    nombre: "",
    codigo_interno: "",
    categoria: "",
    marca: "",
    modelo: "",
    color: "",
    tipo: "almacenable",
    puede_venderse: true,
    puede_comprarse: true,
    activo: true,
    stock_real: 0,
    stock_minimo: 0,
    stock_maximo: 0,
    stock_critico: 0,
    tiene_numero_serie: false,
    requiere_color: false,
    requiere_bateria: false,
    requiere_outlet: false,
    requiere_observaciones: false,
    costo_manual: 0,
    moneda_costo: "ARS",
    costo_contable: 0,
    garantia_propia_valor: 0,
    garantia_propia_unidad: "meses",
    garantia_fabricante_valor: 0,
    garantia_fabricante_unidad: "meses",
    iva_venta: 21,
    iva_compra: 21,
    cuenta_ventas: "",
    cuenta_existencias: "",
    observaciones: "",
    historial_costos: [],
  }

  const [form, setForm] = useState<FormProducto>(inicial ?? defaultForm)
  const [tab, setTab] = useState("informacion")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHistorial, setShowHistorial] = useState(false)

  function set<K extends keyof FormProducto>(key: K, value: FormProducto[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function validar() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio"
    if (!form.codigo_interno.trim()) e.codigo_interno = "El código interno es obligatorio"
    if (/\s/.test(form.codigo_interno)) e.codigo_interno = "No se permiten espacios en el código"
    if (!form.categoria) e.categoria = "La categoría es obligatoria"
    return e
  }

  function handleGuardar() {
    if (soloLectura) return
    const e = validar()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      if (e.nombre || e.codigo_interno || e.categoria) setTab("informacion")
      return
    }
    onGuardar(form)
  }

  const inventarioDeshabilitado = form.tipo === "servicio"
  const snForzadoDesactivado = form.tipo === "consumible"

  const labelClass = "block text-xs font-medium text-gray-700 mb-1"
  const inputClass = (field?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      field && errors[field] ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
    } ${soloLectura ? "bg-gray-50 cursor-default" : ""}`
  const selectClass = (field?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      field && errors[field] ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
    } ${soloLectura ? "bg-gray-50 cursor-default" : ""}`

  return (
    <div className="space-y-4">
      {/* Datos principales */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-5">
          {/* Imagen */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gray-100 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative overflow-hidden">
              {form.imagen_url ? (
                <img src={form.imagen_url} alt="Producto" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-0.5">Foto</span>
                </>
              )}
              {!soloLectura && (
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) set("imagen_url", URL.createObjectURL(file))
                  }}
                />
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {form.nombre || (esNuevo ? "Nuevo producto" : "Producto")}
            </h2>
            {form.codigo_interno && (
              <p className="text-sm text-gray-500">{form.codigo_interno}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre del producto <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              readOnly={soloLectura}
              className={inputClass("nombre")}
              placeholder="ej: iPhone 15 Pro Max 256GB Negro"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>
          <div>
            <label className={labelClass}>Código interno <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.codigo_interno}
              onChange={e => set("codigo_interno", e.target.value.toUpperCase().replace(/\s/g, ""))}
              readOnly={soloLectura}
              className={inputClass("codigo_interno")}
              placeholder="ej: IP15PM-256"
            />
            {errors.codigo_interno && <p className="text-red-500 text-xs mt-1">{errors.codigo_interno}</p>}
          </div>
          <div>
            <label className={labelClass}>Categoría <span className="text-red-500">*</span></label>
            <select value={form.categoria} disabled={soloLectura} onChange={e => set("categoria", e.target.value)} className={selectClass("categoria")}>
              <option value="">Seleccionar...</option>
              {CATEGORIAS_MAESTRAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.categoria && <p className="text-red-500 text-xs mt-1">{errors.categoria}</p>}
          </div>
          <div>
            <label className={labelClass}>Marca</label>
            <select value={form.marca} disabled={soloLectura} onChange={e => set("marca", e.target.value)} className={selectClass()}>
              <option value="">Sin marca</option>
              {MARCAS_MAESTRAS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Modelo</label>
            <input
              type="text"
              value={form.modelo}
              onChange={e => set("modelo", e.target.value)}
              readOnly={soloLectura}
              className={inputClass()}
              placeholder="ej: iPhone 15 Pro Max"
            />
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <select value={form.color} disabled={soloLectura} onChange={e => set("color", e.target.value)} className={selectClass()}>
              <option value="">Sin color</option>
              {COLORES_MAESTROS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo de producto</label>
            <select value={form.tipo} disabled={soloLectura} onChange={e => set("tipo", e.target.value as TipoProducto)} className={selectClass()}>
              <option value="almacenable">Almacenable</option>
              <option value="servicio">Servicio</option>
              <option value="consumible">Consumible</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-6 pt-4">
            {(["puede_venderse", "puede_comprarse", "activo"] as const).map(key => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  disabled={soloLectura}
                  onChange={e => set(key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {key === "puede_venderse" ? "Puede venderse" : key === "puede_comprarse" ? "Puede comprarse" : "Activo"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {TABS.map(t => {
              const Icon = t.icon
              const deshabilitado = inventarioDeshabilitado && t.id === "inventario"
              return (
                <button
                  key={t.id}
                  onClick={() => !deshabilitado && setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors ${
                    tab === t.id
                      ? "border-blue-600 text-blue-600 font-medium"
                      : deshabilitado
                      ? "border-transparent text-gray-300 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {/* TAB: Información */}
          {tab === "informacion" && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>IVA de venta</label>
                  <select value={form.iva_venta} disabled={soloLectura} onChange={e => set("iva_venta", Number(e.target.value))} className={selectClass()}>
                    {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>IVA de compra</label>
                  <select value={form.iva_compra} disabled={soloLectura} onChange={e => set("iva_compra", Number(e.target.value))} className={selectClass()}>
                    {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Descripción interna</label>
                <textarea
                  value={form.observaciones}
                  readOnly={soloLectura}
                  onChange={e => set("observaciones", e.target.value)}
                  rows={4}
                  placeholder="Descripción del producto para uso interno..."
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 resize-none ${soloLectura ? "bg-gray-50 cursor-default" : "bg-white"}`}
                />
              </div>
            </div>
          )}

          {/* TAB: Inventario */}
          {tab === "inventario" && (
            inventarioDeshabilitado ? (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">Los productos de tipo <strong>Servicio</strong> no tienen inventario ni stock físico.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Stock y niveles</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>Stock real</label>
                      <input type="number" value={form.stock_real} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-default" />
                      <p className="text-xs text-gray-400 mt-1">Calculado automáticamente</p>
                    </div>
                    <div>
                      <label className={labelClass}>Stock mínimo</label>
                      <input type="number" min={0} value={form.stock_minimo} onChange={e => set("stock_minimo", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                    </div>
                    <div>
                      <label className={labelClass}>Stock máximo</label>
                      <input type="number" min={0} value={form.stock_maximo} onChange={e => set("stock_maximo", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                    </div>
                    <div>
                      <label className={labelClass}>Stock crítico</label>
                      <input type="number" min={0} value={form.stock_critico} onChange={e => set("stock_critico", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Tracking por número de serie</h3>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <label className={`flex items-center gap-3 cursor-pointer select-none ${snForzadoDesactivado ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={snForzadoDesactivado ? false : form.tiene_numero_serie}
                        disabled={soloLectura || snForzadoDesactivado}
                        onChange={e => set("tiene_numero_serie", e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">Número de serie único</span>
                        <p className="text-xs text-gray-500">{snForzadoDesactivado ? "Los consumibles no se trackean por número de serie." : "Activa el tracking individual por unidad (IMEI, SN, etc.)"}</p>
                      </div>
                    </label>

                    {!snForzadoDesactivado && form.tiene_numero_serie && (
                      <div className="pl-7 space-y-2 border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">Atributos requeridos por unidad</p>
                        <label className="flex items-center gap-3 opacity-70 cursor-not-allowed">
                          <input type="checkbox" checked disabled className="w-4 h-4 rounded border-gray-300" />
                          <span className="text-sm text-gray-700">Número de serie / IMEI <span className="text-xs text-gray-400">(siempre requerido)</span></span>
                        </label>
                        {([
                          { key: "requiere_color", label: "Color" },
                          { key: "requiere_bateria", label: "% Batería" },
                          { key: "requiere_outlet", label: "Outlet (sí/no)" },
                          { key: "requiere_observaciones", label: "Observaciones / Fallas" },
                        ] as { key: keyof FormProducto; label: string }[]).map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={form[key] as boolean}
                              disabled={soloLectura}
                              onChange={e => set(key, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB: Abastecimiento */}
          {tab === "abastecimiento" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 mb-4">Costos</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Costo manual</label>
                  <input type="number" min={0} value={form.costo_manual} onChange={e => set("costo_manual", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                </div>
                <div>
                  <label className={labelClass}>Moneda del costo</label>
                  <select value={form.moneda_costo} disabled={soloLectura} onChange={e => set("moneda_costo", e.target.value)} className={selectClass()}>
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Costo contable</label>
                  <input type="number" min={0} value={form.costo_contable} onChange={e => set("costo_contable", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                  <p className="text-xs text-gray-400 mt-1">Usado en valuación de inventario</p>
                </div>
              </div>
              <div>
                <button onClick={() => setShowHistorial(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <History className="w-4 h-4" />
                  Ver historial de costos
                </button>
              </div>
            </div>
          )}

          {/* TAB: Ventas */}
          {tab === "ventas" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Garantías</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Garantía propia</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass}>Valor</label>
                      <input type="number" min={0} value={form.garantia_propia_valor} onChange={e => set("garantia_propia_valor", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                    </div>
                    <div className="w-28">
                      <label className={labelClass}>Unidad</label>
                      <select value={form.garantia_propia_unidad} disabled={soloLectura} onChange={e => set("garantia_propia_unidad", e.target.value as "meses" | "dias")} className={selectClass()}>
                        <option value="meses">Meses</option>
                        <option value="dias">Días</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Garantía del fabricante</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={labelClass}>Valor</label>
                      <input type="number" min={0} value={form.garantia_fabricante_valor} onChange={e => set("garantia_fabricante_valor", Number(e.target.value))} readOnly={soloLectura} className={inputClass()} />
                    </div>
                    <div className="w-28">
                      <label className={labelClass}>Unidad</label>
                      <select value={form.garantia_fabricante_unidad} disabled={soloLectura} onChange={e => set("garantia_fabricante_unidad", e.target.value as "meses" | "dias")} className={selectClass()}>
                        <option value="meses">Meses</option>
                        <option value="dias">Días</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Contabilidad */}
          {tab === "contabilidad" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>IVA de venta</label>
                <select value={form.iva_venta} disabled={soloLectura} onChange={e => set("iva_venta", Number(e.target.value))} className={selectClass()}>
                  {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>IVA de compra</label>
                <select value={form.iva_compra} disabled={soloLectura} onChange={e => set("iva_compra", Number(e.target.value))} className={selectClass()}>
                  {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cuenta de ventas</label>
                <select value={form.cuenta_ventas} disabled={soloLectura} onChange={e => set("cuenta_ventas", e.target.value)} className={selectClass()}>
                  <option value="">Seleccionar cuenta...</option>
                  {CUENTAS_CONTABLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {form.tipo !== "servicio" && (
                <div>
                  <label className={labelClass}>Cuenta de existencias</label>
                  <select value={form.cuenta_existencias} disabled={soloLectura} onChange={e => set("cuenta_existencias", e.target.value)} className={selectClass()}>
                    <option value="">Seleccionar cuenta...</option>
                    {CUENTAS_CONTABLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB: Observaciones */}
          {tab === "observaciones" && (
            <div>
              <label className={labelClass}>Notas internas</label>
              <textarea
                value={form.observaciones}
                onChange={e => set("observaciones", e.target.value)}
                readOnly={soloLectura}
                rows={8}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 resize-none ${soloLectura ? "bg-gray-50" : "bg-white"}`}
                placeholder="Notas internas para uso del equipo. No se imprime ni se muestra al cliente."
              />
              <p className="text-xs text-gray-400 mt-1">Este campo es solo para uso interno y no aparece en ningún comprobante.</p>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      {!soloLectura && (
        <div className="flex items-center justify-between py-2">
          <button onClick={onCancelar} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            {esNuevo ? "Crear producto" : "Guardar cambios"}
          </button>
        </div>
      )}
      {soloLectura && (
        <div className="flex justify-end py-2">
          <button onClick={onCancelar} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      )}

      {showHistorial && (
        <ModalHistorialCostos historial={form.historial_costos ?? []} onClose={() => setShowHistorial(false)} />
      )}
    </div>
  )
}

// ─── Módulo principal ─────────────────────────────────────────────────────────

export default function ModuloProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [vista, setVista] = useState<"listado" | "nuevo" | "editar" | "ver">("listado")
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setErrorCarga(null)
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre", { ascending: true })
    if (error) setErrorCarga(error.message)
    else setProductos((data ?? []) as Producto[])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activos" | "inactivos">("activos")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroMarca, setFiltroMarca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroSN, setFiltroSN] = useState<"todos" | "con_sn" | "sin_sn">("todos")

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (filtroActivo === "activos" && !p.activo) return false
      if (filtroActivo === "inactivos" && p.activo) return false
      if (filtroCategoria && p.categoria !== filtroCategoria) return false
      if (filtroMarca && p.marca !== filtroMarca) return false
      if (filtroTipo && p.tipo !== filtroTipo) return false
      if (filtroSN === "con_sn" && !p.tiene_numero_serie) return false
      if (filtroSN === "sin_sn" && p.tiene_numero_serie) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.codigo_interno.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.modelo.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [productos, busqueda, filtroActivo, filtroCategoria, filtroMarca, filtroTipo, filtroSN])

  async function handleGuardar(form: FormProducto) {
    const { id: productoId, historial_costos, imagen_url, ...rest } = form
    const payload = {
      ...rest,
      historial_costos: historial_costos ?? [],
      imagen_url: imagen_url?.startsWith("blob:") ? null : (imagen_url ?? null),
    }

    let dbError: any = null
    if (productoId) {
      const { error } = await supabase.from("productos").update(payload).eq("id", productoId)
      dbError = error
    } else {
      const { error } = await supabase.from("productos").insert([payload])
      dbError = error
    }

    if (dbError) {
      alert(dbError.message ?? "Error al guardar el producto")
      return
    }

    await cargarProductos()
    setVista("listado")
    setProductoSeleccionado(null)
  }

  // ── Vistas de formulario ──────────────────────────────────────────────────
  if (vista === "nuevo" || vista === "editar" || vista === "ver") {
    const esVer = vista === "ver"
    const titulo = vista === "nuevo" ? "Nuevo Producto" : vista === "ver" ? productoSeleccionado?.nombre : `Editar: ${productoSeleccionado?.nombre}`

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb + acciones */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <button onClick={() => { setVista("listado"); setProductoSeleccionado(null) }} className="hover:text-blue-600">
              Productos
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{titulo}</span>
          </div>
          {esVer && productoSeleccionado && (
            <button
              onClick={() => setVista("editar")}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => { setVista("listado"); setProductoSeleccionado(null) }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
                <p className="text-sm text-gray-500">
                  {vista === "nuevo" ? "Complete los datos del nuevo producto" : productoSeleccionado?.codigo_interno ?? ""}
                </p>
              </div>
            </div>
            <FormularioProducto
              inicial={productoSeleccionado ? { ...productoSeleccionado } : null}
              onGuardar={handleGuardar}
              onCancelar={() => { setVista("listado"); setProductoSeleccionado(null) }}
              soloLectura={esVer}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Vista de listado ───────────────��──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Productos</h1>
          <p className="text-xs text-gray-500">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""} mostrados
          </p>
        </div>
        <button
          onClick={() => { setProductoSeleccionado(null); setVista("nuevo") }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, categoría, marca..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro activo/inactivo */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
            {(["activos", "todos", "inactivos"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroActivo(f)}
                className={`px-3 py-2 transition-colors capitalize ${
                  filtroActivo === f ? "bg-indigo-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f === "todos" ? "Todos" : f === "activos" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>

          {/* Filtro categoría */}
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS_MAESTRAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Filtro marca */}
          <select
            value={filtroMarca}
            onChange={e => setFiltroMarca(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
          >
            <option value="">Todas las marcas</option>
            {MARCAS_MAESTRAS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Filtro tipo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
          >
            <option value="">Todos los tipos</option>
            <option value="almacenable">Almacenable</option>
            <option value="servicio">Servicio</option>
            <option value="consumible">Consumible</option>
          </select>

          {/* Filtro SN */}
          <select
            value={filtroSN}
            onChange={e => setFiltroSN(e.target.value as "todos" | "con_sn" | "sin_sn")}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
          >
            <option value="todos">Con y sin N° serie</option>
            <option value="con_sn">Con N° de serie</option>
            <option value="sin_sn">Sin N° de serie</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Marca</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Imagen */}
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                        {p.imagen_url ? (
                          <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>

                    {/* Código */}
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{p.codigo_interno}</code>
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[220px]">{p.nombre}</div>
                      {p.modelo && <div className="text-xs text-gray-400">{p.modelo}</div>}
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3 text-gray-600">{p.categoria}</td>

                    {/* Marca */}
                    <td className="px-4 py-3 text-gray-600">{p.marca || <span className="text-gray-400">—</span>}</td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[p.tipo]}`}>
                        {TIPO_LABELS[p.tipo]}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      <BadgeActivo activo={p.activo} />
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setProductoSeleccionado(p); setVista("ver") }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setProductoSeleccionado(p); setVista("editar") }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación / info */}
        {productosFiltrados.length > 0 && (
          <div className="mt-3 text-xs text-gray-400 text-center">
            Mostrando {productosFiltrados.length} de {productos.length} productos
          </div>
        )}
      </div>
    </div>
  )
}
