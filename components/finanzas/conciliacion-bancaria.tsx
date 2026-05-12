"use client"

// Conciliación Bancaria — flujo en 2 pantallas:
//   1. Filtros: caja bancaria, rango de fechas, tipo de fecha, conciliado, tipos.
//   2. Movimientos: tabla con métricas + toggle conciliado por fila + crear ajuste.
//
// El crear-ajuste va a /api/ajustes-banco (que genera número via RPC y resuelve
// concepto_nombre desde concepto_id) — esto reemplaza la inserción directa
// del monolito que dejaba ajustes sin número y con concepto_id ausente.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, Check, Download, Eye, Filter, Plus, Search, Trash2, X,
} from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type ConceptoRegistroCaja, type CuentaBancaria } from "./_shared"

interface MovimientoBancoConciliacion {
  id: string
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  tipo_movimiento: "ingreso" | "egreso"
  importe: number
  moneda: string
  tipo_operacion: string | null
  numero_operacion: string | null
  fecha_operacion: string | null
  chequera: string | null
  numero_cheque: string | null
  concepto: string | null
  documento_origen_tipo: string | null
  documento_origen_numero: string | null
  conciliado: boolean
  fecha_conciliacion: string | null
  fecha_creacion: string
}

type Sucursal = { id?: string | number; nombre: string; activa?: boolean }
type Filtros = {
  cuentaBancariaId: string
  desde: string
  hasta: string
  tipoFecha: "fecha_operacion" | "fecha_creacion"
  sucursales: string[]
  tiposMovimiento: string[]
  incluirNoClasificados: boolean
  soloConciliados: boolean | null // null = todos
}

const DEFAULT_TIPOS = [
  "Transferencia", "Cheque Diferido", "Cheque Corriente", "Extracción",
  "Depósito", "Débito Bancario", "Débito Automático",
  "Transferencia entre Cuentas Propias", "Acreditación de Tarjeta", "Extracción con Cheque",
]

// Mapea documento_origen_tipo → ruta de la ficha (best-effort). Los que no
// tienen ficha read-only quedan en `null` y el botón Eye no se renderiza.
const HREF_ORIGEN: Record<string, (numero: string | null) => string | null> = {
  registro_banco: () => "/finanzas/registros-banco",
  ajuste_banco: () => "/finanzas/ajustes-banco",
  deposito: () => "/finanzas/depositos",
  extraccion: () => "/finanzas/extracciones",
  transferencia_bancaria: () => "/finanzas/transferencias-bancarias",
  conversion_moneda: () => "/finanzas/conversion-monedas",
  negociacion_cheques: () => "/finanzas/negociacion-cheques",
  // Cobranzas / recibos
  recibo: () => "/ventas/recibos",
  cobranza: () => "/ventas/recibos",
  // Transferencias de caja (cuando una transfer entra/sale por banco permitido)
  transferencia_caja_entrada: () => "/finanzas/transferencias-caja",
  transferencia_caja_salida: () => "/finanzas/transferencias-caja",
}

// Etiquetas amigables para el documento de origen.
const LABEL_ORIGEN: Record<string, string> = {
  registro_banco: "Registro de Banco",
  ajuste_banco: "Ajuste de Banco",
  deposito: "Depósito",
  extraccion: "Extracción",
  transferencia_bancaria: "Transf. Bancaria",
  conversion_moneda: "Conversión Moneda",
  negociacion_cheques: "Negociación Cheques",
  recibo: "Recibo",
  cobranza: "Cobranza",
  transferencia_caja_entrada: "Transf. Caja (entrada)",
  transferencia_caja_salida: "Transf. Caja (salida)",
}

