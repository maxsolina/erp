"use client"

import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom"
import { Plus, X, Save, Lock, ChevronDown, Search } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { getCategoriaProveedores } from "@/lib/categorias-proveedor-actions"
import { guardarProveedor } from "@/lib/compras-actions"
import { useERP } from "@/contexts/erp-context"

// =====================================================
// Constantes geográficas — duplicadas desde modulo-compras-v2.tsx
// (en el original son constantes top-level del archivo, no exportadas).
// =====================================================
const PAISES_LISTA = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Ecuador",
  "México", "Paraguay", "Perú", "Uruguay", "Venezuela",
  "Alemania", "Australia", "Bélgica", "Canadá", "China", "Corea del Sur",
  "España", "Estados Unidos", "Francia", "India", "Italia", "Japón",
  "Países Bajos", "Portugal", "Reino Unido", "Rusia", "Sudáfrica",
  "Suiza", "Turquía",
]

const PROVINCIAS_AR = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]

const CIUDADES_POR_PROVINCIA: Record<string, string[]> = {
  "Santa Fe": [
    "Rosario", "Santa Fe", "Rafaela", "Venado Tuerto", "Villa Gobernador Gálvez",
    "San Lorenzo", "Reconquista", "Casilda", "Firmat", "Cañada de Gómez",
    "Villa Constitución", "Esperanza", "Gálvez", "Santo Tomé", "Las Rosas",
    "Pérez", "Rufino", "Villa del Parque", "Vera", "Totoras",
    "Sastre", "Coronda", "Las Parejas", "Piamonte",
  ],
  "Buenos Aires": [
    "La Plata", "Mar del Plata", "Quilmes", "Lanús", "Tigre", "Lomas de Zamora",
    "Almirante Brown", "General San Martín", "Tres de Febrero", "Florencio Varela",
    "Berazategui", "Avellaneda", "Morón", "Merlo", "Moreno", "La Matanza",
    "San Isidro", "Vicente López", "Hurlingham", "Ituzaingó", "Bahía Blanca",
    "Tandil", "Junín", "Pergamino", "San Nicolás de los Arroyos", "Necochea",
    "Olavarría", "Azul", "Luján", "Pilar", "Campana", "Zárate", "San Pedro",
    "Chascomús", "Dolores", "Trenque Lauquen", "Pehuajó", "9 de Julio",
    "Bragado", "Chivilcoy",
  ],
}

// =====================================================
// Tipos — duplicados desde modulo-compras-v2.tsx
// (interfaces locales del archivo original, no exportadas).
// =====================================================
interface ContactoProveedor {
  id: number
  nombre: string
  sector: string
  puesto: string
  telefono: string
  email: string
  observaciones: string
}

export interface ProveedorForm {
  id?: number
  codigo?: string
  nombre: string
  nombre_fantasia: string
  razon_social: string
  tipo_documento: "CUIT" | "DNI" | "Pasaporte" | "Sin documento"
  numero_documento: string
  posicion_fiscal: "Responsable Inscripto" | "Monotributista" | "Exento" | "Consumidor Final" | "No responsable" | "Exterior"
  categoria_proveedor: string
  celular: string
  email: string
  calle_numero: string
  ciudad: string
  provincia: string
  pais: string
  codigo_postal: string
  cuit: string
  tipo_documento_legacy: string
  numero_documento_legacy: string
  direccion: string
  telefono: string
  web: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_email: string
  condicion_pago: string
  moneda_habitual: string
  categoria: "publico" | "privado"
  confidencial: boolean
  tipo: "nacional" | "internacional" | "despachante"
  activo: boolean
  contactos: ContactoProveedor[]
  sucursal_origen: string
  moneda_defecto: string
  aplica_circuito_compras: boolean
  cuenta_gastos_defecto: string
  cuenta_gastos_defecto_codigo: string
  cuenta_gastos_defecto_nombre: string
  cuenta_analitica: string
  tipo_cotizacion_defecto: string
  observaciones: string
}

