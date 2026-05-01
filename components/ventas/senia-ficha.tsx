"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, DollarSign, Plus, Trash2, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import {
  diasRestantes,
  formatCurrency,
  formatDate,
  getEstadoSeniaColor,
  getEstadoSeniaLabel,
  type SeniaEquipo,
} from "./_shared"

interface CajaOpt { id: string; nombre: string; sucursal: string; activo?: boolean }
interface CajaValor { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }

export default function SeniaFicha({ seniaId }: { seniaId: number }) {
  const router = useRouter()
  const { sucursalActiva } = useERP()
  const [senia, setSenia] = useState<SeniaEquipo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [accionando, setAccionando] = useState(false)

  // Modal: registrar seña
  const [showRegistrarModal, setShowRegistrarModal] = useState(false)
  const [montoInput, setMontoInput] = useState(0)
  const [cajaId, setCajaId] = useState("")
  const [cajaValorId, setCajaValorId] = useState("")
  const [cotizacionPago, setCotizacionPago] = useState(1)
  const [cajas, setCajas] = useState<CajaOpt[]>([])
  const [cajaValores, setCajaValores] = useState<CajaValor[]>([])

  // Modal: confirmar cierre
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [mediosCierre, setMediosCierre] = useState<{ medio: string; monto: number }[]>([{ medio: "efectivo", monto: 0 }])

  // Modal: cancelar
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")

  // Inline: actualizar fecha
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [fechaLimiteEdit, setFechaLimiteEdit] = useState("")

  // Cross-refs resolvers
  const [nvId, setNvId] = useState<number | null>(null)
  const [oeId, setOeId] = useState<number | null>(null)
  const [remitoId, setRemitoId] = useState<number | null>(null)
  const [facturaId, setFacturaId] = useState<number | null>(null)

  const recargar = async () => {
    const r = await fetch(`/api/senias-equipo?id=${seniaId}`)
    if (!r.ok) return
    const data = await r.json()
    const item = Array.isArray(data) ? data[0] : data
    if (item?.id) setSenia(item)
  }

  useEffect(() => {
    fetch(`/api/senias-equipo?id=${seniaId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setSenia(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item || !item.id) {
          setError("Seña no encontrada")
          setSenia(null)
          return
        }
        setSenia(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la seña")
        setSenia(null)
      })
  }, [seniaId])

  // Cargar cajas para modal registrar
  useEffect(() => {
    fetch("/api/cajas").then(r => r.json()).then(d => { if (Array.isArray(d)) setCajas(d) }).catch(() => {})
  }, [])
  useEffect(() => {
    if (!cajaId) { setCajaValores([]); return }
    fetch(`/api/caja-valores?caja_id=${cajaId}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCajaValores(d) }).catch(() => {})
  }, [cajaId])

  // Resolver IDs de docs vinculados
  useEffect(() => {
    if (!senia) return
    if (senia.nota_venta_id) setNvId(Number(senia.nota_venta_id))
    if (senia.oe_id) setOeId(Number(senia.oe_id))
    if (senia.remito_id) setRemitoId(Number(senia.remito_id))
    if (senia.factura_id) setFacturaId(Number(senia.factura_id))
  }, [senia])

  const cajasFiltradas = sucursalActiva?.nombre
    ? cajas.filter(c => c.sucursal === sucursalActiva.nombre && c.activo !== false)
    : cajas

  // ─── Acciones ─────────────────────────────────────────────────────────
  const registrarSenia = async () => {
    if (montoInput <= 0) { alert("Monto inválido"); return }
    if (!cajaId || !cajaValorId) { alert("Seleccioná caja y valor"); return }
    if (accionando) return
    setAccionando(true)
    try {
      const valor = cajaValores.find(v => v.id === cajaValorId)
      const res = await fetch(`/api/senias-equipo/${seniaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "registrar_senia",
          monto_senia: montoInput,
          medio_pago_senia: valor?.tipo ?? "efectivo",
          cotizacion_senia: cotizacionPago,
          moneda_pago: valor?.moneda ?? "ARS",
          caja_id: cajaId,
          caja_valor_id: cajaValorId,
          sucursal_id: sucursalActiva?.id ?? null,
          usuario: "Operador",
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error: ${text}`)
        return
      }
      await recargar()
      setShowRegistrarModal(false)
      setMontoInput(0)
      setCajaValorId("")
    } finally {
      setAccionando(false)
    }
  }

  const confirmarCierre = async () => {
    if (mediosCierre.length === 0) { alert("Agregá al menos un medio"); return }
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/senias-equipo/${seniaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "confirmar_cierre",
          medios_pago_cierre: mediosCierre,
          usuario: "Operador",
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error: ${text}`)
        return
      }
      await recargar()
      setShowCierreModal(false)
      setMediosCierre([{ medio: "efectivo", monto: 0 }])
    } finally {
      setAccionando(false)
    }
  }

  const cancelarSenia = async () => {
    if (!motivoCancel.trim()) { alert("Ingresá un motivo"); return }
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/senias-equipo/${seniaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "cancelar", motivo: motivoCancel, usuario: "Operador" }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error: ${text}`)
        return
      }
      await recargar()
      setShowCancelarModal(false)
      setMotivoCancel("")
    } finally {
      setAccionando(false)
    }
  }

  const actualizarFecha = async () => {
    if (!fechaLimiteEdit) return
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/senias-equipo/${seniaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "actualizar_fecha_limite", fecha_limite: fechaLimiteEdit, usuario: "Operador" }),
      })
      if (!res.ok) return
      await recargar()
      setEditandoFecha(false)
    } finally {
      setAccionando(false)
    }
  }

  if (senia === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando seña...</div>
  }
  if (senia === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Seña no encontrada"}</p>
        <Link href="/ventas/senia-equipo" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = senia.moneda ?? "ARS"
  const dias = diasRestantes(senia.fecha_limite)
  const vencida = dias !== null && dias < 0 && senia.estado === "en_curso"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/senia-equipo")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{senia.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoSeniaColor(senia.estado)}`}>
          {getEstadoSeniaLabel(senia.estado)}
        </span>
        {vencida && (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
            Vencida hace {Math.abs(dias!)} días
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {senia.estado === "en_curso" && senia.estado_senia !== "registrada" && (
            <button
              onClick={() => {
                setMontoInput(senia.precio_final ?? 0)
                setShowRegistrarModal(true)
              }}
              className="text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <DollarSign className="w-4 h-4" />
              Registrar Seña
            </button>
          )}
          {senia.estado === "en_curso" && senia.estado_senia === "registrada" && (
            <button
              onClick={() => {
                const saldoPend = Math.max(0, (senia.precio_final ?? 0) - (senia.monto_senia ?? 0))
                setMediosCierre([{ medio: "efectivo", monto: saldoPend }])
                setShowCierreModal(true)
              }}
              className="text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar Cierre
            </button>
          )}
          {senia.estado === "en_curso" && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="text-sm border border-red-300 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={senia.numero} />
            <Row label="Fecha" value={formatDate(senia.fecha)} />
            <Row label="Cliente" value={senia.cliente_nombre ?? "—"} />
            <div className="flex justify-between gap-4 items-center">
              <span className="text-gray-500 shrink-0">Fecha límite</span>
              {editandoFecha && senia.estado === "en_curso" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={fechaLimiteEdit}
                    onChange={e => setFechaLimiteEdit(e.target.value)}
                    className="border rounded px-2 py-0.5 text-xs"
                  />
                  <button
                    onClick={actualizarFecha}
                    disabled={accionando}
                    className="text-xs bg-emerald-700 text-white px-2 py-0.5 rounded disabled:opacity-50"
                  >OK</button>
                  <button
                    onClick={() => setEditandoFecha(false)}
                    className="text-xs text-gray-500 px-2 py-0.5"
                  >X</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-right">
                    {senia.fecha_limite ? formatDate(senia.fecha_limite) : "—"}
                  </span>
                  {senia.estado === "en_curso" && (
                    <button
                      onClick={() => {
                        setFechaLimiteEdit(senia.fecha_limite ?? "")
                        setEditandoFecha(true)
                      }}
                      className="text-xs text-indigo-700 hover:underline"
                    >Editar</button>
                  )}
                </div>
              )}
            </div>
            {dias !== null && senia.estado === "en_curso" && (
              <Row label="Días restantes" value={vencida ? `Vencida hace ${Math.abs(dias)} días` : dias === 0 ? "Hoy" : `${dias} días`} />
            )}
            <Row label="Moneda" value={moneda} />
            {senia.cotizacion != null && <Row label="Cotización" value={String(senia.cotizacion)} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Equipo</h3>
          <div className="space-y-3 text-sm">
            <Row label="Equipo" value={senia.equipo_nombre ?? "—"} />
            {senia.equipo_imei && <Row label="IMEI" value={senia.equipo_imei} />}
            {senia.equipo_color && <Row label="Color" value={senia.equipo_color} />}
            {senia.equipo_bateria != null && <Row label="Batería" value={`${senia.equipo_bateria}%`} />}
            {senia.precio_venta != null && <Row label="Precio venta" value={formatCurrency(senia.precio_venta, moneda)} />}
            {senia.descuento != null && senia.descuento > 0 && <Row label="Descuento" value={formatCurrency(senia.descuento, moneda)} />}
            <Row label="Precio final" value={formatCurrency(senia.precio_final, moneda)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Seña</h3>
          <div className="space-y-3 text-sm">
            <Row label="Estado seña" value={senia.estado_senia === "registrada" ? "Registrada" : "Sin seña"} />
            {senia.monto_senia != null && <Row label="Monto" value={formatCurrency(senia.monto_senia, moneda)} />}
            {senia.medio_pago_senia && <Row label="Medio de pago" value={senia.medio_pago_senia} />}
            {senia.recibo_senia_numero && <Row label="Recibo" value={senia.recibo_senia_numero} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Documentos vinculados</h3>
          <div className="space-y-3 text-sm">
            {senia.nota_venta_numero && (
              <DocRow label="Nota de Venta" numero={senia.nota_venta_numero} href={nvId ? `/ventas/nv/${nvId}` : null} />
            )}
            {senia.oe_numero && (
              <DocRow label="OE" numero={senia.oe_numero} href={oeId ? `/ventas/oe/${oeId}` : null} />
            )}
            {senia.remito_numero && (
              <DocRow label="Remito" numero={senia.remito_numero} href={remitoId ? `/ventas/remitos/${remitoId}` : null} />
            )}
            {senia.factura_numero && (
              <DocRow label="Factura" numero={senia.factura_numero} href={facturaId ? `/ventas/facturas/${facturaId}` : null} />
            )}
            {!senia.nota_venta_numero && !senia.oe_numero && !senia.remito_numero && !senia.factura_numero && (
              <p className="text-xs text-gray-400">Aún sin documentos asociados</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Registrar Seña */}
      {showRegistrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Registrar Seña</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto</label>
                <input
                  type="number"
                  value={montoInput}
                  onChange={e => setMontoInput(parseFloat(e.target.value) || 0)}
                  step={0.01}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Caja</label>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Forma de pago</label>
                <select
                  value={cajaValorId}
                  onChange={e => setCajaValorId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  disabled={!cajaId}
                >
                  <option value="">Seleccionar…</option>
                  {cajaValores.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.tipo}{v.subtipo ? `/${v.subtipo}` : ""})</option>)}
                </select>
              </div>
              {cajaValores.find(v => v.id === cajaValorId)?.moneda === "USD" && moneda === "ARS" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cotización USD→ARS</label>
                  <input
                    type="number"
                    value={cotizacionPago}
                    onChange={e => setCotizacionPago(parseFloat(e.target.value) || 1)}
                    step={0.01}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowRegistrarModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={registrarSenia}
                disabled={accionando || !cajaValorId || montoInput <= 0}
                className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Registrando…" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Cierre */}
      {showCierreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Cierre de Seña</h3>
            <p className="text-sm text-gray-500 mb-3">
              Saldo pendiente: <strong>{formatCurrency(Math.max(0, (senia.precio_final ?? 0) - (senia.monto_senia ?? 0)), moneda)}</strong>.
              Distribuilo entre los medios de pago para cerrar la operación. Se generan Remito y Factura automáticamente.
            </p>
            <div className="space-y-2 mb-3">
              {mediosCierre.map((mp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={mp.medio}
                    onChange={e => setMediosCierre(prev => prev.map((m, i) => i === idx ? { ...m, medio: e.target.value } : m))}
                    className="border rounded px-2 py-1 text-sm flex-1"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="toma_equipo">Toma de equipo</option>
                  </select>
                  <input
                    type="number"
                    value={mp.monto}
                    onChange={e => setMediosCierre(prev => prev.map((m, i) => i === idx ? { ...m, monto: parseFloat(e.target.value) || 0 } : m))}
                    step={0.01}
                    className="w-32 border rounded px-2 py-1 text-sm text-right"
                  />
                  {mediosCierre.length > 1 && (
                    <button
                      onClick={() => setMediosCierre(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setMediosCierre(prev => [...prev, { medio: "efectivo", monto: 0 }])}
                className="text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar medio
              </button>
            </div>
            <div className="bg-gray-50 rounded p-2 mb-3 text-sm flex justify-between">
              <span className="text-gray-600">Total ingresado:</span>
              <span className="font-bold">{formatCurrency(mediosCierre.reduce((s, m) => s + (m.monto || 0), 0), moneda)}</span>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCierreModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Volver
              </button>
              <button
                onClick={confirmarCierre}
                disabled={accionando || mediosCierre.length === 0}
                className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Cerrando…" : "Confirmar Cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelar Seña */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Seña {senia.numero}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Si la seña tenía un pago registrado, se generará una Nota de Crédito por ese monto.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo *</label>
            <textarea
              value={motivoCancel}
              onChange={e => setMotivoCancel(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowCancelarModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Volver
              </button>
              <button
                onClick={cancelarSenia}
                disabled={accionando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Cancelando…" : "Cancelar Seña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {senia.medios_pago_cierre && senia.medios_pago_cierre.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Medios de pago al cierre</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Medio</th>
                <th className="text-right py-2 px-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {senia.medios_pago_cierre.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{m.medio}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(m.monto, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value || "—"}</span>
    </div>
  )
}

function DocRow({ label, numero, href }: { label: string; numero: string; href: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      {href ? (
        <Link href={href} className="font-medium text-emerald-700 hover:underline font-mono text-right">
          {numero}
        </Link>
      ) : (
        <span className="font-medium text-gray-900 text-right">{numero}</span>
      )}
    </div>
  )
}