export default function ConciliacionBancaria() {
  const router = useRouter()
  const { sucursales } = useERP() as { sucursales: Sucursal[] }

  const [pantalla, setPantalla] = useState<"filtros" | "movimientos">("filtros")
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoBancoConciliacion[]>([])
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  const [busqueda, setBusqueda] = useState("")
  const [filtroImporte, setFiltroImporte] = useState("")
  const [filtroDebeHaber, setFiltroDebeHaber] = useState<"todos" | "debe" | "haber">("todos")
  const [tabActivo, setTabActivo] = useState<"filtros" | "movimientos">("movimientos")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<Filtros>({
    cuentaBancariaId: "",
    desde: "2000-01-01",
    hasta: new Date().toISOString().split("T")[0],
    tipoFecha: "fecha_operacion",
    sucursales: sucursales.filter(s => s.activa).map(s => s.nombre),
    // Sin filtro por tipo: queremos ver TODOS los movimientos no conciliados,
    // independientemente del tipo (incluyendo "Cobranza", transferencias, etc.).
    tiposMovimiento: [],
    incluirNoClasificados: true,
    soloConciliados: false,
  })

  // Modal "Crear Ajuste"
  const [modalAjuste, setModalAjuste] = useState<MovimientoBancoConciliacion | null>(null)
  const [ajusteConceptoId, setAjusteConceptoId] = useState("")
  const [ajusteImporte, setAjusteImporte] = useState(0)
  const [ajusteSucursal, setAjusteSucursal] = useState("")
  const [creandoAjuste, setCreandoAjuste] = useState(false)

  useEffect(() => {
    fetch("/api/cuentas-bancarias")
      .then(r => r.json())
      .then((d: CuentaBancaria[]) => { if (Array.isArray(d)) setCuentas(d) })
      .catch(console.error)
    fetch("/api/conceptos-registro-caja")
      .then(r => r.json())
      .then((d: ConceptoRegistroCaja[]) => {
        if (Array.isArray(d)) setConceptos(d.filter(c => c.visible_en_banco))
      })
      .catch(console.error)
  }, [])

  // Re-sincronizar sucursales por defecto cuando el contexto las carga.
  useEffect(() => {
    if (sucursales.length > 0 && filtros.sucursales.length === 0) {
      setFiltros(p => ({ ...p, sucursales: sucursales.filter(s => s.activa).map(s => s.nombre) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursales.length])

  const cargarMovimientos = async () => {
    if (!filtros.cuentaBancariaId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        cuenta_bancaria_id: filtros.cuentaBancariaId,
        tipo_fecha: filtros.tipoFecha,
        desde: filtros.desde,
        hasta: filtros.hasta,
      })
      if (filtros.soloConciliados === true) params.set("conciliado", "true")
      else if (filtros.soloConciliados === false) params.set("conciliado", "false")
      if (filtros.tiposMovimiento.filter(Boolean).length > 0) {
        params.set("tipos_movimiento", filtros.tiposMovimiento.filter(Boolean).join(","))
      }
      if (filtros.incluirNoClasificados) params.set("incluir_no_clasif", "1")

      const res = await fetch(`/api/movimientos-banco?${params.toString()}`)
      if (!res.ok) { setError(`Error: ${await res.text()}`); setLoading(false); return }
      const data: MovimientoBancoConciliacion[] = await res.json()
      setMovimientos(data)
      setCambios({})
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setLoading(false)
    }
  }

  const metricas = useMemo(() => {
    const sumar = (movs: MovimientoBancoConciliacion[]) =>
      movs.reduce((a, m) => a + (m.tipo_movimiento === "ingreso" ? m.importe : -m.importe), 0)
    const efectivos = movimientos.map(m => ({
      ...m,
      conciliado: cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado,
    }))
    const conc = efectivos.filter(m => m.conciliado)
    const noConc = efectivos.filter(m => !m.conciliado)
    return {
      saldoEntreFechas: sumar(noConc),
      saldoActual: sumar(efectivos),
      totalConciliados: sumar(conc),
      totalNoConciliados: sumar(noConc),
      cantidadModificados: Object.keys(cambios).length,
    }
  }, [movimientos, cambios])

  const toggleConciliado = async (m: MovimientoBancoConciliacion) => {
    const actual = cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado
    const nuevo = !actual
    setCambios(prev => ({ ...prev, [m.id]: nuevo }))
    // Persistir inmediato server-side.
    const res = await fetch(`/api/movimientos-banco/${m.id}/conciliar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conciliado: nuevo }),
    })
    if (!res.ok) {
      // revertir en caso de error
      setCambios(prev => {
        const next = { ...prev }
        delete next[m.id]
        return next
      })
      setError(`Error al conciliar: ${await res.text()}`)
    }
  }

  const filtrados = useMemo(() => {
    let f = movimientos
    if (busqueda) {
      const b = busqueda.toLowerCase()
      f = f.filter(m =>
        (m.concepto ?? "").toLowerCase().includes(b) ||
        (m.numero_operacion ?? "").toLowerCase().includes(b) ||
        (m.tipo_operacion ?? "").toLowerCase().includes(b),
      )
    }
    if (filtroImporte) {
      const imp = Number(filtroImporte)
      f = f.filter(m => m.importe === imp)
    }
    if (filtroDebeHaber === "debe") f = f.filter(m => m.tipo_movimiento === "egreso")
    if (filtroDebeHaber === "haber") f = f.filter(m => m.tipo_movimiento === "ingreso")
    return f
  }, [movimientos, busqueda, filtroImporte, filtroDebeHaber])

  const descargarCSV = () => {
    const headers = ["Fecha Op.", "Fecha Creación", "Tipo Op.", "N° Op.", "Chequera", "N° Cheque", "Debe", "Haber", "Conciliado"]
    const rows = filtrados.map(m => [
      m.fecha_operacion ?? "",
      m.fecha_creacion ?? "",
      m.tipo_operacion ?? "",
      m.numero_operacion ?? "",
      m.chequera ?? "",
      m.numero_cheque ?? "",
      m.tipo_movimiento === "egreso" ? m.importe : "",
      m.tipo_movimiento === "ingreso" ? m.importe : "",
      (cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado) ? "Sí" : "No",
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conciliacion_bancaria_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Crear Ajuste ─────────────────────────────────────────────────────────
  const abrirModalAjuste = (m: MovimientoBancoConciliacion) => {
    setModalAjuste(m)
    setAjusteImporte(m.importe)
    setAjusteConceptoId("")
    setAjusteSucursal(sucursales.find(s => s.activa)?.nombre || "")
  }

  const crearAjuste = async () => {
    if (!modalAjuste) return
    if (!ajusteConceptoId) { setError("Seleccionar concepto"); return }
    if (creandoAjuste) return
    setError(null)
    setCreandoAjuste(true)
    try {
      const cuenta = cuentas.find(c => c.id === filtros.cuentaBancariaId)
      const res = await fetch("/api/ajustes-banco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuenta_bancaria_nombre: cuenta?.banco_nombre ?? "",
          concepto_id: ajusteConceptoId,
          importe: Math.abs(ajusteImporte),
          fecha: new Date().toISOString().split("T")[0],
          sucursal: ajusteSucursal,
          observaciones: `Ajuste por conciliación del movimiento ${modalAjuste.numero_operacion ?? modalAjuste.id}`,
        }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setCreandoAjuste(false); return }

      // Marcar el movimiento como conciliado.
      await fetch(`/api/movimientos-banco/${modalAjuste.id}/conciliar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conciliado: true }),
      })
      setCambios(prev => ({ ...prev, [modalAjuste.id]: true }))
      setModalAjuste(null)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setCreandoAjuste(false)
    }
  }

  // Modal "Ver comprobante" — muestra los datos del movimiento sin sacar al
  // usuario de la pantalla de conciliación.
  const [modalOrigen, setModalOrigen] = useState<MovimientoBancoConciliacion | null>(null)
  const verOrigen = (m: MovimientoBancoConciliacion) => {
    if (!m.documento_origen_tipo) return
    setModalOrigen(m)
  }

  // ── Render: pantalla de filtros ──────────────────────────────────────────
  if (pantalla === "filtros") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-amber-900 mb-6">Conciliación Bancaria — Filtros</h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Banco / Cuenta *</label>
            <select value={filtros.cuentaBancariaId} onChange={e => setFiltros(p => ({ ...p, cuentaBancariaId: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar cuenta…</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Conciliado</label>
            <select
              value={filtros.soloConciliados === null ? "todos" : filtros.soloConciliados ? "si" : "no"}
              onChange={e => {
                const v = e.target.value
                setFiltros(p => ({ ...p, soloConciliados: v === "todos" ? null : v === "si" }))
              }}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="no">No</option>
              <option value="si">Sí</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Desde</label>
            <input type="date" value={filtros.desde} onChange={e => setFiltros(p => ({ ...p, desde: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Hasta</label>
            <input type="date" value={filtros.hasta} onChange={e => setFiltros(p => ({ ...p, hasta: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <button
          onClick={() => { cargarMovimientos(); setPantalla("movimientos") }}
          disabled={!filtros.cuentaBancariaId}
          className="px-6 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
          Confirmar Filtros
        </button>
      </div>
    )
  }

  // ── Render: pantalla de movimientos ──────────────────────────────────────
  const cuentaSel = cuentas.find(c => c.id === filtros.cuentaBancariaId)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => setPantalla("filtros")} className="text-sm text-indigo-700 hover:text-indigo-900 flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a filtros
          </button>
          <h1 className="text-2xl font-bold text-amber-900">Conciliación Bancaria</h1>
          {cuentaSel && (
            <p className="text-xs text-gray-500 mt-0.5">{cuentaSel.banco_nombre} — {cuentaSel.numero_cuenta} ({cuentaSel.moneda})</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPantalla("filtros")} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1">
            <Filter className="w-4 h-4" />Cambiar Filtros
          </button>
          <button onClick={descargarCSV} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1">
            <Download className="w-4 h-4" />Descargar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: "Saldo entre Fechas", val: metricas.saldoEntreFechas },
          { label: "Saldo Actual", val: metricas.saldoActual },
          { label: "Total Mov. Conciliados", val: metricas.totalConciliados },
          { label: "Total Mov. No Conciliados", val: metricas.totalNoConciliados },
        ].map(m => (
          <div key={m.label} className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-lg font-bold ${m.val < 0 ? "text-red-600" : "text-gray-900"}`}>
              $ {m.val.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <>
          {/* Buscador */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input placeholder="Buscar en concepto, operación..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 h-9 border rounded text-sm" />
            </div>
          </div>

          {loading ? (
            <p className="text-center py-8 text-gray-400">Cargando…</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                    <th className="py-2 px-2">Fecha Op.</th>
                    <th className="px-2">Fecha Creac.</th>
                    <th className="px-2">Tipo Comprobante</th>
                    <th className="px-2">N° Op.</th>
                    <th className="px-2">Chequera</th>
                    <th className="px-2">N° Cheque</th>
                    <th className="px-2">Observaciones</th>
                    <th className="px-2 text-right">Debe</th>
                    <th className="px-2 text-right">Haber</th>
                    <th className="px-2 text-center">Conc.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(m => {
                    const esConciliado = cambios[m.id] !== undefined ? cambios[m.id] : m.conciliado
                    const bgColor = esConciliado ? "bg-green-50" : !m.documento_origen_tipo ? "bg-gray-50" : ""
                    const labelOrigen = m.documento_origen_tipo ? (LABEL_ORIGEN[m.documento_origen_tipo] ?? m.documento_origen_tipo) : null
                    const tipoMostrar = labelOrigen ?? m.tipo_operacion ?? "—"
                    const tieneLink = m.documento_origen_tipo && HREF_ORIGEN[m.documento_origen_tipo]
                    const nroOp = m.numero_operacion ?? m.documento_origen_numero ?? "—"
                    return (
                      <tr key={m.id} className={`border-b ${bgColor}`}>
                        <td className="py-1.5 px-2">{m.fecha_operacion ?? "—"}</td>
                        <td className="px-2 text-gray-500">{m.fecha_creacion ? new Date(m.fecha_creacion).toLocaleDateString() : "—"}</td>
                        <td className="px-2">
                          <div className="flex items-center gap-1.5">
                            <span>{tipoMostrar}</span>
                            {tieneLink && (
                              <button title="Ver documento" onClick={() => verOrigen(m)} className="text-gray-400 hover:text-indigo-600">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 font-mono text-xs">{nroOp}</td>
                        <td className="px-2">{m.chequera ?? "—"}</td>
                        <td className="px-2">{m.numero_cheque ?? "—"}</td>
                        <td className="px-2 text-xs text-gray-600 max-w-[260px] truncate" title={m.concepto ?? ""}>
                          {m.concepto ?? "—"}
                        </td>
                        <td className="px-2 text-right text-red-600">
                          {m.tipo_movimiento === "egreso" ? `$${m.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                        </td>
                        <td className="px-2 text-right text-green-600">
                          {m.tipo_movimiento === "ingreso" ? `$${m.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                        </td>
                        <td className="px-2 text-center">
                          <input type="checkbox" checked={esConciliado} onChange={() => toggleConciliado(m)} className="rounded" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtrados.length === 0 && (
                <p className="text-center py-8 text-gray-400">No hay movimientos para los filtros aplicados</p>
              )}
            </div>
          )}
        </>

      {/* Modal Ver Comprobante de Origen */}
      {modalOrigen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOrigen(null)}>
          <div className="bg-white rounded-lg p-6 w-[560px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Comprobante de origen</p>
                <h3 className="text-lg font-semibold text-amber-900">
                  {LABEL_ORIGEN[modalOrigen.documento_origen_tipo ?? ""] ?? modalOrigen.documento_origen_tipo ?? "—"}
                </h3>
              </div>
              <button onClick={() => setModalOrigen(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">N° Operación</p>
                  <p className="font-mono">{modalOrigen.numero_operacion ?? modalOrigen.documento_origen_numero ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Fecha</p>
                  <p>{modalOrigen.fecha_operacion ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Tipo</p>
                  <p className="capitalize">{modalOrigen.tipo_movimiento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Importe</p>
                  <p className={`font-mono font-semibold ${modalOrigen.tipo_movimiento === "egreso" ? "text-red-600" : "text-green-600"}`}>
                    ${modalOrigen.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })} {modalOrigen.moneda ?? ""}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Cuenta Bancaria</p>
                <p>{modalOrigen.cuenta_bancaria_nombre ?? "—"}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Concepto / Observaciones</p>
                <p className="text-gray-800">{modalOrigen.concepto ?? "—"}</p>
              </div>

              {(modalOrigen.chequera || modalOrigen.numero_cheque) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Chequera</p>
                    <p>{modalOrigen.chequera ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">N° Cheque</p>
                    <p>{modalOrigen.numero_cheque ?? "—"}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Estado Conciliación</p>
                  <p className={modalOrigen.conciliado ? "text-green-700 font-medium" : "text-gray-600"}>
                    {modalOrigen.conciliado ? "Conciliado" : "No conciliado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Fecha Creación</p>
                  <p className="text-gray-500 text-xs">{modalOrigen.fecha_creacion ? new Date(modalOrigen.fecha_creacion).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t">
              {(() => {
                const builder = modalOrigen.documento_origen_tipo ? HREF_ORIGEN[modalOrigen.documento_origen_tipo] : null
                const href = builder ? builder(modalOrigen.documento_origen_numero) : null
                return href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
                    <Eye className="w-4 h-4" /> Abrir comprobante completo en pestaña nueva
                  </a>
                ) : <span />
              })()}
              <button onClick={() => setModalOrigen(null)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Banco */}
      {modalAjuste && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Crear Ajuste de Banco</h3>
              <button onClick={() => setModalAjuste(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Cuenta</label>
                <p className="text-sm font-medium">{cuentaSel?.banco_nombre} — {cuentaSel?.numero_cuenta}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                <select value={ajusteConceptoId} onChange={e => setAjusteConceptoId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Seleccionar…</option>
                  {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Importe *</label>
                <input type="number" step="0.01" value={ajusteImporte} onChange={e => setAjusteImporte(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sucursal</label>
                <select value={ajusteSucursal} onChange={e => setAjusteSucursal(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">—</option>
                  {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalAjuste(null)} className="px-4 py-2 border rounded text-sm">Cancelar</button>
              <button onClick={crearAjuste} disabled={creandoAjuste}
                className="px-4 py-2 bg-indigo-900 text-white rounded text-sm disabled:opacity-50 flex items-center gap-1">
                <Check className="w-4 h-4" /> {creandoAjuste ? "Creando…" : "Crear Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
