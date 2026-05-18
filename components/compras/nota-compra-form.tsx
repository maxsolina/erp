"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle, Plus, Save, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface Proveedor {
  id: number
  nombre?: string
  razon_social?: string
  cuit?: string
}

export type TipoNotaCompra = "credito" | "debito"

const LABELS: Record<TipoNotaCompra, { titulo: string; subtitulo: string; back: string; api: string; prefijo: string }> = {
  credito: {
    titulo: "Nueva Nota de Crédito de Compra",
    subtitulo: "Crédito recibido del proveedor (devolución, bonificación, error)",
    back: "/compras/nc",
    api: "/api/compras/notas-credito",
    prefijo: "NC",
  },
  debito: {
    titulo: "Nueva Nota de Débito de Compra",
    subtitulo: "Cargo adicional del proveedor (intereses, gastos, error)",
    back: "/compras/nd",
    api: "/api/compras/notas-debito",
    prefijo: "ND",
  },
}

interface Linea {
  uid: number
  descripcion: string
  importe: number
}

export default function NotaCompraForm({ tipo }: { tipo: TipoNotaCompra }) {
  const router = useRouter()
  const labels = LABELS[tipo]

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)

  // Header — proveedor + moneda. Número, fecha, tipo: auto. Sin factura origen, sin motivo.
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorNombre, setProveedorNombre] = useState("")
  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [proveedorDropdownAbierto, setProveedorDropdownAbierto] = useState(false)
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")
  const [tipoCotizacion, setTipoCotizacion] = useState<"oficial" | "blue" | "mep">("blue")
  const [cotizacion, setCotizacion] = useState<number | null>(null)
  const [cotizacionOrigen, setCotizacionOrigen] = useState<string | null>(null)

  // Líneas — descripción + importe por fila. Total = suma de importes.
  const [lineas, setLineas] = useState<Linea[]>([
    { uid: Date.now(), descripcion: "", importe: 0 },
  ])

  const [guardando, setGuardando] = useState(false)
  const [confirmandoFlag, setConfirmandoFlag] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    fetch("/api/compras/proveedores")
      .then(r => r.json()).catch(() => [])
      .then((prov: any) => {
        if (!activo) return
        if (Array.isArray(prov)) setProveedores(prov)
        setCargando(false)
      })
    return () => { activo = false }
  }, [])

  // Auto-fill de cotización al cambiar moneda/tipo (mismo patrón que OC).
  useEffect(() => {
    if (moneda === "ARS") {
      setCotizacion(null)
      setCotizacionOrigen(null)
      return
    }
    let activo = true
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${moneda}&tipo=${tipoCotizacion}&latest=true`)
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        if (!activo) return
        if (data?.tasa) {
          setCotizacion(Number(data.tasa))
          setCotizacionOrigen(`${data.tipo} del ${String(data.fecha).slice(0, 10)}`)
        } else {
          setCotizacion(null)
          setCotizacionOrigen("Sin cotización cargada — completala manualmente")
        }
      })
      .catch(() => {})
    return () => { activo = false }
  }, [moneda, tipoCotizacion])

  const proveedoresFiltrados = useMemo(() => {
    const q = proveedorBusqueda.trim().toLowerCase()
    if (!q) return proveedores.slice(0, 10)
    return proveedores.filter(p => {
      const name = (p.nombre || p.razon_social || "").toLowerCase()
      return name.includes(q) || (p.cuit ?? "").includes(q)
    }).slice(0, 10)
  }, [proveedores, proveedorBusqueda])

  const total = lineas.reduce((s, l) => s + (l.importe || 0), 0)
  const lineasValidas = lineas.filter(l => l.descripcion.trim() !== "" && l.importe > 0)

  const seleccionarProveedor = (p: Proveedor) => {
    setProveedorId(p.id)
    setProveedorNombre(p.nombre || p.razon_social || "")
    setProveedorDropdownAbierto(false)
    setProveedorBusqueda("")
  }

  const agregarLinea = () => {
    setLineas(prev => [...prev, { uid: Date.now() + prev.length, descripcion: "", importe: 0 }])
  }
  const quitarLinea = (uid: number) => {
    setLineas(prev => prev.filter(l => l.uid !== uid))
  }
  const updateLinea = (uid: number, patch: Partial<Linea>) => {
    setLineas(prev => prev.map(l => l.uid === uid ? { ...l, ...patch } : l))
  }

  const construirPayload = () => {
    const items = lineasValidas.map(l => ({
      descripcion: l.descripcion,
      cantidad: 1,
      precio_unitario: l.importe,
      subtotal: l.importe,
    }))
    const motivoTexto = lineasValidas.map(l => l.descripcion).join(" | ")
    return {
      numero: `${labels.prefijo}-${Date.now()}`,
      tipo: "A",
      fecha: new Date().toISOString(),
      proveedor_id: proveedorId,
      proveedor_nombre: proveedorNombre,
      factura_compra_id: null,
      factura_numero: null,
      motivo: motivoTexto,
      estado: "borrador",
      moneda,
      tipo_cotizacion: moneda !== "ARS" ? tipoCotizacion : null,
      cotizacion: moneda !== "ARS" ? cotizacion : null,
      subtotal: total,
      iva: 0,
      total,
      items,
    }
  }

  const validar = (): string | null => {
    if (!proveedorId || !proveedorNombre) return "Seleccioná un proveedor"
    if (lineasValidas.length === 0) return "Agregá al menos una línea con descripción e importe"
    if (moneda !== "ARS" && (!cotizacion || cotizacion <= 0)) return `La nota está en ${moneda} — cargá una cotización válida.`
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(labels.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirPayload()),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error: ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      const id = data.id
      const fichaPath = tipo === "credito" ? `/compras/nc/${id}` : `/compras/nd/${id}`
      router.push(fichaPath)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  // Guarda como borrador + lo confirma inmediatamente. Después de confirmar
  // la NC aparece en Conciliación de Deuda del proveedor con saldo_disponible.
  const confirmar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    if (confirmandoFlag) return
    setError(null)
    setConfirmandoFlag(true)
    try {
      // 1. Crear la NC/ND en estado borrador
      const res = await fetch(labels.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirPayload()),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error al guardar: ${text}`)
        setConfirmandoFlag(false)
        return
      }
      const data = await res.json()
      const id = data.id

      // 2. Confirmar
      const confEndpoint = `${labels.api}/${id}/confirmar`
      const confRes = await fetch(confEndpoint, { method: "POST" })
      if (!confRes.ok) {
        const text = await confRes.text()
        setError(`Se guardó como borrador (#${id}) pero falló la confirmación: ${text}`)
        setConfirmandoFlag(false)
        return
      }

      const fichaPath = tipo === "credito" ? `/compras/nc/${id}` : `/compras/nd/${id}`
      router.push(fichaPath)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setConfirmandoFlag(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(labels.back)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{labels.titulo}</h1>
            <p className="text-sm text-gray-500">{labels.subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(labels.back)}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || confirmandoFlag || !proveedorId || lineasValidas.length === 0}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={confirmar}
            disabled={guardando || confirmandoFlag || !proveedorId || lineasValidas.length === 0}
            title="Guarda y confirma la nota — queda disponible en Conciliación de Deuda del proveedor"
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {confirmandoFlag ? "Confirmando…" : "Confirmar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header — Proveedor + Moneda (+ cotización si USD/EUR) */}
      <div className="bg-white rounded-lg border p-6 mb-4 space-y-5">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProveedorDropdownAbierto(o => !o)}
                className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {proveedorNombre || <span className="text-gray-400">Seleccionar proveedor…</span>}
              </button>
              {proveedorDropdownAbierto && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
                  <div className="p-2 border-b">
                    <input
                      autoFocus
                      type="text"
                      value={proveedorBusqueda}
                      onChange={e => setProveedorBusqueda(e.target.value)}
                      placeholder="Buscar proveedor…"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {proveedoresFiltrados.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={e => { e.preventDefault(); seleccionarProveedor(p) }}
                        className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                      >
                        <span className="font-medium">{p.nombre || p.razon_social}</span>
                        {p.cuit && <span className="ml-2 text-xs text-gray-400">{p.cuit}</span>}
                      </div>
                    ))}
                    {proveedoresFiltrados.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value as "ARS" | "USD")}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ARS">ARS — Pesos</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </div>
        </div>

        {moneda !== "ARS" && (
          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo cotización</label>
              <select
                value={tipoCotizacion}
                onChange={e => setTipoCotizacion(e.target.value as "oficial" | "blue" | "mep")}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="oficial">Oficial</option>
                <option value="blue">Blue</option>
                <option value="mep">MEP</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cotización <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step={0.01}
                value={cotizacion ?? ""}
                onChange={e => {
                  setCotizacion(e.target.value ? Number(e.target.value) : null)
                  setCotizacionOrigen(null)
                }}
                placeholder={`1 ${moneda} = ? ARS`}
                className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  cotizacion && cotizacion > 0 ? "border-gray-300" : "border-amber-400 bg-amber-50"
                }`}
              />
              {cotizacionOrigen && (
                <p className="text-xs text-gray-500 mt-1">Cargada automática: {cotizacionOrigen}</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Número, fecha y tipo se generan automáticamente al guardar.
        </p>
      </div>

      {/* Líneas */}
      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-sm text-gray-900">Descripción</h3>
          <button
            onClick={agregarLinea}
            className="flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900"
          >
            <Plus className="w-4 h-4" /> Añadir línea
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-2 px-4">Descripción</th>
              <th className="text-right py-2 px-4 w-40">Importe</th>
              <th className="w-10 py-2 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineas.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                  Sin líneas. Apretá "Añadir línea" para empezar.
                </td>
              </tr>
            )}
            {lineas.map(l => (
              <tr key={l.uid} className="hover:bg-gray-50">
                <td className="py-2 px-4">
                  <input
                    type="text"
                    value={l.descripcion}
                    onChange={e => updateLinea(l.uid, { descripcion: e.target.value })}
                    placeholder="Descripción del concepto"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={l.importe || ""}
                    onChange={e => updateLinea(l.uid, { importe: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    className="w-full text-right px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => quitarLinea(l.uid)}
                    className="text-gray-400 hover:text-red-500"
                    title="Eliminar línea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                {formatCurrency(total, moneda)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
