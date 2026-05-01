"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save } from "lucide-react"

interface NotaVentaConLineas {
  id: number
  numero: string
  fecha?: string
  cliente_id?: number | null
  cliente_nombre?: string | null
  estado?: string
  deposito?: string
  notas_venta_lineas?: {
    id?: number
    producto_id?: number | null
    producto_nombre: string
    cantidad: number
  }[]
}

interface ClienteOpt { id: number; codigo?: string; nombre?: string; direccion?: string; telefono?: string }

export default function OeForm() {
  const router = useRouter()

  const [nvs, setNvs] = useState<NotaVentaConLineas[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [cargando, setCargando] = useState(true)

  const [oeNvId, setOeNvId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/notas-venta").then(r => r.json()).catch(() => []),
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
    ]).then(([nv, cl]) => {
      if (!activo) return
      if (Array.isArray(nv)) {
        // Filtrar NVs activas (las que tengan estado 'abierta' u otro no terminal)
        const filtradas = nv.filter((n: any) => n.estado !== "cancelada" && n.estado !== "facturada")
        setNvs(filtradas)
      }
      if (Array.isArray(cl)) setClientes(cl)
      setCargando(false)
    })
    return () => { activo = false }
  }, [])

  const nvSeleccionada = nvs.find(n => n.id === oeNvId)
  const clienteNV = nvSeleccionada ? clientes.find(c => c.id === nvSeleccionada.cliente_id) : null
  const lineas = nvSeleccionada?.notas_venta_lineas ?? []

  const crearOE = async () => {
    if (!nvSeleccionada || !clienteNV) {
      setError("Debe seleccionar una Nota de Venta")
      return
    }
    if (lineas.length === 0) {
      setError("La Nota de Venta seleccionada no tiene líneas")
      return
    }
    if (guardando) return
    setError(null)
    setGuardando(true)

    try {
      const res = await fetch("/api/ordenes-entrega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: null,
          nota_venta_id: nvSeleccionada.id,
          nota_venta_numero: nvSeleccionada.numero,
          cliente_id: clienteNV.id,
          cliente_nombre: clienteNV.nombre,
          estado: "confirmada",
          fecha: new Date().toISOString(),
          total_productos: lineas.length,
          productos: lineas.map(l => ({
            producto_id: l.producto_id,
            producto_nombre: l.producto_nombre,
            cantidad: l.cantidad,
            reserva: l.cantidad,
            estado: "confirmado",
          })),
          deposito_origen: nvSeleccionada.deposito ?? null,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error al crear OE (HTTP ${res.status}): ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      router.push(`/ventas/oe/${data.id}`)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Nueva Orden de Entrega</h1>
            <p className="text-sm text-gray-500">Seleccione una Nota de Venta para generar la OE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={crearOE}
            disabled={!oeNvId || guardando}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Creando…" : "Crear OE"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Seleccionar Nota de Venta</h3>
            <select
              value={oeNvId ?? ""}
              onChange={e => setOeNvId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar NV…</option>
              {nvs.map(nv => (
                <option key={nv.id} value={nv.id}>
                  {nv.numero} — {nv.cliente_nombre ?? "Sin cliente"}
                </option>
              ))}
            </select>
          </div>

          {nvSeleccionada && clienteNV && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cliente:</span>{" "}
                    <span className="font-medium">{clienteNV.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dirección:</span>{" "}
                    <span className="font-medium">{clienteNV.direccion ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Teléfono:</span>{" "}
                    <span className="font-medium">{clienteNV.telefono ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Depósito:</span>{" "}
                    <span className="font-medium">{nvSeleccionada.deposito ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Productos a Entregar</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-4">Producto</th>
                      <th className="text-center py-2 px-4">Cantidad</th>
                      <th className="text-center py-2 px-4">Reserva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea, idx) => (
                      <tr key={linea.id ?? idx} className="border-b">
                        <td className="py-3 px-4 font-medium">{linea.producto_nombre}</td>
                        <td className="py-3 px-4 text-center">{linea.cantidad}</td>
                        <td className="py-3 px-4 text-center text-green-600">{linea.cantidad}</td>
                      </tr>
                    ))}
                    {lineas.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-4 text-gray-400 text-sm">La NV seleccionada no tiene líneas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Líneas:</span>
                <span className="font-medium">{lineas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total unidades:</span>
                <span className="font-medium">{lineas.reduce((s, l) => s + l.cantidad, 0)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 border-t pt-2">
              La OE quedará en estado <strong>confirmada</strong>, lista para generar el remito.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
