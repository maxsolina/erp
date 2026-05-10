"use client"

// Extraído de components/ventas-module.tsx → renderTomaEquipo (~8025-8152).
// Mismas stats + tabla. Filas y botón "Nueva Toma" ahora son <Link>.

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { formatCurrency, type TomaEquipo } from "./_shared"

export default function TomaEquipoListado() {
  const [tomasEquipo, setTomasEquipo] = useState<TomaEquipo[]>([])

  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/tomas-equipo")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTomasEquipo(data)
      })
      .catch(console.error)
  }, [])

  const searchFields: (keyof TomaEquipo)[] = ["numero", "cliente_nombre", "modelo_equipo"]
  const filterFields: { field: keyof TomaEquipo; label: string }[] = [
    { field: "estado", label: "Estado" },
    { field: "estado_recepcion", label: "Recepción" },
  ]

  const filtered = useMemo(() => {
    let result = [...tomasEquipo]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String(row[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field as keyof TomaEquipo] ?? "") === f.value)
    }
    return result
  }, [tomasEquipo, search, activeFilters])

  const filterOptions = useMemo(
    () =>
      filterFields
        .map(ff => {
          const vals = [
            ...new Set(
              tomasEquipo
                .map(row => String(row[ff.field] ?? ""))
                .filter(v => v && v !== "null" && v !== "undefined"),
            ),
          ]
          return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
        })
        .filter(f => f.values.length > 0),
    [tomasEquipo],
  )

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({
    id: String(ff.field),
    label: ff.label,
    field: String(ff.field),
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Toma de Equipo en Parte de Pago</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestione las tomas de equipos usados como parte de pago</p>
        </div>
        <Link
          href="/toma-equipo/nueva"
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva Toma
        </Link>
      </div>

      <OdooFilterBar
        moduleName="tomas_equipo"
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f =>
          setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])
        }
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={tomasEquipo.length}
        filteredCount={filtered.length}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 mt-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Operaciones</p>
          <p className="text-2xl font-bold text-gray-900">{tomasEquipo.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Confirmadas</p>
          <p className="text-2xl font-bold text-emerald-600">
            {tomasEquipo.filter(t => t.estado === "confirmado").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Valor Total Tomado</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(tomasEquipo.reduce((s, t) => s + Number(t.precio_final), 0))}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Promedio Descuento</p>
          <p className="text-2xl font-bold text-orange-600">
            {tomasEquipo.length > 0
              ? Math.round(
                  tomasEquipo.reduce(
                    (s, t) => s + (Number(t.precio_base) > 0 ? (Number(t.descuentos) / Number(t.precio_base)) * 100 : 0),
                    0,
                  ) / tomasEquipo.length,
                )
              : 0}%
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Número</th>
              <th className="text-left py-3 px-4">Fecha y Hora</th>
              <th className="text-left py-3 px-4">Cliente</th>
              <th className="text-left py-3 px-4">Equipo</th>
              <th className="text-right py-3 px-4">Precio Base</th>
              <th className="text-right py-3 px-4">Descuentos</th>
              <th className="text-right py-3 px-4">Precio Final</th>
              <th className="text-center py-3 px-4">Operación</th>
              <th className="text-center py-3 px-4">Recepción</th>
              <th className="text-center py-3 px-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-sm text-gray-400">
                  No hay tomas de equipo registradas
                </td>
              </tr>
            )}
            {filtered.map(toma => {
              const fechaObj = new Date(toma.fecha)
              const fecha = fechaObj.toLocaleDateString("es-AR")
              const hora = fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
              const operacionEnCurso =
                toma.estado !== "cancelado" &&
                toma.estado_recepcion !== "recibido" &&
                toma.estado_recepcion !== "cancelado"
              const href = `/toma-equipo/${toma.id}`
              return (
                <tr key={toma.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 font-medium text-emerald-700">
                      {toma.numero}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">
                      <span>{fecha}</span>
                      <span className="text-gray-400 ml-1">{hora}</span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">{toma.cliente_nombre}</Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">{toma.modelo_equipo}</Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm text-right">
                      {formatCurrency(Number(toma.precio_base))}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm text-right text-red-600">
                      -{formatCurrency(Number(toma.descuentos))}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm text-right font-semibold text-emerald-600">
                      {formatCurrency(Number(toma.precio_final))}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          toma.estado === "cancelado"
                            ? "bg-red-100 text-red-700"
                            : operacionEnCurso
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {toma.estado === "cancelado" ? "Cancelada" : operacionEnCurso ? "En curso" : "Finalizada"}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          toma.estado_recepcion === "recibido"
                            ? "bg-green-100 text-green-700"
                            : toma.estado_recepcion === "cancelado"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {toma.estado_recepcion === "recibido"
                          ? "Recibido"
                          : toma.estado_recepcion === "cancelado"
                          ? "Cancelado"
                          : "Pendiente"}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          toma.estado === "confirmado"
                            ? "bg-green-100 text-green-700"
                            : toma.estado === "borrador"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {toma.estado.charAt(0).toUpperCase() + toma.estado.slice(1)}
                      </span>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
