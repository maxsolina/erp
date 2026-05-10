"use client"

// Form de creación de Ajuste de Stock (positivo o negativo).
//
// Para productos con número de serie:
//   * POSITIVO → wizard tipo recepción: una fila por unidad nueva, con campos
//     IMEI/color/batería/outlet/observaciones.
//   * NEGATIVO → selector de IMEIs disponibles del producto en ese depósito.
//
// Para productos sin serie: input simple de cantidad.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"

interface Producto {
  id: number
  nombre: string
  codigo_interno: string
  tiene_numero_serie: boolean
  requiere_color: boolean
  requiere_bateria: boolean
  requiere_outlet: boolean
  requiere_observaciones: boolean
  // Costos: si ambos son 0/null, NO se puede hacer ajuste positivo
  // (la línea del asiento contable quedaría sin valor).
  costo_contable?: number | null
  costo_manual?: number | null
}

// Determina el costo aplicable. Para ajuste positivo se requiere > 0.
function costoDelProducto(p: Producto | null): number {
  if (!p) return 0
  return Number(p.costo_contable ?? 0) || Number(p.costo_manual ?? 0) || 0
}
interface Deposito { id: number; codigo: string; nombre: string; sucursal_id?: number | null }
interface Ubicacion { id: number; deposito_id: number; codigo: string; nombre: string }
interface UnidadDisponible { id: number; nro_serie: string; color: string | null; bateria_pct: number | null }

// Lista de colores estándar — alineada con el wizard de recepción del monolito
// (components/modulo-compras-v2.tsx). Si en el futuro se crea la tabla
// `colores_producto`, conviene migrar a fetch.
const COLORES = [
  "Negro", "Blanco", "Azul", "Rojo", "Verde", "Amarillo",
  "Gris", "Plata", "Oro", "Morado", "Rosa", "Naranja",
] as const

interface UnidadNueva {
  // Para POSITIVO + IMEI
  nro_serie: string
  color: string
  bateria_pct: string
  es_outlet: boolean
  observaciones: string
}

interface LineaForm {
  key: string  // uid local del front
  producto: Producto | null
  // Sin serie: cantidad a granel
  cantidad: number
  // Con serie + POSITIVO: lista de unidades nuevas a crear
  unidadesNuevas: UnidadNueva[]
  // Con serie + NEGATIVO: lista de unidades existentes seleccionadas
  unidadesSeleccionadas: number[]  // ids de stock_unidades
  // Nota: el costo unitario no se edita acá. Lo toma el server desde
  // `productos.costo_ars` (último costo contable en ARS) al confirmar.
}

function uid() {
  return Math.random().toString(36).slice(2, 11)
}

