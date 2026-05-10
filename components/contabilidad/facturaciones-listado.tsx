"use client"

// Listado tipo conciliación bancaria para Facturaciones ARCA.
//
// Trae las facturas con IVA todavía no marcadas como facturadas externamente
// (vía facturador masivo de AFIP/ARCA). El operador:
//   1. Exporta a Excel, lo sube a ARCA.
//   2. Vuelve y tilda las que ya facturó.
//   3. Click en "Marcar facturadas" → desaparecen de la lista, pasan al
//      estado "facturado" persistido en la columna `facturas.arca_facturada`.
//
// Trae OdooFilterBar (filtros + agrupaciones + favoritos) — entre otros, una
// agrupación "Mes" derivada de la fecha (YYYY-MM con label "Abril 2026").

import { useEffect, useMemo, useState } from "react"
import { Download, CheckCircle2, FileText, ChevronDown, ChevronRight } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"

interface FacturaPendiente {
  id: number
  numero: string
  fecha: string
  estado: string
  cliente_id: number | null
  cliente_nombre: string
  cliente_codigo: string | null
  cliente_tipo_documento: string | null
  cliente_numero_documento: string | null
  cliente_condicion_iva: string | null
  moneda: string
  cotizacion: number | null
  subtotal: number
  impuestos: number
  total: number
  tasa_iva: number | null
  forma_pago: string
  arca_facturada: boolean
  arca_facturada_at: string | null
  arca_facturada_por: string | null
  lineas: Array<{
    producto_nombre: string | null
    cantidad: number
    subtotal: number
    iva: number
  }>
}

