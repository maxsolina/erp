"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle, Save } from "lucide-react"

interface OrdenEntrega {
  id: number
  numero: string
  nota_venta_id?: number | null
  nota_venta_numero?: string | null
  cliente_id?: number | null
  cliente_nombre?: string | null
  estado?: string
  deposito_origen?: string | null
  deposito?: string | null
  productos?: {
    producto_id?: number | null
    producto_nombre: string
    cantidad: number
  }[]
}

interface RemitoExistente {
  id: number
  orden_entrega_id?: number | null
}

interface ClienteOpt { id: number; codigo?: string; nombre?: string; direccion?: string; telefono?: string }
interface Deposito { id: number; nombre: string; sucursal_id?: number | null }
interface Ubicacion { id: number; deposito_id: number; nombre: string; codigo?: string }

export default function RemitoForm({ prefillOeId }: { prefillOeId?: number }) {
  const router = useRouter()

  const [oes, setOes] = useState<OrdenEntrega[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [remitosExistentes, setRemitosExistentes] = useState<RemitoExistente[]>([])
  const [cargando, setCargando] = useState(true)

  const [oeId, setOeId] = useState<number | null>(null)
  const [depositoId, setDepositoId] = useState<number>(0)
  const [ubicacionId, setUbicacionId] = useState<number>(0)
  const [confirmarStock, setConfirmarStock] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/ordenes-entrega").then(r => r.json()).catch(() => []),
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/depositos").then(r => r.json()).catch(() => []),
      fetch("/api/ubicaciones").then(r => r.json()).catch(() => []),
      fetch("/api/remitos-venta").then(r => r.json()).catch(() => []),
    ]).then(([oeData, clData, depData, ubicData, remData]) => {
      if (!activo) return
      if (Array.isArray(oeData)) setOes(oeData)
      if (Array.isArray(clData)) setClientes(clData)
      if (Array.isArray(depData)) setDepositos(depData)
      if (Array.isArray(ubicData)) setUbicaciones(ubicData)
      if (Array.isArray(remData)) setRemitosExistentes(remData)
      setCargando(false)
    })
    return () => { activo = false }
  }, [])

  // OEs disponibles = OEs sin remito vinculado y no canceladas
  const oeIdsConRemito = new Set(
    remitosExistentes.map(r => r.orden_entrega_id).filter((x): x is number => x != null)
  )
  const oesDisponibles = oes.filter(oe =>
    oe.estado !== "cancelada" && !oeIdsConRemito.has(oe.id)
  )

  // Pre-seleccionar OE si vino por query param
  useEffect(() => {
    if (!prefillOeId || cargando || oeId !== null) return
    if (oesDisponibles.some(oe => oe.id === prefillOeId)) {
      setOeId(prefillOeId)
    }
  }, [prefillOeId, cargando, oesDisponibles, oeId])

  const oeSeleccionada = oes.find(oe => oe.id === oeId)
  const clienteOE = oeSeleccionada
    ? clientes.find(c => c.id === oeSeleccionada.cliente_id)
    : null
  const lineas = oeSeleccionada?.productos ?? []

  // Default depósito
  useEffect(() => {
    if (depositoId === 0 && depositos.length > 0) {
      const def = depositos[0]
      setDepositoId(def.id)
      const ub = ubicaciones.find(u => u.deposito_id === def.id && u.nombre === "Stock")
        ?? ubicaciones.find(u => u.deposito_id === def.id)
      if (ub) setUbicacionId(ub.id)
    }
  }, [depositos, ubicaciones, depositoId])

  const generar = async () => {
    if (!oeSeleccionada || !clienteOE) {
      setError("Debe seleccionar una Orden de Entrega")
      return
    }
    if (lineas.length === 0) {
      setError("La OE seleccionada no tiene productos")
      return
    }
    if (guardando) return
    setError(null)
    setGuardando(true)

    const fechaHoy = new Date().toISOString()
    const depositoSeleccionado = depositos.find(d => d.id === depositoId)
    const depositoNombre = depositoSeleccionado?.nombre ?? "Sin depósito"

    try {
      // 1. Crear remito
      const remRes = await fetch("/api/remitos-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: null,
          orden_entrega_id: oeSeleccionada.id,
          orden_entrega_numero: oeSeleccionada.numero,
          nota_venta_id: oeSeleccionada.nota_venta_id ?? null,
          nota_venta_numero: oeSeleccionada.nota_venta_numero ?? null,
          cliente_id: clienteOE.id,
          cliente_nombre: clienteOE.nombre,
          estado: "emitido",
          deposito: depositoNombre,
          fecha: fechaHoy,
          lineas: lineas.map(l => ({
            producto_id: l.producto_id,
            producto_nombre: l.producto_nombre,
            cantidad: l.cantidad,
            requiere_serie: false,
            series_seleccionadas: [],
          })),
        }),
      })
      if (!remRes.ok) {
        const text = await remRes.text()
        setError(`Error al crear remito: ${text}`)
        setGuardando(false)
        return
      }
      const remData = await remRes.json()
      const remitoId = remData.id
      const remitoNumero = remData.numero

      // 2. (opcional) Confirmar — descuenta stock + asiento CMV
      if (confirmarStock) {
        const confRes = await fetch(`/api/remitos/${remitoId}/confirmar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remito_numero: remitoNumero,
            nv_numero: oeSeleccionada.nota_venta_numero ?? null,
            oe_numero: oeSeleccionada.numero,
            deposito_id: depositoId || null,
            deposito_nombre: depositoNombre,
            ubicacion_id: ubicacionId || null,
            ubicacion_nombre: ubicaciones.find(u => u.id === ubicacionId)?.nombre ?? null,
            usuario: "sistema",
            lineas: lineas.map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              cantidad: l.cantidad,
              requiere_serie: false,
              series_seleccionadas: [],
            })),
          }),
        })
        if (!confRes.ok) {
          const text = await confRes.text()
          // El remito quedó emitido pero no confirmado — informar al usuario
          setError(`Remito ${remitoNumero} creado pero no confirmado: ${text}`)
          // Aún así, redirigimos a la ficha del remito
          router.push(`/ventas/remitos/${remitoId}`)
          return
        }
      }

      router.push(`/ventas/remitos/${remitoId}`)
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
            <h1 className="text-2xl font-bold text-amber-900">Nuevo Remito</h1>
            <p className="text-sm text-gray-500">Generá un remito a partir de una Orden de Entrega pendiente</p>
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
            onClick={generar}
            disabled={!oeId || guardando}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {confirmarStock ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {guardando ? "Procesando…" : confirmarStock ? "Generar y Confirmar" : "Generar Remito"}
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
            <h3 className="font-semibold text-gray-900 mb-4">Orden de Entrega</h3>
            <select
              value={oeId ?? ""}
              onChange={e => setOeId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar OE pendiente…</option>
              {oesDisponibles.map(oe => (
                <option key={oe.id} value={oe.id}>
                  {oe.numero} — {oe.cliente_nombre ?? "Sin cliente"} {oe.nota_venta_numero ? `(NV ${oe.nota_venta_numero})` : ""}
                </option>
              ))}
            </select>
            {oesDisponibles.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                No hay OEs disponibles para remitir. Las OEs con remito ya generado se filtran del listado.
              </p>
            )}
          </div>

          {oeSeleccionada && clienteOE && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cliente:</span>{" "}
                    <span className="font-medium">{clienteOE.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dirección:</span>{" "}
                    <span className="font-medium">{clienteOE.direccion ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Origen de Stock</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
                    <select
                      value={depositoId}
                      onChange={e => {
                        const id = parseInt(e.target.value, 10)
                        setDepositoId(id)
                        const ub = ubicaciones.find(u => u.deposito_id === id && u.nombre === "Stock")
                          ?? ubicaciones.find(u => u.deposito_id === id)
                        if (ub) setUbicacionId(ub.id)
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      {depositos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <select
                      value={ubicacionId}
                      onChange={e => setUbicacionId(parseInt(e.target.value, 10))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      {ubicaciones
                        .filter(u => u.deposito_id === depositoId)
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Productos a Remitir</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-4">Producto</th>
                      <th className="text-center py-2 px-4">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3 px-4 font-medium">{l.producto_nombre}</td>
                        <td className="py-3 px-4 text-center">{l.cantidad}</td>
                      </tr>
                    ))}
                    {lineas.length === 0 && (
                      <tr><td colSpan={2} className="text-center py-4 text-gray-400 text-sm">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Confirmación</h3>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmarStock}
                onChange={e => setConfirmarStock(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-gray-900">Confirmar al generar</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Descuenta stock automáticamente y emite el asiento contable de CMV.
                  Si lo destildás, el remito queda en estado <strong>emitido</strong> y se confirma manualmente desde la ficha.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
