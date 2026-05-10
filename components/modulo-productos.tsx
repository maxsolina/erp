"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { Plus, Edit2, Package, CheckCircle, XCircle, ChevronLeft, History, X } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoProducto = "almacenable" | "servicio" | "consumible"

export interface HistorialCosto {
  fecha: string
  valor_anterior: number
  valor_nuevo: number
  moneda: string
  usuario: string
  origen: "manual" | "recepcion"
  referencia?: string
}

export interface Producto {
  id: number
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
  stock_real: number
  stock_minimo: number
  stock_maximo: number
  stock_critico: number
  tiene_numero_serie: boolean
  requiere_color: boolean
  requiere_bateria: boolean
  requiere_outlet: boolean
  requiere_observaciones: boolean
  costo_manual: number
  moneda_costo: string
  tipo_cotizacion_costo: string   // 'oficial' | 'blue' | 'mep'
  costo_contable: number
  costo_ars: number
  costo_usd: number
  historial_costos: HistorialCosto[]
  garantia_propia_valor: number
  garantia_propia_unidad: "meses" | "dias"
  garantia_fabricante_valor: number
  garantia_fabricante_unidad: "meses" | "dias"
  iva_venta: number
  iva_compra: number
  cuenta_ventas: string
  cuenta_existencias: string
  observaciones: string
}