const proveedorFormVacio: ProveedorForm = {
  nombre: "",
  nombre_fantasia: "",
  razon_social: "",
  tipo_documento: "CUIT",
  numero_documento: "",
  posicion_fiscal: "Responsable Inscripto",
  categoria_proveedor: "",
  celular: "",
  email: "",
  calle_numero: "",
  ciudad: "",
  provincia: "",
  pais: "Argentina",
  codigo_postal: "",
  cuit: "",
  tipo_documento_legacy: "CUIT",
  numero_documento_legacy: "",
  direccion: "",
  telefono: "",
  web: "",
  contacto_nombre: "",
  contacto_telefono: "",
  contacto_email: "",
  condicion_pago: "Contado",
  moneda_habitual: "ARS",
  categoria: "publico",
  confidencial: false,
  tipo: "nacional",
  activo: true,
  contactos: [],
  sucursal_origen: "",
  moneda_defecto: "ARS",
  aplica_circuito_compras: false,
  cuenta_gastos_defecto: "",
  cuenta_gastos_defecto_codigo: "",
  cuenta_gastos_defecto_nombre: "",
  cuenta_analitica: "",
  tipo_cotizacion_defecto: "",
  observaciones: "",
}

// =====================================================
// ModalCuentaContable — duplicado desde modulo-compras-v2.tsx
// TODO: extraer a componente compartido cuando se haga limpieza más amplia.
// =====================================================
const GRUPOS_CUENTA: Record<string, string> = {
  "1": "Activo",
  "2": "Pasivo",
  "3": "Patrimonio Neto",
  "4": "Resultado – Ingresos",
  "5": "Costo de Ventas",
  "6": "Gastos",
  "7": "Otros Ingresos",
  "8": "Otros Egresos",
  "9": "Cuentas de Orden",
}

function ModalCuentaContable({
  onSelect,
  onClose,
  cuentasPermitidas,
}: {
  onSelect: (c: { id: string; codigo: string; nombre: string }) => void
  onClose: () => void
  cuentasPermitidas?: { id: string; codigo: string; nombre: string }[]
}) {
  type Cuenta = { id: string; codigo: string; nombre: string }
  const tieneRestriccion = (cuentasPermitidas?.length ?? 0) > 0
  const [todas, setTodas] = useState<Cuenta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    if (tieneRestriccion) {
      setTodas(cuentasPermitidas!)
      return
    }
    fetch("/api/contabilidad/cuentas?q=&limit=500")
      .then(r => r.json())
      .then(d => setTodas(Array.isArray(d?.data) ? d.data : []))
      .catch(() => {})
  }, [tieneRestriccion])

  const filtradas = React.useMemo(() => {
    let result = todas
    const q = busqueda.trim().toLowerCase()
    if (q) result = result.filter(c => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
    for (const f of activeFilters) {
      if (f.field === "prefijo") result = result.filter(c => c.codigo.startsWith(f.value))
    }
    return result
  }, [todas, busqueda, activeFilters])

  const agrupadoPorTipo = activeGroupBy.some(g => g.field === "tipo")
  const grupos = React.useMemo(() => {
    if (!agrupadoPorTipo) return null
    const map: Record<string, Cuenta[]> = {}
    for (const c of filtradas) {
      const k = c.codigo[0] ?? "?"
      if (!map[k]) map[k] = []
      map[k].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtradas, agrupadoPorTipo])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-amber-900">Seleccionar cuenta contable</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b">
          <OdooFilterBar
            moduleName="cuentas-contables-selector"
            filterOptions={[
              {
                field: "prefijo",
                label: "Tipo de cuenta",
                values: Object.entries(GRUPOS_CUENTA).map(([v, l]) => ({ value: v, label: `${v} — ${l}` })),
              },
            ]}
            groupByOptions={[{ id: "tipo", label: "Tipo de cuenta", field: "tipo" }]}
            activeFilters={activeFilters}
            activeGroupBy={activeGroupBy}
            searchTerm={busqueda}
            onFiltersChange={setActiveFilters}
            onGroupByChange={setActiveGroupBy}
            onSearchChange={setBusqueda}
            savedFilters={savedFilters}
            onSaveFilter={f =>
              setSavedFilters(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "usuario" }])
            }
            onDeleteFilter={id => setSavedFilters(prev => prev.filter(f => f.id !== id))}
            onApplyFilter={f => {
              setActiveFilters(f.filters)
              setActiveGroupBy(f.groupBy)
            }}
            totalCount={todas.length}
            filteredCount={filtradas.length}
            hideFavorites
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              {busqueda || activeFilters.length > 0
                ? "Sin resultados para los filtros aplicados"
                : "Cargando cuentas..."}
            </div>
          )}

          {grupos
            ? grupos.map(([prefijo, cuentas]) => (
                <div key={prefijo}>
                  <div className="px-5 py-2 bg-gray-50 border-b border-t text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    {prefijo} — {GRUPOS_CUENTA[prefijo] ?? `Grupo ${prefijo}`}
                    <span className="ml-2 font-normal text-gray-400">({cuentas.length})</span>
                  </div>
                  {cuentas.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c)
                        onClose()
                      }}
                      className="w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                      <span className="text-sm text-gray-800">{c.nombre}</span>
                    </button>
                  ))}
                </div>
              ))
            : filtradas.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c)
                    onClose()
                  }}
                  className="w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                  <span className="text-sm text-gray-800">{c.nombre}</span>
                </button>
              ))}
        </div>

        <div className="px-5 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// CuentaContableSelector — duplicado desde modulo-compras-v2.tsx