// Versión enriquecida con campos derivados para filtros / agrupaciones que
// no son columnas reales (mes a partir de fecha, label de tasa IVA, etc.).
type FacturaConDerivados = FacturaPendiente & {
  /** Clave para agrupar por mes: "2026-04" — ordenable como string. */
  mes_key: string
  /** Label legible para mostrar al operador: "Abril 2026". */
  mes_label: string
  /** Label de tasa para filtro: "21%", "10.5%", "0%", "Mix". */
  tasa_label: string
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const fmtCurrency = (n: number) =>
  Number(n ?? 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR")
}

function enriquecer(f: FacturaPendiente): FacturaConDerivados {
  const d = new Date(f.fecha)
  let mes_key = "9999-99", mes_label = "Sin fecha"
  if (!isNaN(d.getTime())) {
    const año = d.getFullYear()
    const mes = d.getMonth()
    mes_key = `${año}-${String(mes + 1).padStart(2, "0")}`
    mes_label = `${MESES[mes]} ${año}`
  }
  const tasa_label = f.tasa_iva == null ? "Mix" : `${f.tasa_iva}%`
  return { ...f, mes_key, mes_label, tasa_label }
}

export default function FacturacionesListado() {
  const [tab, setTab] = useState<"pendientes" | "historial">("pendientes")
  const [facturas, setFacturas] = useState<FacturaPendiente[]>([])
  const [historial, setHistorial] = useState<FacturaPendiente[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [marcando, setMarcando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado del OdooFilterBar
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [gruposColapsados, setGruposColapsados] = useState<Set<string>>(new Set())

  const cargar = () => {
    setCargando(true)
    setError(null)
    Promise.all([
      fetch("/api/facturaciones-arca").then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/facturaciones-arca?historial=1").then(r => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([pend, hist]) => {
        setFacturas(Array.isArray(pend) ? pend : [])
        setHistorial(Array.isArray(hist) ? hist : [])
        setSeleccionadas(new Set())
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Error de red")
        setFacturas([])
        setHistorial([])
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const dataset = tab === "pendientes" ? facturas : historial

  // Enriquecemos las facturas con los campos derivados (mes_key, mes_label,
  // tasa_label) ANTES de filtrar/agrupar para que estén disponibles para
  // OdooFilterBar.
  const datasetEnriquecido = useMemo<FacturaConDerivados[]>(
    () => dataset.map(enriquecer),
    [dataset],
  )

  // Filtros disponibles — derivados del propio dataset (Odoo style: solo
  // muestra valores que efectivamente aparecen en los datos).
  const filterOptions = useMemo(() => {
    const condIva     = [...new Set(datasetEnriquecido.map(f => f.cliente_condicion_iva).filter(Boolean) as string[])]
    const tasas       = [...new Set(datasetEnriquecido.map(f => f.tasa_label))]
    const formasPago  = [...new Set(datasetEnriquecido.map(f => f.forma_pago).filter(Boolean))]
    const meses       = [...new Set(datasetEnriquecido.map(f => f.mes_key))]
      .sort((a, b) => b.localeCompare(a)) // más recientes primero
    const monedas     = [...new Set(datasetEnriquecido.map(f => f.moneda).filter(Boolean))]
    const opts = [
      {
        field: "mes_key",
        label: "Mes",
        // Mostramos el label legible pero filtramos por la key estable.
        values: meses.map(k => {
          const ej = datasetEnriquecido.find(f => f.mes_key === k)
          return { value: k, label: ej?.mes_label ?? k }
        }),
      },
      { field: "cliente_condicion_iva", label: "Cond. IVA",   values: condIva.map(v => ({ value: v, label: v })) },
      { field: "tasa_label",            label: "Tasa IVA",     values: tasas.map(v => ({ value: v, label: v })) },
      { field: "forma_pago",            label: "Forma de pago", values: formasPago.map(v => ({ value: v, label: v })) },
      { field: "moneda",                label: "Moneda",        values: monedas.map(v => ({ value: v, label: v })) },
    ]
    return opts.filter(o => o.values.length > 0)
  }, [datasetEnriquecido])

  // Agrupaciones disponibles. Usamos `mes_key` como el campo de agrupación
  // — es la clave estable; en el render usamos el label legible.
  const groupByOptions: GroupByOption[] = [
    { id: "mes_key",                label: "Mes",          field: "mes_key" },
    { id: "cliente_nombre",         label: "Cliente",      field: "cliente_nombre" },
    { id: "cliente_condicion_iva",  label: "Cond. IVA",    field: "cliente_condicion_iva" },
    { id: "tasa_label",             label: "Tasa IVA",     field: "tasa_label" },
    { id: "forma_pago",             label: "Forma de pago", field: "forma_pago" },
  ]

  // Aplicación de filtros + búsqueda
  const filtradas = useMemo(() => {
    let result = datasetEnriquecido
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(f =>
        f.numero.toLowerCase().includes(q) ||
        f.cliente_nombre.toLowerCase().includes(q) ||
        (f.cliente_numero_documento ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(row => String((row as any)[f.field] ?? "") === f.value)
    }
    return result
  }, [datasetEnriquecido, search, activeFilters])

  // Agrupación: si hay una groupBy activa, partimos las filas en secciones.
  // Siempre tomamos solo la primera (no soportamos multi-nivel acá).
  const grupos = useMemo(() => {
    if (activeGroupBy.length === 0) return null
    const gb = activeGroupBy[0]
    const map = new Map<string, FacturaConDerivados[]>()
    for (const f of filtradas) {
      const key = String((f as any)[gb.field] ?? "—")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    }
    // Ordenamiento: si es por mes, descendente (más reciente primero).
    // Sino, alfabético.
    const entries = Array.from(map.entries())
    if (gb.field === "mes_key") {
      entries.sort((a, b) => b[0].localeCompare(a[0]))
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]))
    }
    return { campo: gb, secciones: entries }
  }, [filtradas, activeGroupBy])

  // Para grupos por mes mostramos label legible ("Abril 2026") en lugar de
  // la key (que es "2026-04").
  const labelDeGrupo = (campo: string, key: string): string => {
    if (campo === "mes_key") {
      const ej = datasetEnriquecido.find(f => f.mes_key === key)
      return ej?.mes_label ?? key
    }
    return key || "—"
  }

  const totalSeleccionadas = useMemo(() => {
    return facturas
      .filter(f => seleccionadas.has(f.id))
      .reduce((s, f) => s + f.total, 0)
  }, [facturas, seleccionadas])

  function toggleSelect(id: number) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    if (seleccionadas.size === filtradas.length) setSeleccionadas(new Set())
    else setSeleccionadas(new Set(filtradas.map(f => f.id)))
  }
  function toggleGrupo(key: string) {
    setGruposColapsados(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function marcarFacturadas() {
    if (seleccionadas.size === 0) return
    if (!confirm(`Marcar ${seleccionadas.size} factura(s) como facturadas en ARCA?\n\nDesaparecerán del listado.`)) return
    setMarcando(true)
    try {
      const res = await fetch("/api/facturaciones-arca/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`)
        return
      }
      cargar()
    } finally {
      setMarcando(false)
    }
  }

  function exportarExcel() {
    const filas = facturas.filter(f => seleccionadas.has(f.id))
    const set = filas.length > 0 ? filas : facturas
    if (set.length === 0) return

    // CSV con BOM (para que Excel respete acentos) y separador `;` (locale AR).
    const headers = [
      "Fecha",
      "Tipo",
      "N° interno ERP",
      "Tipo doc cliente",
      "Doc cliente",
      "Razón social",
      "Condición IVA cliente",
      "Tasa IVA productos",
      "Neto gravado",
      "IVA",
      "Total",
      "Forma de pago (parte blanca)",
    ]
    const rows = set.map(f => [
      fmtDate(f.fecha),
      "Factura A",
      f.numero,
      f.cliente_tipo_documento ?? "",
      f.cliente_numero_documento ?? "",
      f.cliente_nombre,
      f.cliente_condicion_iva ?? "",
      f.tasa_iva != null ? `${f.tasa_iva}%` : "Mix",
      f.subtotal.toFixed(2).replace(".", ","),
      f.impuestos.toFixed(2).replace(".", ","),
      f.total.toFixed(2).replace(".", ","),
      f.forma_pago,
    ])
    const escape = (v: unknown) => {
      const s = String(v ?? "")
      if (s.includes(";") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const csv = "﻿" + [headers, ...rows].map(r => r.map(escape).join(";")).join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const stamp = new Date().toISOString().split("T")[0]
    a.href = url
    a.download = `facturaciones-arca-${stamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const esPendientes = tab === "pendientes"

  // ─── Render de una fila + render de la tabla / grupos ──────────────────
  const renderFila = (f: FacturaConDerivados) => {
    const checked = seleccionadas.has(f.id)
    return (
      <tr
        key={f.id}
        className={`border-b border-gray-100 hover:bg-gray-50 ${esPendientes ? "cursor-pointer" : ""} ${checked ? "bg-amber-50" : ""}`}
        onClick={esPendientes ? () => toggleSelect(f.id) : undefined}
      >
        {esPendientes && (
          <td className="text-center py-2 px-3" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleSelect(f.id)}
              className="cursor-pointer"
            />
          </td>
        )}
        <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{fmtDate(f.fecha)}</td>
        <td className="py-2 px-3 font-mono text-xs text-amber-700 whitespace-nowrap">{f.numero}</td>
        <td className="py-2 px-3">
          <div className="text-gray-900">{f.cliente_nombre}</div>
          {f.cliente_codigo && (
            <div className="text-xs text-gray-400 font-mono">{f.cliente_codigo}</div>
          )}
        </td>
        <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
          {f.cliente_tipo_documento ? `${f.cliente_tipo_documento}: ` : ""}
          {f.cliente_numero_documento ?? "—"}
        </td>
        <td className="py-2 px-3 text-gray-600">{f.cliente_condicion_iva ?? "—"}</td>
        <td className="py-2 px-3 text-center text-gray-600">
          {f.tasa_iva != null ? `${f.tasa_iva}%` : <span className="text-amber-600 text-xs">Mix</span>}
        </td>
        <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{fmtCurrency(f.subtotal)}</td>
        <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{fmtCurrency(f.impuestos)}</td>
        <td className="py-2 px-3 text-right font-medium text-gray-900 whitespace-nowrap">{fmtCurrency(f.total)}</td>
        <td className="py-2 px-3 text-xs text-gray-600">{f.forma_pago}</td>
        {!esPendientes && (
          <>
            <td className="py-2 px-3 text-xs text-gray-600 whitespace-nowrap">
              {f.arca_facturada_at
                ? new Date(f.arca_facturada_at).toLocaleString("es-AR")
                : "—"}
            </td>
            <td className="py-2 px-3 text-xs text-gray-600">{f.arca_facturada_por ?? "—"}</td>
          </>
        )}
      </tr>
    )
  }

  // Cantidad total de columnas (para colSpan de los headers de grupo)
  const colSpanTotal = (esPendientes ? 1 : 0) + 11 + (esPendientes ? 0 : 2)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Facturaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control de facturas con IVA subidas al facturador masivo de ARCA.
          </p>
        </div>
        {esPendientes && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportarExcel}
              disabled={facturas.length === 0}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50"
              title={
                seleccionadas.size > 0
                  ? `Exportar ${seleccionadas.size} seleccionada(s) a Excel/CSV`
                  : "Exportar todas las pendientes a Excel/CSV"
              }
            >
              <Download className="w-4 h-4" />
              Exportar {seleccionadas.size > 0 ? `(${seleccionadas.size})` : "todo"}
            </button>
            <button
              type="button"
              onClick={marcarFacturadas}
              disabled={seleccionadas.size === 0 || marcando}
              className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {marcando ? "Marcando…" : `Marcar facturadas (${seleccionadas.size})`}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 flex gap-6">
        {[
          { key: "pendientes" as const, label: "Pendientes", count: facturas.length },
          { key: "historial" as const, label: "Historial", count: historial.length },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key); setSearch(""); setSeleccionadas(new Set())
              setActiveFilters([]); setActiveGroupBy([]); setGruposColapsados(new Set())
            }}
            className={`-mb-px pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.key
                ? "border-amber-700 text-amber-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* OdooFilterBar — filtros + agrupaciones + favoritos */}
      <OdooFilterBar
        moduleName={`facturaciones-${tab}`}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(prev => [...prev, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(prev => prev.filter(sf => sf.id !== id))}
        onApplyFilter={f => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
        totalCount={dataset.length}
        filteredCount={filtradas.length}
      />

      {seleccionadas.size > 0 && (
        <div className="mt-2 text-sm text-gray-600 text-right">
          Seleccionado: <strong className="text-amber-900">{fmtCurrency(totalSeleccionadas)}</strong>
        </div>
      )}

      {/* Tabla */}
      <div className="mt-3 bg-white border border-gray-200 rounded-md overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando facturas…</div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {esPendientes
                ? (facturas.length === 0
                    ? "No hay facturas pendientes de facturar en ARCA. Todo al día. 🎉"
                    : "Ninguna factura matchea los filtros.")
                : (historial.length === 0
                    ? "Todavía no hay facturas marcadas como facturadas en ARCA."
                    : "Ninguna factura matchea los filtros.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {esPendientes && (
                    <th className="text-center py-2 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={seleccionadas.size === filtradas.length && filtradas.length > 0}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                        aria-label="Seleccionar todo"
                      />
                    </th>
                  )}
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">N° Interno</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Doc</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Cond. IVA</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Tasa</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Neto</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">IVA</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Forma de pago</th>
                  {!esPendientes && (
                    <>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Facturada</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Por</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Cuerpo: o flat (sin agrupar) o por grupos */}
              {grupos == null ? (
                <tbody>{filtradas.map(renderFila)}</tbody>
              ) : (
                grupos.secciones.map(([key, items]) => {
                  const colapsado = gruposColapsados.has(key)
                  const subtotal = items.reduce((s, x) => s + x.subtotal, 0)
                  const subiva   = items.reduce((s, x) => s + x.impuestos, 0)
                  const subtotal_total = items.reduce((s, x) => s + x.total, 0)
                  return (
                    <tbody key={key}>
                      <tr
                        onClick={() => toggleGrupo(key)}
                        className="bg-gray-100 hover:bg-gray-200 border-b border-gray-300 cursor-pointer"
                      >
                        <td colSpan={colSpanTotal} className="py-2 px-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-gray-700">
                              {colapsado
                                ? <ChevronRight className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />}
                              <span>{labelDeGrupo(grupos.campo.field, key)}</span>
                              <span className="text-xs font-normal text-gray-500">
                                ({items.length} factura{items.length === 1 ? "" : "s"})
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-xs text-gray-500 font-normal">
                              <span>Neto: <span className="text-gray-700 font-medium">{fmtCurrency(subtotal)}</span></span>
                              <span>IVA: <span className="text-gray-700 font-medium">{fmtCurrency(subiva)}</span></span>
                              <span>Total: <span className="text-amber-900 font-semibold">{fmtCurrency(subtotal_total)}</span></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {!colapsado && items.map(renderFila)}
                    </tbody>
                  )
                })
              )}

              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  {esPendientes && <td className="py-2 px-3"></td>}
                  <td colSpan={6} className="py-2 px-3 text-right text-sm font-medium text-gray-700">
                    Total {filtradas.length} factura{filtradas.length === 1 ? "" : "s"}:
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {fmtCurrency(filtradas.reduce((s, f) => s + f.subtotal, 0))}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {fmtCurrency(filtradas.reduce((s, f) => s + f.impuestos, 0))}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-amber-900">
                    {fmtCurrency(filtradas.reduce((s, f) => s + f.total, 0))}
                  </td>
                  <td></td>
                  {!esPendientes && <td colSpan={2}></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