export type FormProducto = Omit<Producto, "id" | "historial_costos"> & {
  id?: number
  historial_costos?: HistorialCosto[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPCIONES_IVA = [{ value: 0, label: "0%" }, { value: 10.5, label: "10,5%" }, { value: 21, label: "21%" }]

const DEFAULT_FORM: FormProducto = {
  imagen_url: null, nombre: "", codigo_interno: "", categoria: "", marca: "", modelo: "",
  color: "", tipo: "almacenable", puede_venderse: true, puede_comprarse: true, activo: true,
  stock_real: 0, stock_minimo: 0, stock_maximo: 0, stock_critico: 0,
  tiene_numero_serie: false, requiere_color: false, requiere_bateria: false,
  requiere_outlet: false, requiere_observaciones: false,
  costo_manual: 0, moneda_costo: "ARS", tipo_cotizacion_costo: "oficial", costo_contable: 0, costo_ars: 0, costo_usd: 0, historial_costos: [],
  garantia_propia_valor: 0, garantia_propia_unidad: "meses",
  garantia_fabricante_valor: 0, garantia_fabricante_unidad: "meses",
  iva_venta: 21, iva_compra: 21, cuenta_ventas: "", cuenta_existencias: "", observaciones: "",
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-500 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
      {...props}
    />
  )
}

function Sel({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-900 focus:border-transparent disabled:bg-gray-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Checkbox({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-indigo-900 border-indigo-900" : "border-gray-300 bg-white"}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? "border-indigo-900 text-indigo-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
    >
      {children}
    </button>
  )
}

// ─── Formulario ───────────────────────────────────────────────────────────────

interface FormularioProductoProps {
  inicial: FormProducto | null
  onGuardar: (p: FormProducto) => void
  onCancelar: () => void
  soloLectura?: boolean
}

export function FormularioProducto({ inicial, onGuardar, onCancelar, soloLectura: soloLecturaProp = false }: FormularioProductoProps) {
  const [form, setForm] = useState<FormProducto>(inicial ?? { ...DEFAULT_FORM })
  const [tab, setTab] = useState<"info" | "inventario" | "abastecimientos" | "ventas" | "contabilidad" | "observaciones">("info")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [modalHistorialCampo, setModalHistorialCampo] = useState<"manual" | "contable" | null>(null)
  const costoManualOriginalRef = useRef(inicial?.costo_manual ?? 0)

  // Patrón "ver → editar": al entrar a un producto existente la ficha arranca
  // en solo-lectura. Hay que apretar "Editar" para habilitar inputs. Para
  // crear (sin `inicial`) arranca directamente en edición.
  // Cancelar mientras se edita revierte los cambios y vuelve a la vista
  // de solo-lectura — no sale al listado.
  const [enEdicion, setEnEdicion] = useState<boolean>(!inicial)
  const inicialRef = useRef<FormProducto | null>(inicial ?? null)
  // Si cambia `inicial` (cambio de selección), resetear ref + form + modo
  useEffect(() => {
    inicialRef.current = inicial ?? null
    if (inicial) {
      setForm(inicial)
      setEnEdicion(false)
      setErrores({})
    } else {
      setForm({ ...DEFAULT_FORM })
      setEnEdicion(true)
    }
  }, [inicial])
  const soloLectura = soloLecturaProp || !enEdicion

  // Catálogos dinámicos
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([])
  const [marcas, setMarcas] = useState<{ id: number; nombre: string }[]>([])
  const [colores, setColores] = useState<{ id: number; nombre: string }[]>([])
  // Modal inline para crear nuevo item de un catálogo desde el form (sin
  // tener que salir a Stock → Catálogos de Productos).
  const [crearCatalogo, setCrearCatalogo] = useState<null | "categoria" | "marca" | "color">(null)
  const [monedas, setMonedas] = useState<{ codigo: string; nombre: string }[]>([])
  const [cuentasContables, setCuentasContables] = useState<{ id: number; codigo: string; nombre: string }[]>([])

  useEffect(() => {
    fetch("/api/catalogos-producto")
      .then(r => r.json())
      .then(d => {
        if (d.categorias) setCategorias(d.categorias)
        if (d.marcas) setMarcas(d.marcas)
        if (d.colores) setColores(d.colores)
      })
      .catch(console.error)
    fetch("/api/monedas")
      .then(r => r.json())
      .then(d => setMonedas(Array.isArray(d) ? d : []))
      .catch(console.error)
    fetch("/api/contabilidad/plan-cuentas?activo=true")
      .then(r => r.json())
      .then(d => setCuentasContables(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [])

  function set<K extends keyof FormProducto>(key: K, value: FormProducto[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errores[key]) setErrores(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  function validar() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio"
    if (!form.codigo_interno.trim()) e.codigo_interno = "El código interno es obligatorio"
    if (!form.categoria) e.categoria = "La categoría es obligatoria"
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (soloLectura || !validar()) return
    setGuardando(true)
    try {
      let formToSave = { ...form }
      if (form.costo_manual !== costoManualOriginalRef.current) {
        const nuevaEntrada: HistorialCosto = {
          fecha: new Date().toISOString(),
          valor_anterior: costoManualOriginalRef.current,
          valor_nuevo: form.costo_manual,
          moneda: form.moneda_costo,
          usuario: "usuario",
          origen: "manual",
        }
        formToSave = {
          ...formToSave,
          historial_costos: [...(formToSave.historial_costos ?? []), nuevaEntrada],
        }
      }
      await onGuardar(formToSave)
    } finally { setGuardando(false) }
  }

  // Las tabs "Inventario" y "Abastecimientos" no aplican a servicios:
  //   - Servicios no llevan stock → no hay nada en Inventario.
  //   - Servicios no tienen costo contable → Abastecimientos vacío.
  // Si el usuario estaba parado en alguna de esas y cambia a servicio,
  // lo movemos a "info" automáticamente (efecto abajo).
  const TABS = (
    form.tipo === "servicio"
      ? [
          { id: "info" as const,           label: "Información" },
          { id: "ventas" as const,         label: "Ventas" },
          { id: "contabilidad" as const,   label: "Contabilidad" },
          { id: "observaciones" as const,  label: "Observaciones" },
        ]
      : [
          { id: "info" as const,            label: "Información" },
          { id: "inventario" as const,      label: "Inventario" },
          { id: "abastecimientos" as const, label: "Abastecimientos" },
          { id: "ventas" as const,          label: "Ventas" },
          { id: "contabilidad" as const,    label: "Contabilidad" },
          { id: "observaciones" as const,   label: "Observaciones" },
        ]
  )

  // Si el tipo cambia y la tab activa ya no existe, volver a "info"
  useEffect(() => {
    if (form.tipo === "servicio" && (tab === "inventario" || tab === "abastecimientos")) {
      setTab("info")
    }
  }, [form.tipo, tab])

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-gray-50">
      {/* Cabecera */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-900">
            {!inicial
              ? "Nuevo Producto"
              : enEdicion
                ? "Editar Producto"
                : "Producto"}
          </h2>
          <div className="flex items-center gap-3">
            {/* Vista solo-lectura de un producto existente: solo "Editar" */}
            {!soloLecturaProp && inicial && !enEdicion && (
              <button
                type="button"
                onClick={() => setEnEdicion(true)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
              >
                Editar
              </button>
            )}
            {/* Modo edición (creando o editando existente): Cancelar + Confirmar */}
            {!soloLecturaProp && enEdicion && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (inicial) {
                      // Editando existente → revertir y volver a solo-lectura
                      setForm(inicialRef.current ?? inicial)
                      setEnEdicion(false)
                      setErrores({})
                    } else {
                      // Creando nuevo → salir al listado
                      onCancelar()
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Confirmar"}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Nombre del producto</Label>
              <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder={form.tipo === "servicio" ? "Ej: Cambio de pantalla iPhone" : "Ej: iPhone 15 Pro Max 256GB Negro"} disabled={soloLectura} />
              {errores.nombre && <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>}
            </div>
            <div>
              <Label required>Código interno</Label>
              <Input value={form.codigo_interno} onChange={e => set("codigo_interno", e.target.value)} placeholder={form.tipo === "servicio" ? "Ej: SRV-PANT-IP15" : "Ej: IP15PM-256-BLK"} disabled={soloLectura} />
              {errores.codigo_interno && <p className="text-xs text-red-500 mt-1">{errores.codigo_interno}</p>}
            </div>
          </div>

          {/* ─── Tipo (decisión central que cambia qué tabs/campos aplican) ── */}
          {/* Pills grandes para que sea evidente qué tipo de item se está */}
          {/* creando. Cambiar a "servicio" oculta inventario, costos y stock. */}
          <div>
            <Label>Tipo</Label>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
              {([
                { val: "almacenable", label: "Almacenable", hint: "Producto físico con stock" },
                { val: "servicio",    label: "Servicio",    hint: "Mano de obra, instalación, reparación" },
              ] as const).map(opt => {
                const active = form.tipo === opt.val
                return (
                  <button
                    key={opt.val}
                    type="button"
                    disabled={soloLectura}
                    onClick={() => {
                      set("tipo", opt.val as TipoProducto)
                      // Al pasar a servicio: limpiar campos de stock + costo,
                      // forzar puede_comprarse=false (no va en OC/recepciones).
                      if (opt.val === "servicio") {
                        set("tiene_numero_serie", false)
                        set("requiere_color", false)
                        set("requiere_bateria", false)
                        set("requiere_outlet", false)
                        set("requiere_observaciones", false)
                        set("stock_real", 0)
                        set("stock_minimo", 0)
                        set("stock_maximo", 0)
                        set("stock_critico", 0)
                        set("costo_manual", 0)
                        set("costo_contable", 0)
                        set("costo_ars", 0)
                        set("costo_usd", 0)
                        set("puede_comprarse", false)
                        set("cuenta_existencias", "")
                      }
                    }}
                    title={opt.hint}
                    className={`px-5 py-2 font-medium transition-colors ${
                      active
                        ? "bg-indigo-900 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    } ${opt.val === "servicio" ? "border-l border-gray-200" : ""}`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {form.tipo === "servicio"
                ? "Los servicios se pueden incluir en notas de venta y facturas, pero no llevan stock ni se pueden comprar / recepcionar."
                : "Producto físico con stock real, recepciones y descarga de existencias al vender."}
            </p>
          </div>


          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label required>Categoría</Label>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => setCrearCatalogo("categoria")}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium mb-1"
                  >
                    + Nueva
                  </button>
                )}
              </div>
              <Sel value={form.categoria} onChange={e => set("categoria", e.target.value)} disabled={soloLectura}>
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </Sel>
              {errores.categoria && <p className="text-xs text-red-500 mt-1">{errores.categoria}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Marca</Label>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => setCrearCatalogo("marca")}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium mb-1"
                  >
                    + Nueva
                  </button>
                )}
              </div>
              <Sel value={form.marca} onChange={e => set("marca", e.target.value)} disabled={soloLectura}>
                <option value="">Seleccionar...</option>
                {marcas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={e => set("modelo", e.target.value)} placeholder="Ej: A2896" disabled={soloLectura} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Color</Label>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => setCrearCatalogo("color")}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium mb-1"
                  >
                    + Nuevo
                  </button>
                )}
              </div>
              <Sel value={form.color} onChange={e => set("color", e.target.value)} disabled={soloLectura}>
                <option value="">Sin color</option>
                {colores.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </Sel>
            </div>
          </div>

          {crearCatalogo && (
            <ModalCrearCatalogoInline
              tipo={crearCatalogo}
              onCancelar={() => setCrearCatalogo(null)}
              onCreado={(nombre, item) => {
                if (crearCatalogo === "categoria") {
                  setCategorias(prev => [...prev, item].sort((a, b) => a.nombre.localeCompare(b.nombre)))
                  set("categoria", nombre)
                } else if (crearCatalogo === "marca") {
                  setMarcas(prev => [...prev, item].sort((a, b) => a.nombre.localeCompare(b.nombre)))
                  set("marca", nombre)
                } else {
                  setColores(prev => [...prev, item].sort((a, b) => a.nombre.localeCompare(b.nombre)))
                  set("color", nombre)
                }
                setCrearCatalogo(null)
              }}
            />
          )}

          <div className="flex flex-wrap items-center gap-6">
            <Checkbox label="Puede venderse" checked={form.puede_venderse} onChange={v => set("puede_venderse", v)} disabled={soloLectura} />
            {/* "Puede comprarse" no tiene sentido para servicios — se fuerza */}
            {/* a false al cambiar el tipo. Lo escondemos en ese caso. */}
            {form.tipo !== "servicio" && (
              <Checkbox label="Puede comprarse" checked={form.puede_comprarse} onChange={v => set("puede_comprarse", v)} disabled={soloLectura} />
            )}
            <Checkbox label="Activo" checked={form.activo} onChange={v => set("activo", v)} disabled={soloLectura} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2 overflow-x-auto">
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</TabBtn>)}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-6">

        {tab === "info" && (
          <p className="text-sm text-gray-400">Sección de información general. Próximamente: descripción, ficha técnica, etc.</p>
        )}

        {tab === "inventario" && (
          <div className="flex flex-col gap-6">
            {form.tipo !== "servicio" && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock y niveles</h3>
                <div className="grid grid-cols-4 gap-4">
                  {([
                    { key: "stock_real", label: "Stock real", readOnly: true },
                    { key: "stock_minimo", label: "Stock mínimo" },
                    { key: "stock_maximo", label: "Stock máximo" },
                    { key: "stock_critico", label: "Stock crítico" },
                  ] as { key: keyof FormProducto; label: string; readOnly?: boolean }[]).map(({ key, label, readOnly }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input type="number" min={0} value={form[key] as number} onChange={e => set(key, Number(e.target.value))} disabled={soloLectura || readOnly} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {form.tipo === "almacenable" && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tracking por número de serie</h3>
                <div className="flex flex-col gap-3">
                  <Checkbox label="Número de serie único" checked={form.tiene_numero_serie} onChange={v => set("tiene_numero_serie", v)} disabled={soloLectura} />
                  {form.tiene_numero_serie && (
                    <div className="ml-6 flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Atributos requeridos por unidad:</p>
                      <Checkbox label="Color" checked={form.requiere_color} onChange={v => set("requiere_color", v)} disabled={soloLectura} />
                      <Checkbox label="% Batería" checked={form.requiere_bateria} onChange={v => set("requiere_bateria", v)} disabled={soloLectura} />
                      <Checkbox label="Outlet (sí/no)" checked={form.requiere_outlet} onChange={v => set("requiere_outlet", v)} disabled={soloLectura} />
                      <Checkbox label="Observaciones / Fallas" checked={form.requiere_observaciones} onChange={v => set("requiere_observaciones", v)} disabled={soloLectura} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "abastecimientos" && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Costos</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => setModalHistorialCampo("contable")}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1 hover:text-indigo-700 transition-colors group"
                >
                  Costo contable
                  <History className="w-3 h-3 text-gray-400 group-hover:text-indigo-700 transition-colors" />
                </button>
                <Input type="number" min={0} value={form.costo_contable} disabled />
              </div>
              <div>
                <Label>Moneda</Label>
                <Sel value={form.moneda_costo} onChange={e => set("moneda_costo", e.target.value)} disabled={soloLectura}>
                  {monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.nombre}</option>)}
                </Sel>
              </div>
              <div>
                <Label>Tipo Cotización Costo</Label>
                <Sel value={form.tipo_cotizacion_costo ?? "oficial"} onChange={e => set("tipo_cotizacion_costo", e.target.value)} disabled={soloLectura}>
                  <option value="oficial">Oficial</option>
                  <option value="blue">Blue</option>
                  <option value="mep">MEP</option>
                </Sel>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setModalHistorialCampo("manual")}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1 hover:text-indigo-700 transition-colors group"
                >
                  Costo manual
                  <History className="w-3 h-3 text-gray-400 group-hover:text-indigo-700 transition-colors" />
                </button>
                <Input type="number" min={0} value={form.costo_manual} onChange={e => set("costo_manual", Number(e.target.value))} disabled={soloLectura} />
              </div>
            </div>
            {/* Doble guardado bimoenatrio: referencia siempre visible */}
            {(form.costo_ars > 0 || form.costo_usd > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Últimos costos registrados</p>
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-400">ARS</span>
                    <p className="text-sm font-semibold text-gray-700">
                      {form.costo_ars?.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }) ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">USD</span>
                    <p className="text-sm font-semibold text-gray-700">
                      {form.costo_usd > 0
                        ? `USD ${form.costo_usd?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ventas" && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Garantía propia</h3>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={form.garantia_propia_valor} onChange={e => set("garantia_propia_valor", Number(e.target.value))} disabled={soloLectura} className="flex-1" />
                  <Sel value={form.garantia_propia_unidad} onChange={e => set("garantia_propia_unidad", e.target.value as "meses" | "dias")} disabled={soloLectura} className="w-28">
                    <option value="meses">Meses</option>
                    <option value="dias">Días</option>
                  </Sel>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Garantía del fabricante</h3>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={form.garantia_fabricante_valor} onChange={e => set("garantia_fabricante_valor", Number(e.target.value))} disabled={soloLectura} className="flex-1" />
                  <Sel value={form.garantia_fabricante_unidad} onChange={e => set("garantia_fabricante_unidad", e.target.value as "meses" | "dias")} disabled={soloLectura} className="w-28">
                    <option value="meses">Meses</option>
                    <option value="dias">Días</option>
                  </Sel>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "contabilidad" && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IVA de venta</Label>
                <Sel value={form.iva_venta} onChange={e => set("iva_venta", Number(e.target.value))} disabled={soloLectura}>
                  {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Sel>
              </div>
              {/* IVA de compra solo para almacenables — los servicios no se compran */}
              {/* en este ERP (no hay líneas de producto en facturas de compra). */}
              {form.tipo !== "servicio" && (
                <div>
                  <Label>IVA de compra</Label>
                  <Sel value={form.iva_compra} onChange={e => set("iva_compra", Number(e.target.value))} disabled={soloLectura}>
                    {OPCIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Sel>
                </div>
              )}
              <div>
                <Label>{form.tipo === "servicio" ? "Cuenta de ingreso" : "Cuenta de ventas"}</Label>
                <Sel value={form.cuenta_ventas} onChange={e => set("cuenta_ventas", e.target.value)} disabled={soloLectura}>
                  <option value="">{form.tipo === "servicio" ? "Por defecto: Ingresos por Servicios" : "Seleccionar..."}</option>
                  {cuentasContables.map(c => <option key={c.id} value={`${c.codigo} - ${c.nombre}`}>{c.codigo} - {c.nombre}</option>)}
                </Sel>
                {form.tipo === "servicio" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Si lo dejás vacío, el asiento usa la cuenta del mapeo "Ingresos por Servicios".
                  </p>
                )}
              </div>
              {/* "Cuenta de existencias" solo para almacenables — un servicio */}
              {/* no descarga existencias al venderse. */}
              {form.tipo !== "servicio" && (
                <div>
                  <Label>Cuenta de existencias</Label>
                  <Sel value={form.cuenta_existencias} onChange={e => set("cuenta_existencias", e.target.value)} disabled={soloLectura}>
                    <option value="">Seleccionar...</option>
                    {cuentasContables.map(c => <option key={`ex-${c.id}`} value={`${c.codigo} - ${c.nombre}`}>{c.codigo} - {c.nombre}</option>)}
                  </Sel>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "observaciones" && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Label>Notas internas</Label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-900 resize-none disabled:bg-gray-50"
              rows={6}
              value={form.observaciones}
              onChange={e => set("observaciones", e.target.value)}
              placeholder="Notas internas sobre este producto..."
              disabled={soloLectura}
            />
          </div>
        )}
      </div>

      {/* Modal historial de costos */}
      {modalHistorialCampo && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setModalHistorialCampo(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-700" />
                <h3 className="text-base font-semibold text-gray-900">
                  Historial de {modalHistorialCampo === "contable" ? "Costo Contable" : "Costo Manual"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalHistorialCampo(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(() => {
                const entries = (form.historial_costos ?? []).filter(e =>
                  modalHistorialCampo === "contable" ? e.origen === "recepcion" : e.origen === "manual"
                )
                if (entries.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <History className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Sin cambios registrados</p>
                    </div>
                  )
                }
                return (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                        <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Anterior</th>
                        <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Nuevo</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...entries].reverse().map((e, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                            {new Date(e.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            <span className="ml-2 text-xs text-gray-400">
                              {new Date(e.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500 tabular-nums">
                            {e.valor_anterior.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900 tabular-nums">
                            {e.valor_nuevo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{e.moneda}</td>
                          <td className="px-6 py-4 text-gray-600">{e.usuario}</td>
                          <td className="px-6 py-4">
                            {e.referencia ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalHistorialCampo(null)
                                  window.dispatchEvent(
                                    new CustomEvent("erp:navegar-recepcion", { detail: { numero: e.referencia } })
                                  )
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:underline transition-colors"
                              >
                                {e.referencia}
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

// ─── Módulo Productos ─────────────────────────────────────────────────────────

type Vista = "listado" | "nuevo" | "editar"

export default function ModuloProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>("listado")
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  // Tab activo: filtra el listado por tipo. "todos" muestra ambos.
  // Se aplica encima de los filtros del OdooFilterBar y del searchTerm.
  const [tipoTab, setTipoTab] = useState<"todos" | "almacenable" | "servicio">("todos")

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error: err } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false })
    if (err) setError(err.message)
    else setProductos((data ?? []) as Producto[])
    setCargando(false)
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  async function handleGuardar(form: FormProducto) {
    const { id: productoId, ...payload } = form
    payload.historial_costos = payload.historial_costos ?? []
    if (payload.imagen_url?.startsWith("blob:")) payload.imagen_url = null

    let err: any = null
    if (productoId) {
      const res = await supabase.from("productos").update(payload).eq("id", productoId)
      err = res.error
    } else {
      const res = await supabase.from("productos").insert([payload])
      err = res.error
    }

    if (err) { alert(err.message); return }
    await cargarProductos()
    setVista("listado")
    setSeleccionado(null)
  }

  async function handleToggleActivo(e: React.MouseEvent, p: Producto) {
    e.stopPropagation()
    const { error: err } = await supabase
      .from("productos")
      .update({ activo: !p.activo })
      .eq("id", p.id)
    if (err) alert(err.message)
    else await cargarProductos()
  }

  const productosFiltrados = useMemo(() => {
    let result = [...productos]

    // Tab por tipo (almacenable / servicio / todos). Tratamos "consumible" como
    // almacenable a efectos del listado para no perder productos legacy.
    if (tipoTab === "almacenable") {
      result = result.filter(p => p.tipo !== "servicio")
    } else if (tipoTab === "servicio") {
      result = result.filter(p => p.tipo === "servicio")
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q)
        || p.codigo_interno.toLowerCase().includes(q)
        || p.marca.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q),
      )
    }

    for (const filter of activeFilters) {
      result = result.filter(p => String((p as any)[filter.field] ?? "") === filter.value)
    }

    return result
  }, [productos, searchTerm, activeFilters, tipoTab])

  // Conteos por tab — útiles para mostrar badge en cada pill.
  const conteoPorTipo = useMemo(() => {
    let almacenables = 0, servicios = 0
    for (const p of productos) {
      if (p.tipo === "servicio") servicios++
      else almacenables++
    }
    return { almacenables, servicios, todos: productos.length }
  }, [productos])

  const filterOptions = useMemo(() => {
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
    const tipos = [...new Set(productos.map(p => p.tipo).filter(Boolean))]
    const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))]

    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activos" },
          { value: "false", label: "Inactivos" },
        ],
      },
      {
        field: "categoria",
        label: "Categoría",
        values: categorias.sort().map(c => ({ value: c, label: c })),
      },
      {
        field: "tipo",
        label: "Tipo",
        values: tipos.sort().map(t => ({ value: t, label: t })),
      },
      {
        field: "marca",
        label: "Marca",
        values: marcas.sort().map(m => ({ value: m, label: m })),
      },
    ].filter(option => option.values.length > 0)
  }, [productos])

  const groupByOptions: GroupByOption[] = [
    { id: "categoria", label: "Categoría", field: "categoria" },
    { id: "tipo", label: "Tipo", field: "tipo" },
    { id: "marca", label: "Marca", field: "marca" },
    { id: "activo", label: "Estado", field: "activo" },
  ]

  // ── Vista formulario ────────────────────────────────────────────────────────
  if (vista !== "listado") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
          <button
            onClick={() => { setVista("listado"); setSeleccionado(null) }}
            className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Productos
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{vista === "nuevo" ? "Nuevo producto" : `Editar: ${seleccionado?.nombre}`}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <FormularioProducto
            inicial={seleccionado ? { ...seleccionado } : null}
            onGuardar={handleGuardar}
            onCancelar={() => { setVista("listado"); setSeleccionado(null) }}
          />
        </div>
      </div>
    )
  }

  // ── Listado ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Productos</h1>
          <p className="text-xs text-gray-500 mt-0.5">{productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setSeleccionado(null); setVista("nuevo") }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {/* Tabs por tipo: filtran rápidamente Almacenables / Servicios / Todos */}
      <div className="px-6 pt-3 bg-white border-b border-gray-100">
        <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {([
            { id: "todos" as const,       label: "Todos",         count: conteoPorTipo.todos },
            { id: "almacenable" as const, label: "Almacenables",  count: conteoPorTipo.almacenables },
            { id: "servicio" as const,    label: "Servicios",     count: conteoPorTipo.servicios },
          ]).map(t => {
            const active = tipoTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipoTab(t.id)}
                className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
                  active
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
                <span className={`ml-2 text-xs ${active ? "text-gray-400" : "text-gray-400"}`}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* OdooFilterBar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <OdooFilterBar
          moduleName="productos"
          filterOptions={filterOptions}
          groupByOptions={groupByOptions}
          activeFilters={activeFilters}
          activeGroupBy={activeGroupBy}
          searchTerm={searchTerm}
          onFiltersChange={setActiveFilters}
          onGroupByChange={setActiveGroupBy}
          onSearchChange={setSearchTerm}
          savedFilters={savedFilters}
          onSaveFilter={(filter) => setSavedFilters(prev => [...prev, { ...filter, id: `f-${Date.now()}`, createdBy: "current_user" }])}
          onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
          onApplyFilter={(filter) => {
            setActiveFilters(filter.filters)
            setActiveGroupBy(filter.groupBy)
          }}
          totalCount={productos.length}
          filteredCount={productosFiltrados.length}
        />
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando productos...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Package className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">No hay productos que coincidan</p>
            <button onClick={() => { setSeleccionado(null); setVista("nuevo") }} className="mt-1 text-sm text-indigo-700 hover:text-indigo-900 hover:underline">
              Crear primer producto
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Marca</th>
                {/* La columna Tipo solo tiene sentido cuando el tab es Todos */}
                {tipoTab === "todos" && (
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                )}
                {/* Stock no aplica para Servicios — ocultar la columna entera */}
                {tipoTab !== "servicio" && (
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Stock</th>
                )}
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => { setSeleccionado(p); setVista("editar") }}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo_interno}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-indigo-900">{p.nombre}</div>
                    {p.modelo && <div className="text-xs text-gray-400">{p.modelo}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.categoria}</td>
                  <td className="px-4 py-3 text-gray-600">{p.marca}</td>
                  {tipoTab === "todos" && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${p.tipo === "almacenable" ? "bg-blue-100 text-blue-700" : p.tipo === "servicio" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.tipo}
                      </span>
                    </td>
                  )}
                  {tipoTab !== "servicio" && (
                    <td className="px-4 py-3 text-gray-700">{p.tipo === "servicio" ? "—" : p.stock_real}</td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleToggleActivo(e, p)}
                      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                    >
                      {p.activo
                        ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-600">Activo</span></>
                        : <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-gray-400">Inactivo</span></>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Modal: crear nuevo item de catálogo (categoría / marca / color) ────────
// Se muestra desde el form de Producto cuando el operador hace click en
// "+ Nueva" al lado de cada dropdown. Llama al endpoint REST correspondiente
// y devuelve el item creado para agregarlo en caliente al dropdown.
function ModalCrearCatalogoInline({
  tipo,
  onCancelar,
  onCreado,
}: {
  tipo: "categoria" | "marca" | "color"
  onCancelar: () => void
  onCreado: (nombre: string, item: { id: number; nombre: string }) => void
}) {
  const [nombre, setNombre] = useState("")
  const [hex, setHex] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = {
    categoria: { titulo: "Nueva Categoría", endpoint: "/api/categorias-producto", showHex: false },
    marca:     { titulo: "Nueva Marca",     endpoint: "/api/marcas-producto",     showHex: false },
    color:     { titulo: "Nuevo Color",     endpoint: "/api/colores-producto",    showHex: true  },
  }[tipo]

  async function handleSubmit() {
    setError(null)
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return }
    setEnviando(true)
    try {
      const body: Record<string, unknown> = { nombre: nombre.trim() }
      if (config.showHex && hex.trim()) body.hex = hex.trim()
      const r = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        setError(e?.error ?? `Error al crear (HTTP ${r.status})`)
        setEnviando(false)
        return
      }
      const item = await r.json()
      onCreado(item.nombre, { id: item.id, nombre: item.nombre })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{config.titulo}</h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !enviando) handleSubmit() }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {config.showHex && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hex (opcional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="#FF0000"
                  value={hex}
                  onChange={e => setHex(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#999999"}
                  onChange={e => setHex(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            disabled={enviando}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={enviando}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