// TODO: extraer a componente compartido.
// =====================================================
function CuentaContableSelector({
  value,
  onChange,
  cuentasPermitidas,
}: {
  value: string
  onChange: (id: string, codigo?: string, nombre?: string) => void
  cuentasPermitidas?: { id: string; codigo: string; nombre: string }[]
}) {
  const tieneRestriccion = (cuentasPermitidas?.length ?? 0) > 0
  const [query, setQuery] = useState("")
  const [opciones, setOpciones] = useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [abierto, setAbierto] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [seleccionada, setSeleccionada] = useState<{ id: string; codigo: string; nombre: string } | null>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const refTrigger = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) {
      setSeleccionada(null)
      return
    }
    if (tieneRestriccion) {
      setSeleccionada(cuentasPermitidas!.find(c => c.id === value) ?? null)
      return
    }
    fetch(`/api/contabilidad/cuentas?id=${value}`)
      .then(r => r.json())
      .then(data => {
        if (data?.data) setSeleccionada(data.data)
      })
      .catch(() => {})
  }, [value, tieneRestriccion])

  const abrirDropdown = () => {
    if (refTrigger.current) {
      const rect = refTrigger.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    }
    setAbierto(v => !v)
  }

  useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const dropdown = document.getElementById("cuenta-selector-dropdown")
      if (refTrigger.current && !refTrigger.current.contains(target) && !dropdown?.contains(target)) {
        setAbierto(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [abierto])

  useEffect(() => {
    if (!abierto) {
      setOpciones([])
      return
    }
    if (tieneRestriccion) {
      const q = query.trim().toLowerCase()
      const filtradas = q
        ? cuentasPermitidas!.filter(c => c.codigo.includes(q) || c.nombre.toLowerCase().includes(q))
        : cuentasPermitidas!
      setOpciones(filtradas.slice(0, 5))
      return
    }
    const delay = query.trim().length > 0 ? 300 : 0
    const t = setTimeout(() => {
      const qs = query.trim()
      const url = qs.length > 0
        ? `/api/contabilidad/cuentas?q=${encodeURIComponent(qs)}&limit=5`
        : `/api/contabilidad/cuentas?q=&limit=5`
      fetch(url)
        .then(r => r.json())
        .then(data => setOpciones(Array.isArray(data?.data) ? data.data : []))
        .catch(() => {})
    }, delay)
    return () => clearTimeout(t)
  }, [query, abierto, tieneRestriccion])

  const seleccionar = (op: { id: string; codigo: string; nombre: string }) => {
    setSeleccionada(op)
    onChange(op.id, op.codigo, op.nombre)
    setAbierto(false)
    setQuery("")
  }

  const dropdown = abierto ? (
    <div
      id="cuenta-selector-dropdown"
      style={{
        position: "absolute",
        top: dropdownPos.top,
        left: dropdownPos.left,
        minWidth: Math.min(dropdownPos.width, 360),
        maxWidth: 480,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
    >
      <input
        autoFocus
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Código o nombre..."
        className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none rounded-t-lg"
      />
      {opciones.map(op => (
        <div
          key={op.id}
          className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 transition-colors"
          onMouseDown={e => {
            e.preventDefault()
            seleccionar(op)
          }}
        >
          <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{op.codigo}</span>
          <span className="text-gray-800">{op.nombre}</span>
        </div>
      ))}
      {opciones.length === 0 && query.trim() && (
        <div className="px-3 py-2 text-sm text-gray-400 italic">Sin resultados</div>
      )}
      <div
        role="button"
        onMouseDown={e => {
          e.preventDefault()
          e.stopPropagation()
          setAbierto(false)
          requestAnimationFrame(() => setModalAbierto(true))
        }}
        className="px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-b-lg cursor-pointer"
        style={{ backgroundColor: "#eef2ff", color: "#3730a3", borderTop: "2px solid #c7d2fe" }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>Buscar en todas las cuentas...</span>
      </div>
    </div>
  ) : null

  return (
    <>
      <div ref={refTrigger} className="flex-1">
        <div
          className="w-full px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-indigo-400 bg-white cursor-pointer flex items-center justify-between text-sm"
          onClick={abrirDropdown}
        >
          <span className={seleccionada ? "text-gray-900 font-mono text-xs" : "text-gray-400 text-sm"}>
            {seleccionada ? `${seleccionada.codigo} — ${seleccionada.nombre}` : "Buscar cuenta contable..."}
          </span>
          {seleccionada ? (
            <button
              type="button"
              className="text-gray-400 hover:text-red-500 ml-2"
              onClick={e => {
                e.stopPropagation()
                setSeleccionada(null)
                onChange("")
              }}
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {typeof document !== "undefined" && abierto && ReactDOM.createPortal(dropdown, document.body)}

      {modalAbierto && (
        <ModalCuentaContable
          cuentasPermitidas={cuentasPermitidas}
          onSelect={seleccionar}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  )
}

// =====================================================
// Helper para construir el ProveedorForm desde un proveedor existente
// (mismo mapeo que modulo-compras-v2.tsx setNuevoProveedor en "Editar")
// =====================================================
export function proveedorAForm(p: any): ProveedorForm {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre ?? p.razon_social ?? "",
    nombre_fantasia: p.nombre_fantasia ?? "",
    razon_social: p.razon_social ?? p.nombre ?? "",
    tipo_documento: p.tipo_documento ?? "CUIT",
    numero_documento: p.numero_documento ?? p.cuit ?? "",
    posicion_fiscal: p.posicion_fiscal ?? "Responsable Inscripto",
    categoria_proveedor: p.categoria_proveedor ?? "",
    celular: p.celular ?? p.telefono ?? "",
    email: p.email ?? "",
    calle_numero: p.calle_numero ?? p.direccion ?? "",
    ciudad: p.ciudad ?? "",
    provincia: p.provincia ?? "",
    pais: p.pais ?? "Argentina",
    codigo_postal: p.codigo_postal ?? "",
    cuit: p.cuit ?? "",
    tipo_documento_legacy: p.tipo_documento_legacy ?? p.tipo_documento ?? "CUIT",
    numero_documento_legacy: p.numero_documento_legacy ?? p.numero_documento ?? "",
    direccion: p.direccion ?? "",
    telefono: p.telefono ?? "",
    web: p.web ?? "",
    contacto_nombre: p.contacto_nombre ?? "",
    contacto_telefono: p.contacto_telefono ?? "",
    contacto_email: p.contacto_email ?? "",
    condicion_pago: p.condicion_pago ?? "Contado",
    moneda_habitual: p.moneda_habitual ?? "ARS",
    categoria: p.categoria ?? "publico",
    confidencial: p.confidencial ?? p.categoria === "privado",
    tipo: p.tipo ?? "nacional",
    activo: p.activo ?? true,
    contactos: p.contactos ?? [],
    sucursal_origen: p.sucursal_origen ?? "",
    moneda_defecto: p.moneda_defecto ?? p.moneda_habitual ?? "ARS",
    aplica_circuito_compras: p.aplica_circuito_compras ?? false,
    cuenta_gastos_defecto: p.cuenta_gastos_defecto ?? "",
    cuenta_gastos_defecto_codigo: p.cuenta_gastos_defecto_codigo ?? "",
    cuenta_gastos_defecto_nombre: p.cuenta_gastos_defecto_nombre ?? "",
    cuenta_analitica: p.cuenta_analitica ?? "",
    tipo_cotizacion_defecto: p.tipo_cotizacion_defecto ?? "",
    observaciones: p.observaciones ?? "",
  }
}

// =====================================================
// ProveedorFormulario — componente principal
// =====================================================
type TabForm = "contactos" | "ventas_compras" | "contabilidad" | "observaciones"

interface Props {
  /** null = crear, objeto = editar. */
  inicial: ProveedorForm | null
  /**
   * Callback opcional al guardar. Si NO se pasa, el componente igual hace la
   * llamada a guardarProveedor() internamente y luego ejecuta este callback.
   * El padre puede usarlo para refrescar lista o navegar.
   */
  onGuardar?: (proveedorGuardado: any) => void
  onCancelar: () => void
  /**
   * Cantidad actual de proveedores (para auto-generar el código en alta).
   * Si no se pasa, se usa Date.now() como fallback.
   */
  totalProveedoresParaCodigo?: number
}

export default function ProveedorFormulario({
  inicial,
  onGuardar,
  onCancelar,
  totalProveedoresParaCodigo,
}: Props) {
  const modoEdicion = inicial != null

  // Sucursales y monedas: vienen del ERPContext / fetch. Mantenemos el
  // mismo origen que el archivo monolítico.
  const { sucursales } = useERP()
  const SUCURSALES_LISTA = (sucursales ?? []).map(s => s.nombre)

  const [monedas, setMonedas] = useState<{ codigo: string; nombre: string }[]>([])
  useEffect(() => {
    fetch("/api/monedas", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMonedas(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [])

  // Categorías de proveedor — mismo flujo que modulo-compras-v2.tsx
  const [categoriasProveedor, setCategoriasProveedor] = useState<{ id: number; nombre: string }[]>([])
  useEffect(() => {
    getCategoriaProveedores()
      .then(rows => setCategoriasProveedor(rows.map(r => ({ id: r.id, nombre: r.nombre }))))
      .catch(console.error)
  }, [])
  const CATEGORIAS_PROVEEDOR = categoriasProveedor.map(c => c.nombre)

  // State del form (todo el form vive en este componente)
  const [prov, setProv] = useState<ProveedorForm>(inicial ?? proveedorFormVacio)
  const setP = (patch: Partial<ProveedorForm>) => setProv(prev => ({ ...prev, ...patch }))

  // Tab activo
  const [tabActivo, setTabActivo] = useState<TabForm>("contactos")

  // Confirmación confidencial
  const [confirmandoConfidencial, setConfirmandoConfidencial] = useState(false)

  // Estado de guardado
  const [provGuardando, setProvGuardando] = useState(false)
  const [provErrorGuardando, setProvErrorGuardando] = useState<string | null>(null)
  const [provGuardadoOk, setProvGuardadoOk] = useState(false)

  const handleGuardar = async () => {
    if (!(prov.nombre ?? "").trim()) return
    if (prov.tipo_documento !== "Sin documento" && !(prov.numero_documento ?? "").trim()) return

    setProvGuardando(true)
    setProvErrorGuardando(null)
    setProvGuardadoOk(false)

    const payload = {
      razon_social: prov.nombre,
      nombre_fantasia: prov.nombre_fantasia || null,
      cuit: prov.numero_documento || null,
      categoria: prov.categoria || "privado",
      tipo: prov.tipo || "nacional",
      posicion_fiscal: prov.posicion_fiscal || null,
      categoria_proveedor: prov.categoria_proveedor || null,
      email: prov.email || null,
      celular: prov.celular || null,
      telefono: prov.telefono || null,
      direccion: prov.calle_numero || prov.direccion || null,
      calle_numero: prov.calle_numero || null,
      ciudad: prov.ciudad || null,
      provincia: prov.provincia || null,
      pais: prov.pais || "Argentina",
      codigo_postal: prov.codigo_postal || null,
      condicion_pago: prov.condicion_pago || null,
      moneda_habitual: prov.moneda_habitual || "ARS",
      moneda_defecto: prov.moneda_defecto || prov.moneda_habitual || "ARS",
      estado: prov.activo ? "activo" : "inactivo",
      confidencial: prov.confidencial ?? false,
      sucursal_origen: prov.sucursal_origen || null,
      observaciones: prov.observaciones || null,
      aplica_circuito_compras: prov.aplica_circuito_compras ?? false,
      cuenta_gastos_defecto: prov.cuenta_gastos_defecto || null,
      cuenta_gastos_defecto_codigo: prov.cuenta_gastos_defecto_codigo || null,
      cuenta_gastos_defecto_nombre: prov.cuenta_gastos_defecto_nombre || null,
      cuenta_analitica: prov.cuenta_analitica || null,
      tipo_cotizacion_defecto: prov.tipo_cotizacion_defecto || null,
    }

    try {
      let result: any
      if (modoEdicion && inicial?.id) {
        const updated = await guardarProveedor(payload, inicial.id)
        result = { ...updated, nombre: updated.nombre ?? updated.razon_social ?? "" }
      } else {
        // El código se autogenera en el backend (POST /api/compras/proveedores).
        // Si el cliente manda codigo vacío, el backend busca el último PROV-XXX
        // y genera el siguiente, con retries si hay colisión (race condition o
        // huecos en la numeración).
        const created = await guardarProveedor({ ...payload, codigo: "", saldo: 0 })
        result = { ...created, nombre: created.nombre ?? created.razon_social ?? "" }
      }
      setProvGuardadoOk(true)
      onGuardar?.(result)
    } catch (err: any) {
      console.error("[v0] Error al guardar proveedor:", err.message)
      setProvErrorGuardando(err.message ?? "Error al guardar")
    } finally {
      setProvGuardando(false)
    }
  }

  const handleCancelar = () => {
    onCancelar()
  }

  const addContacto = () => {
    setP({
      contactos: [
        ...prov.contactos,
        { id: Date.now(), nombre: "", sector: "", puesto: "", telefono: "", email: "", observaciones: "" },
      ],
    })
  }

  const removeContacto = (id: number) => {
    setP({ contactos: prov.contactos.filter(c => c.id !== id) })
  }

  const updateContacto = (id: number, patch: Partial<ContactoProveedor>) => {
    setP({ contactos: prov.contactos.map(c => (c.id === id ? { ...c, ...patch } : c)) })
  }

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={handleCancelar} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {modoEdicion ? `Editando: ${inicial?.nombre}` : "Nuevo Proveedor"}
            </h1>
            <p className="text-sm text-gray-500">
              {modoEdicion ? inicial?.codigo : "Complete los datos del nuevo proveedor"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {provGuardadoOk && (
            <span className="text-sm text-green-700 font-medium">✓ Guardado correctamente</span>
          )}
          {provErrorGuardando && (
            <span
              className="text-sm text-red-600 font-medium max-w-xs truncate"
              title={provErrorGuardando}
            >
              Error: {provErrorGuardando}
            </span>
          )}
          <button
            onClick={handleCancelar}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            {modoEdicion ? "Volver" : "Cancelar"}
          </button>
          <button
            onClick={handleGuardar}
            disabled={
              provGuardando ||
              !(prov.nombre ?? "").trim() ||
              (prov.tipo_documento !== "Sin documento" && !(prov.numero_documento ?? "").trim())
            }
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {provGuardando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Crear Proveedor"}
          </button>
        </div>
      </div>

      {/* Cabecera del formulario */}
      <div className="bg-white rounded-lg border p-6 mb-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Razón Social / Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={prov.nombre}
                onChange={e => setP({ nombre: e.target.value, razon_social: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Razón social"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de Fantasía</label>
              <input
                type="text"
                value={prov.nombre_fantasia}
                onChange={e => setP({ nombre_fantasia: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre comercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <select
                  value={prov.tipo_documento}
                  onChange={e => setP({ tipo_documento: e.target.value as ProveedorForm["tipo_documento"] })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CUIT">CUIT</option>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Sin documento">Sin documento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Número {prov.tipo_documento !== "Sin documento" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={prov.numero_documento}
                  onChange={e => setP({ numero_documento: e.target.value, cuit: e.target.value })}
                  disabled={prov.tipo_documento === "Sin documento"}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder={prov.tipo_documento === "CUIT" ? "XX-XXXXXXXX-X" : ""}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Posición Fiscal</label>
              <select
                value={prov.posicion_fiscal}
                onChange={e =>
                  setP({ posicion_fiscal: e.target.value as ProveedorForm["posicion_fiscal"] })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributista">Monotributista</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="No responsable">No responsable</option>
                <option value="Exterior">Exterior</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoría de Proveedor</label>
              <select
                value={prov.categoria_proveedor}
                onChange={e => setP({ categoria_proveedor: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sin categoría --</option>
                {CATEGORIAS_PROVEEDOR.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Celular</label>
              <input
                type="text"
                value={prov.celular}
                onChange={e => setP({ celular: e.target.value, telefono: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+54 9 11 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={prov.email}
                onChange={e => setP({ email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@proveedor.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Calle y Número</label>
              <input
                type="text"
                value={prov.calle_numero}
                onChange={e => setP({ calle_numero: e.target.value, direccion: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Av. Ejemplo 1234"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
              <select
                value={prov.pais}
                onChange={e => setP({ pais: e.target.value, provincia: "", ciudad: "" })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAISES_LISTA.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provincia</label>
                {prov.pais === "Argentina" ? (
                  <select
                    value={prov.provincia}
                    onChange={e => setP({ provincia: e.target.value, ciudad: "" })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Seleccionar —</option>
                    {PROVINCIAS_AR.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={prov.provincia}
                    onChange={e => setP({ provincia: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ciudad</label>
                {(() => {
                  const ciudadesDisponibles = CIUDADES_POR_PROVINCIA[prov.provincia]
                  return ciudadesDisponibles ? (
                    <select
                      value={prov.ciudad}
                      onChange={e => setP({ ciudad: e.target.value })}
                      disabled={!prov.provincia}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">— Seleccionar —</option>
                      {ciudadesDisponibles.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={prov.ciudad}
                      onChange={e => setP({ ciudad: e.target.value })}
                      disabled={prov.pais === "Argentina" && !prov.provincia}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder={
                        prov.pais === "Argentina" && !prov.provincia ? "Seleccioná provincia primero" : ""
                      }
                    />
                  )
                })()}
              </div>
            </div>

            <div className="w-1/2 pr-1.5">
              <label className="block text-xs font-medium text-gray-700 mb-1">Código Postal</label>
              <input
                type="text"
                value={prov.codigo_postal}
                onChange={e => setP({ codigo_postal: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={prov.activo}
                  onChange={e => setP({ activo: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                Activo
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={prov.confidencial}
                  onChange={e => {
                    if (e.target.checked) {
                      setConfirmandoConfidencial(true)
                    } else {
                      setP({ confidencial: false, categoria: "publico" })
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-red-600"
                />
                Es confidencial
              </label>
            </div>

            {confirmandoConfidencial && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800 font-medium mb-2">
                  Este proveedor solo será visible para usuarios del grupo Proveedores Privados. ¿Confirmás?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setP({ confidencial: true, categoria: "privado" })
                      setConfirmandoConfidencial(false)
                    }}
                    className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmandoConfidencial(false)}
                    className="px-3 py-1 border text-xs rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {prov.confidencial && !confirmandoConfidencial && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                Proveedor confidencial — solo visible para usuarios autorizados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b">
          {[
            { id: "contactos", label: "Contactos" },
            { id: "ventas_compras", label: "Ventas & Compras" },
            { id: "contabilidad", label: "Contabilidad" },
            { id: "observaciones", label: "Observaciones" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id as TabForm)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tabActivo === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "contactos" && prov.contactos.length > 0 && (
                <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {prov.contactos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB: CONTACTOS */}
          {tabActivo === "contactos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Personas de contacto dentro de esta empresa</p>
                <button
                  onClick={addContacto}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" /> Agregar contacto
                </button>
              </div>

              {prov.contactos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                  Sin contactos registrados. Hacé clic en &quot;Agregar contacto&quot; para añadir uno.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 px-2">Nombre</th>
                        <th className="text-left py-2 px-2">Sector / Área</th>
                        <th className="text-left py-2 px-2">Puesto / Cargo</th>
                        <th className="text-left py-2 px-2">Teléfono</th>
                        <th className="text-left py-2 px-2">Email</th>
                        <th className="text-left py-2 px-2">Observaciones</th>
                        <th className="py-2 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prov.contactos.map(c => (
                        <tr key={c.id} className="border-b">
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={c.nombre}
                              onChange={e => updateContacto(c.id, { nombre: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Nombre"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={c.sector}
                              onChange={e => updateContacto(c.id, { sector: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Ventas"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={c.puesto}
                              onChange={e => updateContacto(c.id, { puesto: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Gerente"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={c.telefono}
                              onChange={e => updateContacto(c.id, { telefono: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="+54..."
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="email"
                              value={c.email}
                              onChange={e => updateContacto(c.id, { email: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="email@..."
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={c.observaciones}
                              onChange={e => updateContacto(c.id, { observaciones: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder=""
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <button
                              onClick={() => removeContacto(c.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: VENTAS & COMPRAS */}
          {tabActivo === "ventas_compras" && (
            <div className="grid grid-cols-2 gap-6 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal de Origen</label>
                <select
                  value={prov.sucursal_origen}
                  onChange={e => setP({ sucursal_origen: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Ninguna —</option>
                  {SUCURSALES_LISTA.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Moneda por Defecto</label>
                <select
                  value={prov.moneda_defecto}
                  onChange={e => setP({ moneda_defecto: e.target.value, moneda_habitual: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {monedas.map(m => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.codigo} - {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo de Cotización por Defecto
                </label>
                <select
                  value={prov.tipo_cotizacion_defecto}
                  onChange={e => setP({ tipo_cotizacion_defecto: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                >
                  <option value="">— Sin asignar —</option>
                  <option value="oficial">Dólar Oficial</option>
                  <option value="blue">Dólar Blue</option>
                  <option value="mep">Dólar MEP</option>
                </select>
                {(!prov.moneda_defecto || prov.moneda_defecto === "ARS") && (
                  <p className="text-xs text-gray-400 mt-1">
                    Relevante principalmente cuando la moneda por defecto es distinta de ARS.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB: CONTABILIDAD */}
          {tabActivo === "contabilidad" && (
            <div className="space-y-4 max-w-lg">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prov.aplica_circuito_compras}
                  onChange={e => setP({ aplica_circuito_compras: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Aplica circuito de compras
              </label>
              {prov.aplica_circuito_compras && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  Las facturas de este proveedor solo podrán imputar a la cuenta{" "}
                  <strong>PT en Tránsito (11050301)</strong>.
                </div>
              )}
              {!prov.aplica_circuito_compras && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cuenta de Gastos por Defecto
                  </label>
                  <CuentaContableSelector
                    value={prov.cuenta_gastos_defecto}
                    onChange={(id, codigo, nombre) =>
                      setP({
                        cuenta_gastos_defecto: id,
                        cuenta_gastos_defecto_codigo: codigo ?? "",
                        cuenta_gastos_defecto_nombre: nombre ?? "",
                      })
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cuenta Analítica para Compras
                </label>
                <input
                  type="text"
                  value={prov.cuenta_analitica}
                  onChange={e => setP({ cuenta_analitica: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
            </div>
          )}

          {/* TAB: OBSERVACIONES */}
          {tabActivo === "observaciones" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Notas internas sobre el proveedor
              </label>
              <textarea
                value={prov.observaciones}
                onChange={e => setP({ observaciones: e.target.value })}
                rows={6}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Notas internas. No se imprime ni se comparte."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