export default function AjusteForm({ tipo }: { tipo: "positivo" | "negativo" }) {
  const router = useRouter()
  const titulo = tipo === "positivo" ? "Nuevo Ajuste Positivo" : "Nuevo Ajuste Negativo"
  const verbo = tipo === "positivo" ? "ingreso" : "baja"

  const [productos, setProductos] = useState<Producto[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])

  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0])
  const [depositoId, setDepositoId] = useState<number | null>(null)
  const [ubicacionId, setUbicacionId] = useState<number | null>(null)
  const [concepto, setConcepto] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [lineas, setLineas] = useState<LineaForm[]>([])

  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  // Modal: agregar producto
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/productos").then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/depositos").then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/ubicaciones").then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([prods, deps, ubis]) => {
      // Excluir servicios — los servicios no llevan stock, no aplican a ajustes.
      const filtrados = (Array.isArray(prods) ? prods : []).filter((p: any) => p.tipo !== "servicio")
      setProductos(filtrados)
      setDepositos(Array.isArray(deps) ? deps : [])
      setUbicaciones(Array.isArray(ubis) ? ubis : [])
    })
  }, [])

  const ubisDelDeposito = useMemo(
    () => ubicaciones.filter(u => u.deposito_id === depositoId),
    [ubicaciones, depositoId],
  )

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos.slice(0, 50)
    const q = busqueda.toLowerCase()
    return productos
      .filter(p => p.nombre.toLowerCase().includes(q) || p.codigo_interno.toLowerCase().includes(q))
      .slice(0, 50)
  }, [productos, busqueda])

  function agregarProducto(p: Producto) {
    const nueva: LineaForm = {
      key: uid(),
      producto: p,
      cantidad: 1,
      unidadesNuevas: p.tiene_numero_serie && tipo === "positivo"
        ? [{ nro_serie: "", color: "", bateria_pct: "", es_outlet: false, observaciones: "" }]
        : [],
      unidadesSeleccionadas: [],
    }
    setLineas(prev => [...prev, nueva])
    setModalAbierto(false)
    setBusqueda("")
  }

  function quitarLinea(key: string) {
    setLineas(prev => prev.filter(l => l.key !== key))
  }

  function actualizarLinea(key: string, patch: Partial<LineaForm>) {
    setLineas(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function agregarUnidadNueva(key: string) {
    setLineas(prev =>
      prev.map(l =>
        l.key === key
          ? { ...l, unidadesNuevas: [...l.unidadesNuevas, { nro_serie: "", color: "", bateria_pct: "", es_outlet: false, observaciones: "" }] }
          : l,
      ),
    )
  }

  function actualizarUnidadNueva(lineaKey: string, idx: number, patch: Partial<UnidadNueva>) {
    setLineas(prev =>
      prev.map(l =>
        l.key === lineaKey
          ? { ...l, unidadesNuevas: l.unidadesNuevas.map((u, i) => (i === idx ? { ...u, ...patch } : u)) }
          : l,
      ),
    )
  }

  function quitarUnidadNueva(lineaKey: string, idx: number) {
    setLineas(prev =>
      prev.map(l =>
        l.key === lineaKey
          ? { ...l, unidadesNuevas: l.unidadesNuevas.filter((_, i) => i !== idx) }
          : l,
      ),
    )
  }

  // Para NEGATIVO + IMEI: cargar las unidades disponibles cuando se agrega un producto
  const [unidadesPorProducto, setUnidadesPorProducto] = useState<Record<number, UnidadDisponible[]>>({})
  useEffect(() => {
    if (tipo !== "negativo") return
    const productosCargar = lineas
      .filter(l => l.producto?.tiene_numero_serie && !unidadesPorProducto[l.producto.id])
      .map(l => l.producto!.id)
    if (productosCargar.length === 0) return
    Promise.all(
      productosCargar.map(pid =>
        fetch(`/api/stock/unidades?producto_id=${pid}&estado=disponible${depositoId ? `&deposito_id=${depositoId}` : ""}`)
          .then(r => (r.ok ? r.json() : []))
          .then((arr: any[]) => ({ pid, arr: arr.map(u => ({ id: u.id, nro_serie: u.nro_serie ?? "", color: u.color, bateria_pct: u.bateria_pct })) }))
          .catch(() => ({ pid, arr: [] })),
      ),
    ).then(results => {
      setUnidadesPorProducto(prev => {
        const next = { ...prev }
        for (const r of results) next[r.pid] = r.arr
        return next
      })
    })
  }, [lineas, tipo, depositoId, unidadesPorProducto])

  // Validación pre-guardar
  const errores: string[] = []
  if (!depositoId) errores.push("Falta seleccionar depósito")
  if (!ubicacionId) errores.push("Falta seleccionar ubicación")
  if (lineas.length === 0) errores.push("Agregá al menos un producto")
  for (const l of lineas) {
    if (!l.producto) continue
    // Validación de costo para ajustes POSITIVOS — sin costo, el asiento
    // contable que se genera al confirmar no tendría valor (debe = haber = 0)
    // y la valuación de inventario quedaría rota.
    if (tipo === "positivo" && costoDelProducto(l.producto) <= 0) {
      errores.push(
        `${l.producto.nombre} no tiene costo contable cargado. ` +
        `No se puede hacer ajuste positivo sin costo. Andá a Productos → editar → Abastecimientos y cargá el costo antes de continuar.`
      )
    }
    if (l.producto.tiene_numero_serie) {
      if (tipo === "positivo") {
        if (l.unidadesNuevas.length === 0) errores.push(`${l.producto.nombre}: agregá al menos una unidad`)
        for (const u of l.unidadesNuevas) {
          if (!u.nro_serie.trim()) errores.push(`${l.producto.nombre}: falta IMEI/serie en una unidad`)
          if (l.producto.requiere_color && !u.color) errores.push(`${l.producto.nombre}: falta color en una unidad`)
          if (l.producto.requiere_bateria && !u.bateria_pct) errores.push(`${l.producto.nombre}: falta batería en una unidad`)
        }
      } else {
        if (l.unidadesSeleccionadas.length === 0) errores.push(`${l.producto.nombre}: seleccioná al menos una unidad a dar de baja`)
      }
    } else {
      if (l.cantidad <= 0) errores.push(`${l.producto.nombre}: cantidad debe ser > 0`)
    }
  }

  async function guardar(opciones: { solicitarAprobacion: boolean }) {
    setErrorGuardar(null)
    if (errores.length > 0) {
      setErrorGuardar(errores[0])
      return
    }
    setGuardando(true)
    try {
      // Aplanar líneas: una línea por unidad (positivo IMEI) o por unidad seleccionada (negativo IMEI)
      const lineasPayload: any[] = []
      for (const l of lineas) {
        if (!l.producto) continue
        const base = {
          producto_id: l.producto.id,
          producto_nombre: l.producto.nombre,
          producto_codigo: l.producto.codigo_interno,
        }
        if (l.producto.tiene_numero_serie) {
          if (tipo === "positivo") {
            for (const u of l.unidadesNuevas) {
              lineasPayload.push({
                ...base,
                cantidad: 1,
                nro_serie: u.nro_serie.trim(),
                color: u.color || null,
                bateria_pct: u.bateria_pct ? Number(u.bateria_pct) : null,
                es_outlet: u.es_outlet,
                observaciones: u.observaciones || null,
              })
            }
          } else {
            const disponibles = unidadesPorProducto[l.producto.id] ?? []
            for (const id of l.unidadesSeleccionadas) {
              const u = disponibles.find(d => d.id === id)
              if (!u) continue
              lineasPayload.push({
                ...base,
                cantidad: 1,
                stock_unidad_id: id,
                nro_serie: u.nro_serie,
                color: u.color,
                bateria_pct: u.bateria_pct,
              })
            }
          }
        } else {
          lineasPayload.push({ ...base, cantidad: l.cantidad })
        }
      }

      const dep = depositos.find(d => d.id === depositoId)
      const ubi = ubicaciones.find(u => u.id === ubicacionId)
      const payload = {
        tipo,
        fecha,
        deposito_id: depositoId,
        deposito_nombre: dep?.nombre,
        ubicacion_id: ubicacionId,
        ubicacion_nombre: ubi?.nombre,
        sucursal_id: dep?.sucursal_id ?? null,
        concepto,
        observaciones,
        lineas: lineasPayload,
      }
      const res = await fetch("/api/stock/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorGuardar(data?.error ?? `HTTP ${res.status}`)
        return
      }
      // Si pidió enviarlo a aprobación en un solo click, hacemos la transición
      // borrador → pendiente acá antes de redirigir a la ficha.
      if (opciones.solicitarAprobacion) {
        const r2 = await fetch(`/api/stock/ajustes/${data.id}/solicitar-aprobacion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
        if (!r2.ok) {
          const d2 = await r2.json().catch(() => ({}))
          setErrorGuardar(`Borrador creado pero falló al enviar a aprobar: ${d2?.error ?? r2.status}`)
          router.push(`/stock/ajustes/${tipo}s/${data.id}`)
          return
        }
      }
      router.push(`/stock/ajustes/${tipo}s/${data.id}`)
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "Error de red")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push(`/stock/ajustes/${tipo}s`)} variant="ghost" />
          <h1 className="text-2xl font-bold text-amber-900">{titulo}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/stock/ajustes/${tipo}s`)}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando || errores.length > 0}
            onClick={() => guardar({ solicitarAprobacion: false })}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={errores.length > 0 ? errores[0] : "Guardar como borrador para seguir editando luego"}
          >
            {guardando ? "Guardando…" : "Guardar borrador"}
          </button>
          <button
            type="button"
            disabled={guardando || errores.length > 0}
            onClick={() => guardar({ solicitarAprobacion: true })}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={errores.length > 0 ? errores[0] : "Crea el ajuste y lo envía a aprobación en un solo paso"}
          >
            {guardando ? "Guardando…" : "Solicitar aprobación"}
          </button>
        </div>
      </div>

      {errorGuardar && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {errorGuardar}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">Datos del ajuste</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depósito *</label>
            <select
              value={depositoId ?? ""}
              onChange={e => {
                const nuevoDep = e.target.value ? Number(e.target.value) : null
                setDepositoId(nuevoDep)
                setUbicacionId(null)
                // Si cambia el depósito y había productos con IMEI seleccionados (negativo), limpiar selecciones
                if (tipo === "negativo") {
                  setUnidadesPorProducto({})
                  setLineas(prev => prev.map(l => ({ ...l, unidadesSeleccionadas: [] })))
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {depositos.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ubicación *</label>
            <select
              value={ubicacionId ?? ""}
              onChange={e => setUbicacionId(e.target.value ? Number(e.target.value) : null)}
              disabled={!depositoId}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Seleccionar…</option>
              {ubisDelDeposito.map(u => (
                <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Motivo del ajuste (rotura, faltante de inventario, etc.)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900">Productos a {verbo}</h3>
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Agregar producto
          </button>
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">
            No hay productos. Hacé click en "Agregar producto" para empezar.
          </p>
        ) : (
          <div className="space-y-3">
            {lineas.map(l => (
              <LineaCard
                key={l.key}
                tipo={tipo}
                linea={l}
                unidadesDisponibles={
                  l.producto && tipo === "negativo"
                    ? unidadesPorProducto[l.producto.id] ?? []
                    : []
                }
                onUpdate={patch => actualizarLinea(l.key, patch)}
                onAgregarUnidad={() => agregarUnidadNueva(l.key)}
                onActualizarUnidad={(idx, patch) => actualizarUnidadNueva(l.key, idx, patch)}
                onQuitarUnidad={idx => quitarUnidadNueva(l.key, idx)}
                onQuitar={() => quitarLinea(l.key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de selección de producto */}
      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <header className="px-5 py-3 border-b">
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre o código…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </header>
            <div className="flex-1 overflow-auto">
              {productosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin resultados</p>
              ) : (
                <ul className="divide-y">
                  {productosFiltrados.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => agregarProducto(p)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                          <div className="text-xs text-gray-500 font-mono">{p.codigo_interno}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.tiene_numero_serie ? "con IMEI" : "sin serie"}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card por línea ─────────────────────────────────────────────────────────
function LineaCard({
  tipo,
  linea,
  unidadesDisponibles,
  onUpdate,
  onAgregarUnidad,
  onActualizarUnidad,
  onQuitarUnidad,
  onQuitar,
}: {
  tipo: "positivo" | "negativo"
  linea: LineaForm
  unidadesDisponibles: UnidadDisponible[]
  onUpdate: (patch: Partial<LineaForm>) => void
  onAgregarUnidad: () => void
  onActualizarUnidad: (idx: number, patch: Partial<UnidadNueva>) => void
  onQuitarUnidad: (idx: number) => void
  onQuitar: () => void
}) {
  const p = linea.producto
  if (!p) return null
  const conIMEI = p.tiene_numero_serie
  const costo = costoDelProducto(p)
  const sinCosto = tipo === "positivo" && costo <= 0

  return (
    <div className={`border rounded-lg p-4 ${sinCosto ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-medium text-gray-900">{p.nombre}</div>
          <div className="text-xs text-gray-500 font-mono">{p.codigo_interno}</div>
          {tipo === "positivo" && (
            <div className="text-xs mt-0.5">
              <span className="text-gray-500">Costo contable: </span>
              {costo > 0 ? (
                <span className="text-gray-700 font-medium">${costo.toLocaleString("es-AR")}</span>
              ) : (
                <span className="text-red-700 font-semibold">No definido</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onQuitar}
          className="text-red-500 hover:text-red-700 p-1"
          title="Quitar producto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {sinCosto && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3 flex items-start gap-2">
          <span className="text-red-700 text-base leading-none mt-0.5">⚠</span>
          <div className="text-xs text-red-800">
            <p className="font-semibold mb-0.5">Sin costo contable — no se puede hacer ajuste positivo</p>
            <p>
              El asiento contable de ingreso necesita un valor. Andá a{" "}
              <strong>Productos → editar → pestaña Abastecimientos</strong> y cargá el costo
              antes de continuar.
            </p>
          </div>
        </div>
      )}

      {!conIMEI && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
          <input
            type="number"
            min={1}
            value={linea.cantidad}
            onChange={e => onUpdate({ cantidad: Number(e.target.value) })}
            className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
      )}

      {conIMEI && tipo === "positivo" && (
        <div>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 uppercase">Unidades a ingresar</span>
            <button
              type="button"
              onClick={onAgregarUnidad}
              className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Agregar unidad
            </button>
          </div>
          <div className="space-y-2">
            {linea.unidadesNuevas.map((u, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded">
                <input
                  type="text"
                  placeholder="IMEI / Serie *"
                  required
                  value={u.nro_serie}
                  onChange={e => onActualizarUnidad(idx, { nro_serie: e.target.value })}
                  className={`col-span-3 border rounded px-2 py-1 text-xs font-mono ${
                    !u.nro_serie.trim() ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {p.requiere_color && (
                  <select
                    value={u.color}
                    onChange={e => onActualizarUnidad(idx, { color: e.target.value })}
                    className={`col-span-2 border rounded px-2 py-1 text-xs ${
                      !u.color ? "border-red-300 text-gray-400" : "border-gray-300"
                    }`}
                  >
                    <option value="">Color *</option>
                    {COLORES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                {p.requiere_bateria && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    placeholder="Bat % *"
                    value={u.bateria_pct}
                    onChange={e => onActualizarUnidad(idx, { bateria_pct: e.target.value })}
                    className={`col-span-2 border rounded px-2 py-1 text-xs ${
                      !u.bateria_pct ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                )}
                {p.requiere_outlet && (
                  <label className="col-span-1 flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={u.es_outlet}
                      onChange={e => onActualizarUnidad(idx, { es_outlet: e.target.checked })}
                    />
                    Outlet
                  </label>
                )}
                {p.requiere_observaciones && (
                  <input
                    type="text"
                    placeholder="Obs."
                    value={u.observaciones}
                    onChange={e => onActualizarUnidad(idx, { observaciones: e.target.value })}
                    className="col-span-3 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onQuitarUnidad(idx)}
                  className="col-span-1 text-red-500 hover:text-red-700 text-xs justify-self-end"
                  title="Quitar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {conIMEI && tipo === "negativo" && (
        <div>
          <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">
            Unidades a dar de baja ({unidadesDisponibles.length} disponibles)
          </span>
          {unidadesDisponibles.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No hay unidades disponibles de este producto en el depósito seleccionado.
            </p>
          ) : (
            <div className="border border-gray-200 rounded max-h-60 overflow-auto">
              {unidadesDisponibles.map(u => {
                const checked = linea.unidadesSeleccionadas.includes(u.id)
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${checked ? "bg-amber-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const nueva = e.target.checked
                          ? [...linea.unidadesSeleccionadas, u.id]
                          : linea.unidadesSeleccionadas.filter(x => x !== u.id)
                        onUpdate({ unidadesSeleccionadas: nueva })
                      }}
                    />
                    <span className="font-mono text-xs text-amber-700 flex-1">{u.nro_serie}</span>
                    {u.color && <span className="text-xs text-gray-600">{u.color}</span>}
                    {u.bateria_pct != null && (
                      <span className="text-xs text-gray-500">{u.bateria_pct}%</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
