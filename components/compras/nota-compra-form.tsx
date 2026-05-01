"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface Proveedor {
  id: number
  nombre?: string
  razon_social?: string
  cuit?: string
}
interface FacturaCompraOpt {
  id: number
  numero: string
  proveedor_id: number
  total?: number
}

export type TipoNotaCompra = "credito" | "debito"

const LABELS: Record<TipoNotaCompra, { titulo: string; back: string; api: string }> = {
  credito: {
    titulo: "Nueva Nota de Crédito de Compra",
    back: "/compras/nc",
    api: "/api/compras/notas-credito",
  },
  debito: {
    titulo: "Nueva Nota de Débito de Compra",
    back: "/compras/nd",
    api: "/api/compras/notas-debito",
  },
}

export default function NotaCompraForm({ tipo }: { tipo: TipoNotaCompra }) {
  const router = useRouter()
  const labels = LABELS[tipo]

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [facturas, setFacturas] = useState<FacturaCompraOpt[]>([])
  const [cargando, setCargando] = useState(true)

  const [numero, setNumero] = useState("")
  const [tipoComprobante, setTipoComprobante] = useState<"A" | "B" | "C">("A")
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorNombre, setProveedorNombre] = useState("")
  const [facturaCompraId, setFacturaCompraId] = useState<number | null>(null)
  const [facturaNumero, setFacturaNumero] = useState("")
  const [motivo, setMotivo] = useState("")
  const [subtotal, setSubtotal] = useState(0)
  const [iva, setIva] = useState(0)

  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [proveedorDropdownAbierto, setProveedorDropdownAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/compras/proveedores").then(r => r.json()).catch(() => []),
      fetch("/api/compras/facturas").then(r => r.json()).catch(() => []),
    ]).then(([prov, facs]) => {
      if (!activo) return
      if (Array.isArray(prov)) setProveedores(prov)
      if (Array.isArray(facs)) setFacturas(facs.map((f: any) => ({
        id: f.id, numero: f.numero, proveedor_id: f.proveedor_id, total: f.total,
      })))
      setCargando(false)
    })
    return () => { activo = false }
  }, [])

  const proveedoresFiltrados = useMemo(() => {
    const q = proveedorBusqueda.trim().toLowerCase()
    if (!q) return proveedores.slice(0, 10)
    return proveedores.filter(p => {
      const name = (p.nombre || p.razon_social || "").toLowerCase()
      return name.includes(q) || (p.cuit ?? "").includes(q)
    }).slice(0, 10)
  }, [proveedores, proveedorBusqueda])

  const facturasFiltradas = facturas.filter(f => !proveedorId || f.proveedor_id === proveedorId)
  const total = subtotal + iva

  const seleccionarProveedor = (p: Proveedor) => {
    setProveedorId(p.id)
    setProveedorNombre(p.nombre || p.razon_social || "")
    setFacturaCompraId(null)
    setFacturaNumero("")
    setProveedorDropdownAbierto(false)
    setProveedorBusqueda("")
  }

  const seleccionarFactura = (id: number | null) => {
    setFacturaCompraId(id)
    if (id) {
      const fac = facturas.find(f => f.id === id)
      setFacturaNumero(fac?.numero ?? "")
    } else {
      setFacturaNumero("")
    }
  }

  const guardar = async () => {
    if (!proveedorId || !proveedorNombre) { setError("Seleccioná un proveedor"); return }
    if (!motivo.trim()) { setError("Ingresá el motivo"); return }
    if (subtotal <= 0) { setError("El subtotal debe ser mayor a 0"); return }
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const payload = {
        numero: numero || `${tipo === "credito" ? "NC" : "ND"}-${Date.now()}`,
        tipo: tipoComprobante,
        fecha: new Date(fecha).toISOString(),
        proveedor_id: proveedorId,
        proveedor_nombre: proveedorNombre,
        factura_compra_id: facturaCompraId,
        factura_numero: facturaNumero || null,
        motivo,
        estado: "pendiente",
        subtotal,
        iva,
        total,
        items: [{ descripcion: motivo, cantidad: 1, precio_unitario: subtotal, subtotal }],
      }
      const res = await fetch(labels.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(labels.back)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{labels.titulo}</h1>
            <p className="text-sm text-gray-500">
              {tipo === "credito"
                ? "Crédito recibido del proveedor (devolución, bonificación, error)"
                : "Cargo adicional del proveedor (intereses, gastos, error)"}
            </p>
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
            disabled={guardando || !proveedorId || subtotal <= 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-5">
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select
              value={tipoComprobante}
              onChange={e => setTipoComprobante(e.target.value as "A" | "B" | "C")}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
            <input
              type="text"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              placeholder="Ej: 0001-00012345"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Factura origen (opcional)</label>
            <select
              value={facturaCompraId ?? ""}
              onChange={e => seleccionarFactura(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin factura vinculada</option>
              {facturasFiltradas.map(f => (
                <option key={f.id} value={f.id}>{f.numero}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder={tipo === "credito" ? "Ej: devolución de mercadería defectuosa" : "Ej: intereses por mora"}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal *</label>
            <input
              type="number"
              step={0.01}
              min={0}
              value={subtotal}
              onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">IVA</label>
            <input
              type="number"
              step={0.01}
              min={0}
              value={iva}
              onChange={e => setIva(parseFloat(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
            <input
              type="text"
              value={formatCurrency(total, "ARS")}
              disabled
              className="w-full border rounded px-3 py-2 text-sm bg-gray-50 font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
