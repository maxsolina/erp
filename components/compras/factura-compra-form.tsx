"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Plus, Save, Trash2, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"
import { guardarFacturaCompra } from "@/lib/compras-actions"

interface Proveedor {
  id: number
  nombre?: string
  razon_social?: string
  cuit?: string
  categoria_proveedor?: string | null
}
interface OrdenCompraOpt {
  id: number
  numero: string
  proveedor_id: number
  proveedor_nombre?: string
  moneda?: string
  cotizacion_dia?: number
  tipo_cotizacion?: string
  items?: any[]
  lineas?: any[]
}
interface CategoriaProveedor {
  id: number
  nombre: string
  cuenta_pagar_id?: string | null
  cuenta_pagar_codigo?: string | null
  cuenta_pagar_nombre?: string | null
}

interface LineaForm {
  uid: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento_pct: number
  subtotal: number
  cuenta_contable_id?: string | null
  cuenta_codigo?: string
  cuenta_nombre?: string
}

interface ImpuestoForm {
  uid: number
  nombre: string
  redondeo: number
  importe: number
}

const MONEDAS = [{ codigo: "ARS", nombre: "Pesos" }, { codigo: "USD", nombre: "Dólares" }]
const TIPOS_FACTURA = ["A", "B", "C", "X"]

