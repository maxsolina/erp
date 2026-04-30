"use client"

// Listado de Órdenes de Trabajo + modal Asignador.
// Extraído de components/modulo-taller.tsx → renderOrdenes (~521-583)
// y renderModalAsignador (~1298-1361).

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, RefreshCw } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import {
  ejecutarAsignador,
  fetchOrdenes,
  fetchTecnicos,
  type TallerOrdenTrabajo,
  type TallerTecnico,
} from "@/lib/taller-actions"
import { getBadgeClass, getEstadoLabel } from "./_shared"

export default function OtListado() {
  const [ordenes, setOrdenes] = useState<TallerOrdenTrabajo[]>([])
  const [tecnicos, setTecnicos] = useState<TallerTecnico[]>([])
  const [cargando, setCargando] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const [showAsignador, setShowAsignador] = useState(false)

  const recargar = async () => {
    try {
      const ords = await fetchOrdenes()
      setOrdenes(Array.isArray(ords) ? ords : [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    let cancelado = false
    Promise.all([fetchOrdenes(), fetchTecnicos()])
      .then(([ords, tecs]) => {
        if (cancelado) return
        setOrdenes(Array.isArray(ords) ? ords : [])
        setTecnicos(Array.isArray(tecs) ? tecs : [])
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const ordenesFiltradas = useMemo(() => {
    let result = ordenes
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        o =>
          o.numero?.toLowerCase().includes(q) ||
          o.taller_equipos?.nombre?.toLowerCase().includes(q) ||
          o.taller_fallas?.nombre?.toLowerCase().includes(q) ||
          o.taller_tecnicos?.nombre?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(o => {
        if (f.field === "estado") return o.estado === f.value
        if (f.field === "area") return o.taller_areas_reparacion?.nombre === f.value
        if (f.field === "tecnico") return (o.taller_tecnicos?.nombre ?? "Sin asignar") === f.value
        if (f.field === "tipo_ot") return o.taller_tipos_ot?.nombre === f.value
        if (f.field === "equipo") return o.taller_equipos?.nombre === f.value
        return true
      })
    }
    return result
  }, [ordenes, searchQuery, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(ordenes.map(o => o.estado))]
    const areasOp = [...new Set(ordenes.map(o => o.taller_areas_reparacion?.nombre).filter(Boolean))] as string[]
    const tecnicosOp = [...new Set(ordenes.map(o => o.taller_tecnicos?.nombre ?? "Sin asignar"))]
    const tiposOtOp = [...new Set(ordenes.map(o => o.taller_tipos_ot?.nombre).filter(Boolean))] as string[]
    const equiposOp = [...new Set(ordenes.map(o => o.taller_equipos?.nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoLabel(e) })) },
      { field: "area", label: "Área", values: areasOp.map(a => ({ value: a, label: a })) },
      { field: "tecnico", label: "Técnico", values: tecnicosOp.map(t => ({ value: t, label: t })) },
      { field: "tipo_ot", label: "Tipo OT", values: tiposOtOp.map(t => ({ value: t, label: t })) },
      { field: "equipo", label: "Equipo", values: equiposOp.map(e => ({ value: e, label: e })) },
    ]
  }, [ordenes])

  const groupByOptions: GroupByOption[] = [
    { id: "estado", label: "Estado", field: "estado" },
    { id: "area", label: "Área", field: "area" },
    { id: "tecnico", label: "Técnico", field: "tecnico" },
    { id: "tipo_ot", label: "Tipo OT", field: "tipo_ot" },
    { id: "equipo", label: "Equipo", field: "equipo" },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Órdenes de Trabajo</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAsignador(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
          >
            <RefreshCw className="w-4 h-4" /> Asignador
          </button>
          <Link
            href="/servicio-tecnico/ot/nueva"
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"
          >
            <Plus className="w-4 h-4" /> Nueva OT
          </Link>
        </div>
      </div>

      <OdooFilterBar
        moduleName="taller_ordenes"
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={searchQuery}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearchQuery}
        savedFilters={savedFilters}
        onSaveFilter={f =>
          setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])
        }
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={ordenes.length}
        filteredCount={ordenesFiltradas.length}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Número", "Fecha", "Cliente", "Equipo", "Falla", "Estado", "Técnico", "Presupuesto"].map(h => (
                <th key={h} className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando &&
              ordenesFiltradas.map(ot => {
                const href = `/servicio-tecnico/ot/${ot.id}`
                return (
                  <tr key={ot.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm font-medium text-indigo-600">
                        {ot.numero}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-500">
                        {ot.fecha_creacion?.split("T")[0]}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-700">
                        {ot.cliente_id}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-700">
                        {ot.taller_equipos?.nombre}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-700">
                        {ot.taller_fallas?.nombre}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeClass(ot.estado)}`}>
                          {getEstadoLabel(ot.estado)}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-700">
                        {ot.taller_tecnicos?.nombre ?? "—"}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={href} className="block px-4 py-3 text-sm text-gray-700 text-right">
                        {ot.presupuesto_estimado ? `$${Number(ot.presupuesto_estimado).toLocaleString()}` : "—"}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            {!cargando && ordenesFiltradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No se encontraron órdenes de trabajo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAsignador && (
        <ModalAsignador
          tecnicos={tecnicos}
          onClose={() => setShowAsignador(false)}
          onAplicado={recargar}
        />
      )}
    </div>
  )
}

function ModalAsignador({
  tecnicos,
  onClose,
  onAplicado,
}: {
  tecnicos: TallerTecnico[]
  onClose: () => void
  onAplicado: () => void
}) {
  const [tecSeleccionados, setTecSeleccionados] = useState<string[]>(
    tecnicos.filter(t => t.activo).map(t => t.id),
  )
  const [tope, setTope] = useState(4)
  const [resultado, setResultado] = useState<{
    asignadas: number
    detalle: { ot_numero: string; tecnico_nombre: string }[]
  } | null>(null)
  const [running, setRunning] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Asignador Automático de Técnicos</h3>

        {!resultado ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Técnicos a incluir:</label>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                {tecnicos
                  .filter(t => t.activo)
                  .map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={tecSeleccionados.includes(t.id)}
                        onChange={e =>
                          setTecSeleccionados(prev =>
                            e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id),
                          )
                        }
                      />
                      {t.nombre} ({t.tipo})
                    </label>
                  ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tope de OTs por técnico:</label>
              <input
                type="number"
                value={tope}
                onChange={e => setTope(Number(e.target.value))}
                className="border rounded px-3 py-2 text-sm w-24"
                min={1}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 border rounded text-sm">
                Cerrar
              </button>
              <button
                onClick={async () => {
                  setRunning(true)
                  try {
                    const res = await ejecutarAsignador({
                      tecnico_ids: tecSeleccionados,
                      tope_por_tecnico: tope,
                      usuario: "Admin",
                    })
                    setResultado(res)
                    await onAplicado()
                  } catch (err) {
                    alert((err as Error).message)
                  } finally {
                    setRunning(false)
                  }
                }}
                disabled={running}
                className="px-4 py-2 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-50"
              >
                {running ? "Ejecutando..." : "Ejecutar Asignación"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-3">
              Se asignaron <strong>{resultado.asignadas}</strong> órdenes:
            </p>
            <div className="max-h-60 overflow-y-auto border rounded p-2 mb-4">
              {resultado.detalle.map((d, i) => (
                <div key={i} className="text-sm py-1 border-b last:border-0">
                  <span className="font-medium text-indigo-600">{d.ot_numero}</span> → {d.tecnico_nombre}
                </div>
              ))}
              {resultado.asignadas === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No había OTs sin asignar o técnicos disponibles
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  onClose()
                  setResultado(null)
                }}
                className="px-4 py-2 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
