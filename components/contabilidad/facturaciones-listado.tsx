"use client"

// Listado tipo conciliación bancaria para Facturaciones ARCA.
//
// Trae las facturas con IVA todavía no marcadas como facturadas externamente
// (vía facturador masivo de AFIP/ARCA). El operador:
//   1. Exporta a Excel, lo sube a ARCA.
//   2. Vuelve y tilda las que ya facturó.
//   3. Click en "Marcar facturadas" → desaparecen de la lista, pasan al
//      estado "facturado" persistido en la columna `facturas.arca_facturada`.

import { useEffect, useMemo, useState } from "react"
import { Download, CheckCircle2, FileText } from "lucide-react"

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

const fmtCurrency = (n: number) =>
  Number(n ?? 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR")
}

export default function FacturacionesListado() {
  const [tab, setTab] = useState<"pendientes" | "historial">("pendientes")
  const [facturas, setFacturas] = useState<FacturaPendiente[]>([])
  const [historial, setHistorial] = useState<FacturaPendiente[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [marcando, setMarcando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

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
  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return dataset
    const q = busqueda.toLowerCase()
    return dataset.filter(f =>
      f.numero.toLowerCase().includes(q) ||
      f.cliente_nombre.toLowerCase().includes(q) ||
      (f.cliente_numero_documento ?? "").toLowerCase().includes(q),
    )
  }, [dataset, busqueda])

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
            onClick={() => { setTab(t.key); setBusqueda(""); setSeleccionadas(new Set()) }}
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

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por número, cliente o documento…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        {seleccionadas.size > 0 && (
          <span className="text-sm text-gray-600">
            Seleccionado: <strong className="text-amber-900">{fmtCurrency(totalSeleccionadas)}</strong>
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando facturas…</div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {esPendientes
                ? (facturas.length === 0
                    ? "No hay facturas pendientes de facturar en ARCA. Todo al día. 🎉"
                    : "Ninguna factura matchea la búsqueda.")
                : (historial.length === 0
                    ? "Todavía no hay facturas marcadas como facturadas en ARCA."
                    : "Ninguna factura matchea la búsqueda.")}
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
              <tbody>
                {filtradas.map(f => {
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
                })}
              </tbody>
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