export default function FacturaCompraForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const { sucursales: sucursalesCtx } = useERP()
  const isEdit = initialId != null

  // Loaders
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompraOpt[]>([])
  const [categoriasProveedor, setCategoriasProveedor] = useState<CategoriaProveedor[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoFC, setCargandoFC] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Form state
  const [numeroExistente, setNumeroExistente] = useState<string | null>(null)
  const [estadoExistente, setEstadoExistente] = useState<string | null>(null)
  const [tipo, setTipo] = useState<string>("A")
  const [numeroComprobante, setNumeroComprobante] = useState<string>("")
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("")
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorNombre, setProveedorNombre] = useState<string>("")
  const [moneda, setMoneda] = useState<string>("ARS")
  const [cotizacion, setCotizacion] = useState<number | null>(null)
  const [tipoCotizacion, setTipoCotizacion] = useState<string>("")
  const [sucursal, setSucursal] = useState<string>("")
  const [ordenCompraId, setOrdenCompraId] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [impuestos, setImpuestos] = useState<ImpuestoForm[]>([])

  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [proveedorDropdownAbierto, setProveedorDropdownAbierto] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/compras/proveedores").then(r => r.json()).catch(() => []),
      fetch("/api/compras/ordenes-compra").then(r => r.json()).catch(() => []),
      fetch("/api/categorias-proveedor").then(r => r.json()).catch(() => []),
    ]).then(([prov, ocs, cats]) => {
      if (!activo) return
      if (Array.isArray(prov)) setProveedores(prov)
      if (Array.isArray(ocs)) setOrdenesCompra(ocs)
      if (Array.isArray(cats)) setCategoriasProveedor(cats)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/compras/facturas/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(r.status === 404 ? "Factura no encontrada" : `Error ${r.status}`)
          setCargandoFC(false)
          return
        }
        const fac = await r.json()
        setNumeroExistente(fac.numero ?? null)
        setEstadoExistente(fac.estado ?? null)
        setTipo(fac.tipo ?? "A")
        setNumeroComprobante(fac.numero_comprobante ?? fac.numero ?? "")
        setFecha((fac.fecha ?? "").slice(0, 10))
        setFechaVencimiento((fac.fecha_vencimiento ?? "").slice(0, 10))
        setProveedorId(fac.proveedor_id ?? null)
        setProveedorNombre(fac.proveedor_nombre ?? "")
        setMoneda(fac.moneda ?? "ARS")
        setCotizacion(fac.cotizacion ?? null)
        setTipoCotizacion(fac.tipo_cotizacion ?? "")
        setSucursal(fac.sucursal ?? "")
        setOrdenCompraId(fac.orden_compra_id ?? null)
        // Cargar líneas
        const lns = Array.isArray(fac.lineas) ? fac.lineas : []
        setLineas(lns.map((l: any, idx: number) => ({
          uid: idx + 1,
          descripcion: l.descripcion ?? "",
          cantidad: Number(l.cantidad ?? 1),
          precio_unitario: Number(l.precio_unitario ?? 0),
          descuento_pct: Number(l.descuento_pct ?? 0),
          subtotal: Number(l.subtotal ?? 0),
          cuenta_contable_id: l.cuenta_contable_id ?? null,
          cuenta_codigo: l.cuenta_codigo ?? "",
          cuenta_nombre: l.cuenta_nombre ?? "",
        })))
        setCargandoFC(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar la factura")
        setCargandoFC(false)
      })
  }, [isEdit, initialId])

  // ─── Helpers ────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0), [lineas])
  const totalImpuestos = useMemo(() => impuestos.reduce((s, t) => s + (t.importe ?? 0), 0), [impuestos])
  const total = subtotal + totalImpuestos

  const proveedoresFiltrados = useMemo(() => {
    const q = proveedorBusqueda.trim().toLowerCase()
    if (!q) return proveedores.slice(0, 10)
    return proveedores.filter(p => {
      const name = (p.nombre || p.razon_social || "").toLowerCase()
      return name.includes(q) || (p.cuit ?? "").includes(q)
    }).slice(0, 10)
  }, [proveedores, proveedorBusqueda])

  const ocsFiltradas = useMemo(() => {
    return ordenesCompra.filter(oc => !proveedorId || oc.proveedor_id === proveedorId)
  }, [ordenesCompra, proveedorId])

  const seleccionarProveedor = (p: Proveedor) => {
    setProveedorId(p.id)
    setProveedorNombre(p.nombre || p.razon_social || "")
    setProveedorDropdownAbierto(false)
    setProveedorBusqueda("")
    // Auto-llenar cuenta contable de las líneas con la categoría del proveedor
    if (p.categoria_proveedor) {
      const cat = categoriasProveedor.find(c => c.nombre === p.categoria_proveedor)
      if (cat?.cuenta_pagar_id) {
        setLineas(prev => prev.map(l => ({
          ...l,
          cuenta_contable_id: cat.cuenta_pagar_id,
          cuenta_codigo: cat.cuenta_pagar_codigo ?? "",
          cuenta_nombre: cat.cuenta_pagar_nombre ?? "",
        })))
      }
    }
  }

  const updateLinea = (idx: number, patch: Partial<LineaForm>) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const merged = { ...l, ...patch }
      merged.subtotal = merged.cantidad * merged.precio_unitario * (1 - merged.descuento_pct / 100)
      return merged
    }))
  }

  const agregarLinea = () => {
    const cat = proveedorId
      ? (() => {
          const prov = proveedores.find(p => p.id === proveedorId)
          if (!prov?.categoria_proveedor) return null
          return categoriasProveedor.find(c => c.nombre === prov.categoria_proveedor) ?? null
        })()
      : null
    setLineas(prev => [...prev, {
      uid: Date.now() + prev.length,
      descripcion: "",
      cantidad: 1,
      precio_unitario: 0,
      descuento_pct: 0,
      subtotal: 0,
      cuenta_contable_id: cat?.cuenta_pagar_id ?? null,
      cuenta_codigo: cat?.cuenta_pagar_codigo ?? "",
      cuenta_nombre: cat?.cuenta_pagar_nombre ?? "",
    }])
  }

  const quitarLinea = (idx: number) => setLineas(prev => prev.filter((_, i) => i !== idx))

  const importarLineasDesdeOC = () => {
    if (!ordenCompraId) return
    const oc = ordenesCompra.find(o => o.id === ordenCompraId)
    if (!oc) return
    const items = oc.items ?? oc.lineas ?? []
    const cat = (() => {
      if (!proveedorId) return null
      const prov = proveedores.find(p => p.id === proveedorId)
      if (!prov?.categoria_proveedor) return null
      return categoriasProveedor.find(c => c.nombre === prov.categoria_proveedor) ?? null
    })()
    setLineas(items.map((item: any, idx: number) => ({
      uid: Date.now() + idx,
      descripcion: item.descripcion ?? item.producto_nombre ?? "",
      cantidad: Number(item.cantidad ?? 1),
      precio_unitario: Number(item.precio_unitario ?? 0),
      descuento_pct: 0,
      subtotal: Number(item.cantidad ?? 1) * Number(item.precio_unitario ?? 0),
      cuenta_contable_id: cat?.cuenta_pagar_id ?? null,
      cuenta_codigo: cat?.cuenta_pagar_codigo ?? "",
      cuenta_nombre: cat?.cuenta_pagar_nombre ?? "",
    })))
    if (oc.moneda) setMoneda(oc.moneda)
    if (oc.cotizacion_dia) setCotizacion(oc.cotizacion_dia)
    if (oc.tipo_cotizacion) setTipoCotizacion(oc.tipo_cotizacion)
  }

  const updateImpuesto = (idx: number, patch: Partial<ImpuestoForm>) =>
    setImpuestos(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t))
  const agregarImpuesto = () => setImpuestos(prev => [...prev, { uid: Date.now() + prev.length, nombre: "", redondeo: 0, importe: 0 }])
  const quitarImpuesto = (idx: number) => setImpuestos(prev => prev.filter((_, i) => i !== idx))

  // ─── Submit ─────────────────────────────────────────────────────────────
  const validar = (): string | null => {
    if (!proveedorId || !proveedorNombre) return "Debe seleccionar un proveedor"
    if (lineas.length === 0) return "Debe agregar al menos una línea"
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    if (guardando) return
    setError(null)
    setGuardando(true)

    try {
      const payload: Record<string, any> = {
        numero: isEdit ? numeroExistente : (numeroComprobante || null),
        tipo,
        fecha: fecha || new Date().toISOString().split("T")[0],
        fecha_vencimiento: fechaVencimiento || null,
        proveedor_id: proveedorId,
        proveedor_nombre: proveedorNombre,
        estado: estadoExistente ?? "borrador",
        moneda,
        cotizacion: cotizacion,
        tipo_cotizacion: tipoCotizacion || null,
        sucursal: sucursal || null,
        subtotal,
        impuestos: totalImpuestos,
        total,
        saldo: total,
        orden_compra_id: ordenCompraId,
        lineas: lineas.map((l, i) => ({
          orden: i,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          descuento_pct: l.descuento_pct,
          subtotal: l.subtotal,
          cuenta_contable_id: l.cuenta_contable_id,
          cuenta_codigo: l.cuenta_codigo,
          cuenta_nombre: l.cuenta_nombre,
        })),
      }
      const created = await guardarFacturaCompra(payload, isEdit ? initialId : undefined)
      router.push(`/compras/facturas/${created.id ?? initialId}`)
    } catch (e: any) {
      setError(`Error al guardar: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargandoBase || cargandoFC) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/compras/facturas")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }
  if (isEdit && estadoExistente && estadoExistente !== "borrador") {
    return (
      <div className="p-12 text-center">
        <p className="text-amber-700 mb-2">
          Esta factura está en estado <strong>{estadoExistente}</strong> y no puede editarse.
        </p>
        <button onClick={() => router.push(`/compras/facturas/${initialId}`)} className="text-indigo-700 hover:underline">
          Ver ficha
        </button>
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
              {isEdit ? `Editar ${numeroExistente ?? "Factura"}` : "Nueva Factura de Compra"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Modifique el borrador" : "Cargue la factura recibida del proveedor"}
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
            disabled={guardando || !proveedorId}
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
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Datos del comprobante</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
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
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TIPOS_FACTURA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">N° comprobante</label>
            <input
              type="text"
              value={numeroComprobante}
              onChange={e => setNumeroComprobante(e.target.value)}
              placeholder="Ej: 0001-00012345"
              disabled={isEdit}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={e => setFechaVencimiento(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select
              value={moneda}
              onChange={e => {
                setMoneda(e.target.value)
                if (e.target.value === "ARS") {
                  setCotizacion(null)
                  setTipoCotizacion("")
                } else if (!tipoCotizacion) {
                  setTipoCotizacion("blue")
                }
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONEDAS.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
            </select>
          </div>
          {moneda !== "ARS" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cotización</label>
                <input
                  type="number"
                  step={0.01}
                  value={cotizacion ?? ""}
                  onChange={e => setCotizacion(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo cotización</label>
                <select
                  value={tipoCotizacion}
                  onChange={e => setTipoCotizacion(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar…</option>
                  <option value="oficial">Oficial</option>
                  <option value="blue">Blue</option>
                  <option value="ccl">CCL</option>
                  <option value="mep">MEP</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              OC vinculada <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <select
              value={ordenCompraId ?? ""}
              onChange={e => setOrdenCompraId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin OC</option>
              {ocsFiltradas.map(oc => (
                <option key={oc.id} value={oc.id}>
                  {oc.numero} — {oc.proveedor_nombre}
                </option>
              ))}
            </select>
          </div>
          {ordenCompraId && (
            <button
              onClick={importarLineasDesdeOC}
              className="px-3 py-2 text-sm border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
            >
              Importar líneas desde OC
            </button>
          )}
        </div>
      </div>

      {/* Líneas */}
      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="px-6 py-2 bg-gray-50 border-b">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Líneas</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Cant.</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Precio</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Dto. %</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Subtotal</th>
              <th className="w-10 py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                  No hay líneas. Agregue una para comenzar.
                </td>
              </tr>
            )}
            {lineas.map((l, idx) => (
              <tr key={l.uid} className="hover:bg-gray-50">
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={l.descripcion}
                    onChange={e => updateLinea(idx, { descripcion: e.target.value })}
                    placeholder="Detalle del ítem"
                    className="w-full border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                  />
                  {l.cuenta_codigo && (
                    <div className="text-xs text-gray-400 mt-0.5">{l.cuenta_codigo} — {l.cuenta_nombre}</div>
                  )}
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={l.cantidad}
                    onChange={e => updateLinea(idx, { cantidad: Number(e.target.value) })}
                    className="w-20 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={l.precio_unitario}
                    onChange={e => updateLinea(idx, { precio_unitario: Number(e.target.value) })}
                    className="w-28 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={l.descuento_pct}
                    onChange={e => updateLinea(idx, { descuento_pct: Number(e.target.value) })}
                    className="w-20 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                  />
                </td>
                <td className="py-2 px-3 text-right font-medium text-gray-800">
                  {formatCurrency(l.subtotal, moneda as "ARS" | "USD")}
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => quitarLinea(idx)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-dashed border-gray-200">
          <button onClick={agregarLinea} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4" /> Añadir un elemento
          </button>
        </div>
      </div>

      {/* Impuestos + Totales */}
      <div className="bg-white rounded-lg border flex">
        <div className="flex-1 border-r">
          <div className="px-6 py-2 bg-gray-50 border-b">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impuestos</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase">Impuesto</th>
                <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase w-28">Redondeo</th>
                <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Importe</th>
                <th className="py-2 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {impuestos.map((imp, idx) => (
                <tr key={imp.uid} className="hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={imp.nombre}
                      onChange={e => updateImpuesto(idx, { nombre: e.target.value })}
                      placeholder="IVA 21%, Percepción IIBB…"
                      className="w-full border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      step={0.01}
                      value={imp.redondeo}
                      onChange={e => updateImpuesto(idx, { redondeo: Number(e.target.value) })}
                      className="w-28 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      step={0.01}
                      value={imp.importe}
                      onChange={e => updateImpuesto(idx, { importe: Number(e.target.value) })}
                      className="w-32 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent font-medium"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <button onClick={() => quitarImpuesto(idx)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-dashed border-gray-200">
            <button onClick={agregarImpuesto} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
              <Plus className="w-4 h-4" /> Añadir un impuesto
            </button>
          </div>
        </div>
        <div className="w-72 px-6 py-5 space-y-2 text-sm self-start">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal, moneda as "ARS" | "USD")}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Impuestos:</span>
            <span className="font-medium">{formatCurrency(totalImpuestos, moneda as "ARS" | "USD")}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
            <span>Total:</span>
            <span>{formatCurrency(total, moneda as "ARS" | "USD")}</span>
          </div>
          {moneda !== "ARS" && cotizacion && (
            <div className="flex justify-between text-gray-400 text-xs pt-1 border-t">
              <span>Equivalente ARS:</span>
              <span>{formatCurrency(total * cotizacion, "ARS")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
