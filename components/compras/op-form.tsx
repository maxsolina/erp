"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Plus, Save, Trash2, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"

interface Proveedor {
  id: number
  nombre?: string
  razon_social?: string
  cuit?: string
}
interface Caja { id: string; nombre: string; sucursal: string; activo?: boolean }
interface CajaValor { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }
interface FacturaPendiente {
  id: number
  numero: string
  fecha?: string
  total?: number
  saldo?: number
  proveedor_id: number
  moneda?: string
}

interface MedioPago {
  uid: number
  valor_id: string
  valor_nombre: string
  tipo_valor: string
  importe: number
  moneda: "ARS" | "USD"
}

interface Comprobante {
  uid: number
  factura_id: number
  factura_numero: string
  saldo_actual: number
  importe_a_pagar: number
  moneda: "ARS" | "USD"
}

export default function OpForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const { sucursalActiva } = useERP()
  const isEdit = initialId != null

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cajas, setCajas] = useState<Caja[]>([])
  const [cajaValores, setCajaValores] = useState<CajaValor[]>([])
  const [facturasProveedor, setFacturasProveedor] = useState<FacturaPendiente[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoOP, setCargandoOP] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Form state
  const [numeroExistente, setNumeroExistente] = useState<string | null>(null)
  const [estadoExistente, setEstadoExistente] = useState<string | null>(null)
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorNombre, setProveedorNombre] = useState("")
  const [cajaId, setCajaId] = useState("")
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [observaciones, setObservaciones] = useState("")
  const [medios, setMedios] = useState<MedioPago[]>([])
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])

  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [proveedorDropdownAbierto, setProveedorDropdownAbierto] = useState(false)

  // Modal añadir medio
  const [showAddMedio, setShowAddMedio] = useState(false)
  const [nuevoValorId, setNuevoValorId] = useState("")
  const [nuevoImporte, setNuevoImporte] = useState("")
  const [nuevaMoneda, setNuevaMoneda] = useState<"ARS" | "USD">("ARS")

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/compras/proveedores").then(r => r.json()).catch(() => []),
      fetch("/api/cajas").then(r => r.json()).catch(() => []),
    ]).then(([prov, ca]) => {
      if (!activo) return
      if (Array.isArray(prov)) setProveedores(prov)
      if (Array.isArray(ca)) setCajas(ca)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (!cajaId) { setCajaValores([]); return }
    fetch(`/api/caja-valores?caja_id=${cajaId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCajaValores(d) })
      .catch(() => {})
  }, [cajaId])

  useEffect(() => {
    if (!proveedorId) { setFacturasProveedor([]); return }
    fetch("/api/compras/facturas")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        // Filtrar facturas de este proveedor con saldo > 0 y estado != cancelada
        setFacturasProveedor(data
          .filter(f => Number(f.proveedor_id) === proveedorId
            && Number(f.saldo ?? 0) > 0
            && f.estado !== "cancelada")
          .map(f => ({
            id: f.id, numero: f.numero, fecha: f.fecha,
            total: Number(f.total ?? 0), saldo: Number(f.saldo ?? 0),
            proveedor_id: f.proveedor_id, moneda: f.moneda ?? "ARS",
          })))
      })
      .catch(() => {})
  }, [proveedorId])

  // Cargar OP existente
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/compras/ordenes-pago/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(`Error ${r.status}`)
          setCargandoOP(false)
          return
        }
        const op = await r.json()
        setNumeroExistente(op.numero ?? null)
        setEstadoExistente(op.estado ?? null)
        setProveedorId(op.proveedor_id ?? null)
        setProveedorNombre(op.proveedor_nombre ?? "")
        setCajaId(op.caja_id ?? "")
        setFecha((op.fecha ?? "").slice(0, 10))
        setObservaciones(op.observaciones ?? "")
        setMedios((op.medios_pago ?? []).map((m: any, idx: number) => ({
          uid: idx + 1,
          valor_id: m.valor_id ?? "",
          valor_nombre: m.valor_nombre ?? "",
          tipo_valor: m.tipo_valor ?? "",
          importe: Number(m.importe ?? 0),
          moneda: m.moneda === "USD" ? "USD" : "ARS",
        })))
        setComprobantes((op.comprobantes ?? []).map((c: any, idx: number) => ({
          uid: idx + 1,
          factura_id: c.factura_id ?? c.comprobante_id ?? 0,
          factura_numero: c.factura_numero ?? c.comprobante_referencia ?? "",
          saldo_actual: Number(c.saldo_actual ?? 0),
          importe_a_pagar: Number(c.importe ?? c.importe_a_pagar ?? 0),
          moneda: c.moneda === "USD" ? "USD" : "ARS",
        })))
        setCargandoOP(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red")
        setCargandoOP(false)
      })
  }, [isEdit, initialId])

  const cajasFiltradas = sucursalActiva?.nombre
    ? cajas.filter(c => c.sucursal === sucursalActiva.nombre && c.activo !== false)
    : cajas

  const proveedoresFiltrados = useMemo(() => {
    const q = proveedorBusqueda.trim().toLowerCase()
    if (!q) return proveedores.slice(0, 10)
    return proveedores.filter(p => {
      const name = (p.nombre || p.razon_social || "").toLowerCase()
      return name.includes(q) || (p.cuit ?? "").includes(q)
    }).slice(0, 10)
  }, [proveedores, proveedorBusqueda])

  const totalMedios = medios.reduce((s, m) => s + m.importe, 0)
  const totalAsignado = comprobantes.reduce((s, c) => s + c.importe_a_pagar, 0)
  const noConciliado = Math.max(0, totalMedios - totalAsignado)

  // ─── Acciones ───────────────────────────────────────────────────────────
  const seleccionarProveedor = (p: Proveedor) => {
    setProveedorId(p.id)
    setProveedorNombre(p.nombre || p.razon_social || "")
    setProveedorDropdownAbierto(false)
    setProveedorBusqueda("")
  }

  const agregarMedio = () => {
    if (!nuevoValorId) return
    const v = cajaValores.find(x => x.id === nuevoValorId)
    if (!v) return
    const importe = parseFloat(nuevoImporte) || 0
    if (importe <= 0) return
    setMedios(prev => [...prev, {
      uid: Date.now() + prev.length,
      valor_id: v.id,
      valor_nombre: v.nombre,
      tipo_valor: v.tipo,
      importe,
      moneda: nuevaMoneda,
    }])
    setNuevoValorId("")
    setNuevoImporte("")
    setNuevaMoneda("ARS")
    setShowAddMedio(false)
  }

  const quitarMedio = (uid: number) => setMedios(prev => prev.filter(m => m.uid !== uid))

  const agregarFactura = (fac: FacturaPendiente) => {
    if (comprobantes.some(c => c.factura_id === fac.id)) return
    setComprobantes(prev => [...prev, {
      uid: Date.now() + prev.length,
      factura_id: fac.id,
      factura_numero: fac.numero,
      saldo_actual: Number(fac.saldo ?? 0),
      importe_a_pagar: Number(fac.saldo ?? 0),
      moneda: fac.moneda === "USD" ? "USD" : "ARS",
    }])
  }

  const updateImporteFactura = (uid: number, val: number) => {
    setComprobantes(prev => prev.map(c =>
      c.uid === uid
        ? { ...c, importe_a_pagar: Math.max(0, Math.min(val, c.saldo_actual)) }
        : c
    ))
  }

  const quitarFactura = (uid: number) => setComprobantes(prev => prev.filter(c => c.uid !== uid))

  // ─── Submit ─────────────────────────────────────────────────────────────
  const validar = (): string | null => {
    if (!proveedorId) return "Seleccioná un proveedor"
    if (!cajaId) return "Seleccioná una caja"
    if (medios.length === 0) return "Agregá al menos un medio de pago"
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    if (guardando) return
    setError(null)
    setGuardando(true)

    try {
      const payload = {
        proveedor_id: proveedorId,
        proveedor_nombre: proveedorNombre,
        caja_id: cajaId,
        caja_nombre: cajas.find(c => c.id === cajaId)?.nombre ?? null,
        sucursal: sucursalActiva?.nombre ?? null,
        sucursal_id: sucursalActiva?.id ?? null,
        fecha: new Date(fecha).toISOString(),
        estado: estadoExistente ?? "borrador",
        importe_total: totalMedios,
        importe_no_conciliado: noConciliado,
        observaciones: observaciones || null,
        medios_pago: medios.map(m => ({
          valor_id: m.valor_id,
          valor_nombre: m.valor_nombre,
          tipo_valor: m.tipo_valor,
          importe: m.importe,
          moneda: m.moneda,
        })),
        comprobantes: comprobantes.map(c => ({
          factura_id: c.factura_id,
          factura_numero: c.factura_numero,
          comprobante_referencia: c.factura_numero,
          tipo_comprobante: "factura",
          saldo_actual: c.saldo_actual,
          importe: c.importe_a_pagar,
          importe_a_pagar: c.importe_a_pagar,
          moneda: c.moneda,
        })),
      }
      let res: Response
      if (isEdit && initialId) {
        res = await fetch(`/api/compras/ordenes-pago/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/compras/ordenes-pago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const text = await res.text()
        setError(`Error: ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      router.push(`/compras/op/${data.id ?? initialId}`)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargandoBase || cargandoOP) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/compras/op")} className="text-indigo-700 hover:underline">Volver</button>
      </div>
    )
  }
  if (isEdit && estadoExistente && estadoExistente !== "borrador") {
    return (
      <div className="p-12 text-center">
        <p className="text-amber-700 mb-2">
          Esta OP está en estado <strong>{estadoExistente}</strong> y no puede editarse.
        </p>
        <button onClick={() => router.push(`/compras/op/${initialId}`)} className="text-indigo-700 hover:underline">Ver ficha</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {isEdit ? `Editar ${numeroExistente ?? "OP"}` : "Nueva Orden de Pago"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Modifique el borrador" : "Cargue los medios de pago y las facturas a cancelar"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !proveedorId || !cajaId || medios.length === 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : "Guardar borrador"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white rounded-lg border p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
              <input value={sucursalActiva?.nombre ?? ""} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProveedorDropdownAbierto(o => !o)}
                  className="w-full text-left px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  {proveedorNombre || <span className="text-gray-400">Seleccionar proveedor…</span>}
                </button>
                {proveedorDropdownAbierto && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div className="p-2 border-b">
                      <input
                        autoFocus type="text"
                        value={proveedorBusqueda}
                        onChange={e => setProveedorBusqueda(e.target.value)}
                        placeholder="Buscar proveedor…"
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total medios</label>
                <input value={`$ ${totalMedios.toLocaleString("es-AR")}`} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">No conciliado</label>
                <input value={`$ ${noConciliado.toLocaleString("es-AR")}`} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Caja <span className="text-red-500">*</span>
              </label>
              <select
                value={cajaId}
                onChange={e => setCajaId(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Seleccionar caja…</option>
                {cajasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
              <input value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Medios de pago */}
      <div className="bg-white rounded-lg border mb-4">
        <div className="px-6 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Medios de pago</h3>
          <button
            onClick={() => {
              if (!cajaId) { alert("Seleccioná una caja primero"); return }
              setShowAddMedio(true)
            }}
            className="bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-3">Valor</th>
              <th className="text-right py-2 px-3 w-32">Importe</th>
              <th className="text-center py-2 px-3 w-20">Moneda</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {medios.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-sm text-gray-400">Sin medios cargados.</td></tr>
            )}
            {medios.map(m => (
              <tr key={m.uid} className="border-b">
                <td className="py-2 px-3">{m.valor_nombre}</td>
                <td className="text-right px-3 font-medium">{formatCurrency(m.importe, m.moneda)}</td>
                <td className="text-center px-3 text-xs">{m.moneda}</td>
                <td className="text-right px-3">
                  <button onClick={() => quitarMedio(m.uid)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comprobantes */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-3 border-b">
          <h3 className="font-semibold text-gray-900 text-sm">Facturas a cancelar</h3>
          <p className="text-xs text-gray-500 mt-0.5">Asigná un importe a cada factura del proveedor.</p>
        </div>
        {!proveedorId ? (
          <p className="p-6 text-sm text-gray-400 text-center">Seleccioná un proveedor primero.</p>
        ) : facturasProveedor.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">El proveedor no tiene facturas con saldo pendiente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-3">Factura</th>
                <th className="text-right py-2 px-3">Saldo</th>
                <th className="text-center py-2 px-3 w-16">Mon.</th>
                <th className="text-right py-2 px-3 w-32">A pagar</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {facturasProveedor.filter(f => !comprobantes.some(c => c.factura_id === f.id)).map(f => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-emerald-700">{f.numero}</td>
                  <td className="text-right px-3">{formatCurrency(f.saldo ?? 0, f.moneda as "ARS" | "USD")}</td>
                  <td className="text-center px-3 text-xs">{f.moneda}</td>
                  <td className="text-right px-3">
                    <button
                      onClick={() => agregarFactura(f)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                    >
                      + Agregar
                    </button>
                  </td>
                  <td />
                </tr>
              ))}
              {comprobantes.map(c => (
                <tr key={c.uid} className="border-b bg-emerald-50">
                  <td className="py-2 px-3 font-mono text-emerald-700">{c.factura_numero}</td>
                  <td className="text-right px-3">{formatCurrency(c.saldo_actual, c.moneda)}</td>
                  <td className="text-center px-3 text-xs">{c.moneda}</td>
                  <td className="text-right px-3">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={c.saldo_actual}
                      value={c.importe_a_pagar}
                      onChange={e => updateImporteFactura(c.uid, parseFloat(e.target.value) || 0)}
                      className="w-32 border rounded px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="text-right px-3">
                    <button onClick={() => quitarFactura(c.uid)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="py-2 px-3 text-right">Total asignado:</td>
                <td className="text-right px-3">{formatCurrency(totalAsignado, "ARS")}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Modal añadir medio */}
      {showAddMedio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Añadir medio de pago</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                <select
                  value={nuevoValorId}
                  onChange={e => {
                    setNuevoValorId(e.target.value)
                    // Moneda se deriva del valor seleccionado
                    const v = cajaValores.find(x => x.id === e.target.value)
                    if (v?.moneda === "USD") setNuevaMoneda("USD")
                    else setNuevaMoneda("ARS")
                  }}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {cajaValores.map(v => <option key={v.id} value={v.id}>{v.nombre} · {v.moneda}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Importe{nuevoValorId ? <span className="ml-2 text-xs text-gray-400">(en {nuevaMoneda})</span> : null}
                </label>
                <input
                  type="number" step={0.01} min={0}
                  value={nuevoImporte}
                  onChange={e => setNuevoImporte(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowAddMedio(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={agregarMedio}
                disabled={!nuevoValorId || parseFloat(nuevoImporte) <= 0}
                className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
