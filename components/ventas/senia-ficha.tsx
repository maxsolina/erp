"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Banknote,
  Battery,
  CheckCircle,
  CreditCard,
  Edit,
  Eye,
  FileText,
  History,
  Package,
  Plus,
  Receipt,
  Repeat,
  Smartphone,
  Truck,
  X,
  XCircle,
} from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
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

interface SeguimientoEntry {
  fecha: string
  usuario: string
  accion: string
  detalle?: string
}

export default function SeniaFicha({ seniaId }: { seniaId: number }) {
  const router = useRouter()
  const { sucursalActiva } = useERP()
  const [senia, setSenia] = useState<SeniaEquipo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [accionando, setAccionando] = useState(false)

  // Inline form: registrar seña
  const [montoInput, setMontoInput] = useState(0)
  const [cajaId, setCajaId] = useState("")
  const [cajaValorId, setCajaValorId] = useState("")
  const [medioPagoNombre, setMedioPagoNombre] = useState("")
  const [cotizacionPago, setCotizacionPago] = useState(0)
  const [cotizacionFuente, setCotizacionFuente] = useState<"senia" | "blue_dia" | "manual">("senia")
  const [cajas, setCajas] = useState<CajaOpt[]>([])
  const [cajaValores, setCajaValores] = useState<CajaValor[]>([])

  // Inline: confirmar cierre
  const [mediosCierre, setMediosCierre] = useState<{ medio: string; monto: number }[]>([{ medio: "efectivo", monto: 0 }])

  // Inline: cancelar seña (toggle)
  const [cancelandoInline, setCancelandoInline] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")

  // Inline: actualizar fecha límite
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

  useEffect(() => {
    fetch("/api/cajas").then(r => r.json()).then(d => { if (Array.isArray(d)) setCajas(d) }).catch(() => {})
    // Cotización USD blue del día — para mostrarla readonly en el form de seña
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.ok ? r.json() : null)
      .then(cot => {
        if (cot?.tasa) {
          setCotizacionPago(Number(cot.tasa))
          setCotizacionFuente("blue_dia")
        }
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!cajaId) { setCajaValores([]); return }
    fetch(`/api/caja-valores?caja_id=${cajaId}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCajaValores(d) }).catch(() => {})
  }, [cajaId])

  useEffect(() => {
    if (!senia) return
    if (senia.nota_venta_id) setNvId(Number(senia.nota_venta_id))
    if (senia.oe_id) setOeId(Number(senia.oe_id))
    if (senia.remito_id) setRemitoId(Number(senia.remito_id))
    if (senia.factura_id) setFacturaId(Number(senia.factura_id))
  }, [senia])

  // Default monto al precio_final cuando se carga la seña.
  // Cotización: si la seña tiene cotización propia, se usa esa; si no, la del
  // día (blue) que ya cargamos en otro useEffect.
  useEffect(() => {
    if (senia?.precio_final && montoInput === 0) {
      setMontoInput(senia.precio_final)
    }
    if (senia?.cotizacion && cotizacionPago === 0) {
      setCotizacionPago(Number(senia.cotizacion))
      setCotizacionFuente("senia")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          medio_pago_senia: medioPagoNombre || valor?.nombre || valor?.tipo || "efectivo",
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
      setMediosCierre([{ medio: "efectivo", monto: 0 }])
    } finally {
      setAccionando(false)
    }
  }

  const cancelarSenia = async () => {
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
      setCancelandoInline(false)
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
  const saldoPendiente = Math.max(0, (senia.precio_final ?? 0) - (senia.monto_senia ?? 0))
  const totalCierre = mediosCierre.reduce((a, m) => a + (m.monto || 0), 0)
  const fmtImpSenia = (n: number | null | undefined) =>
    moneda === "USD"
      ? `USD ${Number(n ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
      : formatCurrency(n, moneda)
  const fechaHora = (() => {
    if (!senia.fecha) return ""
    const d = new Date(senia.fecha)
    if (isNaN(d.getTime())) return senia.fecha
    return d.toLocaleDateString("es-AR") + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  })()

  // Documentos generados (con icons al estilo monolito)
  type DocItem = { label: string; href: string | null; numero: string | null | undefined; icon: typeof FileText; color: string }
  const docs: DocItem[] = [
    { label: "Nota de Venta",    href: nvId ? `/ventas/nv/${nvId}` : null, numero: senia.nota_venta_numero, icon: FileText, color: "text-blue-600" },
    { label: "Orden de Entrega", href: oeId ? `/ventas/oe/${oeId}` : null, numero: senia.oe_numero,         icon: Truck,    color: "text-amber-600" },
    ...(senia.remito_id   ? [{ label: "Remito",      href: remitoId ? `/ventas/remitos/${remitoId}` : null, numero: senia.remito_numero,        icon: Package,    color: "text-orange-600" }] : []),
    ...(senia.factura_id  ? [{ label: "Factura",     href: facturaId ? `/ventas/facturas/${facturaId}` : null, numero: senia.factura_numero,    icon: Receipt,    color: "text-purple-600" }] : []),
    ...(senia.recibo_senia_numero ? [{ label: "Recibo Seña", href: null,                                 numero: senia.recibo_senia_numero,    icon: CreditCard, color: "text-emerald-600" }] : []),
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BotonVolver onClick={() => router.push("/ventas/senia-equipo")} variant="minimal" texto="" />
        <div>
          <h1 className="text-2xl font-bold text-amber-900">{senia.numero}</h1>
          <p className="text-sm text-gray-500">{fechaHora}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {moneda === "USD" && (senia.cotizacion ?? 0) > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              USD @ ${Number(senia.cotizacion).toLocaleString("es-AR")}
            </span>
          )}
          {senia.estado === "en_curso" && dias !== null && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              vencida ? "bg-red-100 text-red-700"
              : dias <= 3 ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
            }`}>
              {vencida ? `Vencida hace ${Math.abs(dias)} día(s)`
                : dias === 0 ? "Vence hoy"
                : `${dias} día(s) restantes`}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoSeniaColor(senia.estado)}`}>
            {getEstadoSeniaLabel(senia.estado)}
          </span>
        </div>
      </div>

      {/* Datos de la Operación + Equipo (2 cols) */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos de la Operación</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={senia.numero} />
            <Row label="Fecha" value={fechaHora} />
            <Row label="Cliente" value={senia.cliente_nombre ?? "—"} />
            <Row label="Sucursal" value={sucursalActiva?.nombre ?? "—"} />
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-500 shrink-0">Fecha límite</span>
              <div className="flex items-center gap-2">
                {editandoFecha && senia.estado === "en_curso" ? (
                  <>
                    <input
                      type="date"
                      value={fechaLimiteEdit}
                      onChange={e => setFechaLimiteEdit(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button onClick={actualizarFecha} disabled={accionando}
                      className="text-xs bg-indigo-900 text-white px-2 py-1 rounded hover:bg-indigo-800 disabled:opacity-50">Guardar</button>
                    <button onClick={() => setEditandoFecha(false)}
                      className="text-xs text-gray-500 hover:underline">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className={`font-medium ${vencida ? "text-red-600" : ""}`}>
                      {senia.fecha_limite ? formatDate(senia.fecha_limite) : "—"}
                    </span>
                    {senia.estado === "en_curso" && (
                      <button
                        onClick={() => { setFechaLimiteEdit(senia.fecha_limite ?? ""); setEditandoFecha(true) }}
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Modificar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <Row label="Moneda" value={moneda} />
            {senia.cotizacion != null && <Row label="Cotización" value={String(senia.cotizacion)} />}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" /> Equipo
          </h3>
          <div className="space-y-3 text-sm">
            <Row label="Modelo" value={senia.equipo_nombre ?? "—"} />
            {senia.equipo_imei && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">IMEI / S/N</span>
                <span className="font-mono text-xs text-right">{senia.equipo_imei}</span>
              </div>
            )}
            {senia.equipo_color && <Row label="Color" value={senia.equipo_color} />}
            {senia.equipo_bateria != null && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Batería</span>
                <span className="font-medium flex items-center gap-1">
                  <Battery className="w-3 h-3" />{senia.equipo_bateria}%
                </span>
              </div>
            )}
            <div className="border-t pt-3 space-y-1">
              {senia.precio_venta != null && (
                <div className="flex justify-between"><span className="text-gray-500">Precio venta</span><span className="font-medium">{fmtImpSenia(senia.precio_venta)}</span></div>
              )}
              {senia.descuento != null && senia.descuento > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Descuento</span><span className="text-red-600 font-medium">-{fmtImpSenia(senia.descuento)}</span></div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Precio final acordado</span>
                <span className="text-emerald-600 text-base">{fmtImpSenia(senia.precio_final)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque: Seña (pago adelantado) — INLINE form si no registrada */}
      <div className="bg-white rounded-lg border p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" /> Seña (pago adelantado)
        </h3>
        {senia.estado_senia === "registrada" ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="text-green-800 font-medium">
              Seña registrada: {fmtImpSenia(senia.monto_senia)}
              {(senia as { monto_senia_usd?: number }).monto_senia_usd != null && moneda !== "USD" && (
                <span className="ml-2 text-blue-700 font-semibold">
                  → USD {Number((senia as { monto_senia_usd?: number }).monto_senia_usd).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  {(senia as { cotizacion_senia?: number }).cotizacion_senia
                    ? ` @ $${(senia as { cotizacion_senia?: number }).cotizacion_senia}` : ""}
                </span>
              )}
            </p>
            <p className="text-green-600 text-xs mt-0.5">
              Medio: {senia.medio_pago_senia}
              {senia.recibo_senia_numero ? ` · Recibo: ${senia.recibo_senia_numero}` : ""}
            </p>
            <p className="text-blue-600 text-xs mt-1 font-medium">
              Imputado en cuenta corriente {moneda} del cliente
            </p>
          </div>
        ) : senia.estado === "en_curso" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Sin seña registrada. Podés registrar el pago adelantado ahora o más adelante.</p>
            {(() => {
              const valor = cajaValores.find(v => v.id === cajaValorId)
              const monedaPago = valor?.moneda as ("ARS" | "USD" | undefined)
              const monedaPagoOK = monedaPago === "ARS" || monedaPago === "USD"
              const monedasDifieren = monedaPagoOK && monedaPago !== moneda
              const cotOK = cotizacionPago > 0
              const equivEnSenia = monedasDifieren && cotOK && montoInput > 0
                ? (moneda === "USD" ? montoInput / cotizacionPago : montoInput * cotizacionPago)
                : null
              return (
                <>
                  {/* Fila 1: Caja + Forma de pago */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Caja</label>
                      <select
                        value={cajaId}
                        onChange={e => { setCajaId(e.target.value); setCajaValorId("") }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">— Seleccionar caja —</option>
                        {cajasFiltradas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}{c.sucursal ? ` (${c.sucursal})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pago</label>
                      <select
                        value={cajaValorId}
                        onChange={e => {
                          const vid = e.target.value
                          setCajaValorId(vid)
                          const val = cajaValores.find(v => v.id === vid)
                          setMedioPagoNombre(val ? `${val.nombre} (${val.moneda})` : "")
                        }}
                        disabled={!cajaId}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">{cajaId ? "— Seleccionar —" : "— Primero elegí caja —"}</option>
                        {cajaValores.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.nombre} ({v.moneda}){v.subtipo ? ` · ${v.subtipo}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fila 2: Monto + (Cotización si difieren monedas) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Monto recibido{monedaPagoOK ? ` (${monedaPago})` : ""}
                      </label>
                      <input
                        type="number" min={0}
                        value={montoInput || ""}
                        onChange={e => setMontoInput(Number(e.target.value))}
                        disabled={!cajaValorId}
                        placeholder={monedaPagoOK ? `Importe en ${monedaPago}` : "Elegí forma de pago"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    {monedasDifieren ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center justify-between">
                          <span>Cotización {monedaPago}/{moneda}</span>
                          <span className="text-[10px] text-gray-400 font-normal normal-case">
                            {cotizacionFuente === "blue_dia" ? "USD blue del día"
                              : cotizacionFuente === "senia" ? "del seña"
                              : "manual"}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={cotizacionPago || ""}
                          readOnly
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </div>
                    ) : <div />}
                  </div>

                  {/* Preview equivalente — solo si difieren monedas Y todo está cargado */}
                  {equivEnSenia != null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Equivalente en {moneda} (a imputar)</p>
                        <p className="text-blue-800 font-bold text-base">
                          {moneda === "USD"
                            ? `USD ${equivEnSenia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                            : `$${equivEnSenia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                        </p>
                      </div>
                      <p className="text-xs text-blue-600">
                        {monedaPago} {montoInput.toLocaleString("es-AR")} ÷ {cotizacionPago}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={registrarSenia}
                    disabled={accionando || !montoInput || !cajaId || !cajaValorId || (monedasDifieren && !cotOK)}
                    className="w-full py-2.5 bg-indigo-900 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    {accionando ? "Registrando..." : `Registrar seña → imputar en cuenta ${moneda}`}
                  </button>
                </>
              )
            })()}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sin seña pagada.</p>
        )}
      </div>

      {/* Bloque: Cierre de Operación — INLINE form si en_curso */}
      {senia.estado === "en_curso" && (
        <div className="bg-white rounded-lg border border-emerald-200 p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Confirmar Operación
          </h3>
          <div className="space-y-4">
            {/* Resumen financiero */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Precio final acordado</span><span className="font-medium">{fmtImpSenia(senia.precio_final)}</span></div>
              {senia.estado_senia === "registrada" && (senia.monto_senia ?? 0) > 0 && (
                <div className="flex justify-between text-green-700"><span>Seña ya pagada</span><span>-{fmtImpSenia(senia.monto_senia)}</span></div>
              )}
              <div className="flex justify-between font-bold border-t pt-2 text-emerald-700"><span>Saldo a pagar</span><span>{fmtImpSenia(saldoPendiente)}</span></div>
            </div>

            {/* Medios de pago del saldo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Medios de pago del saldo:</p>
                <button onClick={() => setMediosCierre(prev => [...prev, { medio: "efectivo", monto: 0 }])}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar medio
                </button>
              </div>
              <div className="space-y-2">
                {mediosCierre.map((mp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select value={mp.medio}
                      onChange={e => setMediosCierre(prev => prev.map((x, i) => i === idx ? { ...x, medio: e.target.value } : x))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-emerald-500">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta_debito">Tarjeta Débito</option>
                      <option value="tarjeta_credito">Tarjeta Crédito</option>
                      <option value="cuenta_corriente">Cuenta Corriente</option>
                      <option value="toma_equipo">Toma de equipo en parte de pago</option>
                    </select>
                    <input type="number" min={0} value={mp.monto}
                      onChange={e => setMediosCierre(prev => prev.map((x, i) => i === idx ? { ...x, monto: Number(e.target.value) } : x))}
                      placeholder="$ 0"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-36 focus:ring-2 focus:ring-emerald-500" />
                    {mediosCierre.length > 1 && (
                      <button onClick={() => setMediosCierre(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              {mediosCierre.some(m => m.medio === "toma_equipo") && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> El flujo de Toma de Equipo se procesará al confirmar la operación.
                  </p>
                </div>
              )}
              {totalCierre > 0 && (
                <div className={`flex justify-between text-sm mt-2 font-medium ${Math.abs(totalCierre - saldoPendiente) < 1 ? "text-emerald-700" : "text-amber-700"}`}>
                  <span>Total medios de pago:</span>
                  <span>{fmtImpSenia(totalCierre)} {Math.abs(totalCierre - saldoPendiente) < 1 ? "✓" : `(diferencia: ${fmtImpSenia(totalCierre - saldoPendiente)})`}</span>
                </div>
              )}
            </div>

            <button
              onClick={confirmarCierre}
              disabled={accionando || mediosCierre.length === 0}
              className="w-full py-3 bg-indigo-900 text-white font-semibold rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {accionando ? "Procesando..." : "Confirmar y entregar equipo"}
            </button>
          </div>
        </div>
      )}

      {/* Bloque: Documentos Generados */}
      <div className="bg-white rounded-lg border p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" /> Documentos Generados
        </h3>
        <div className="space-y-1 text-sm">
          {docs.map((doc, i) => {
            const Icon = doc.icon
            const clickable = !!doc.href && !!doc.numero
            const Wrapper: React.ElementType = clickable ? Link : "div"
            const wrapperProps = clickable ? { href: doc.href as string } : {}
            return (
              <Wrapper key={i} {...wrapperProps}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg border border-transparent transition-colors ${
                  clickable ? "hover:bg-gray-50 hover:border-gray-200 cursor-pointer group" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${doc.color}`} />
                  <span className="text-gray-700 font-medium">{doc.label}</span>
                  {doc.numero
                    ? <span className={`font-mono text-xs font-semibold ${doc.color} ${clickable ? "underline underline-offset-2 decoration-dotted" : ""}`}>{doc.numero}</span>
                    : <span className="text-xs text-gray-400 italic">no generado</span>}
                </div>
                {clickable && (
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </span>
                )}
              </Wrapper>
            )
          })}
        </div>
      </div>

      {/* Bloque: Cancelar Seña — INLINE */}
      {senia.estado === "en_curso" && (
        <div className="bg-white rounded-lg border p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Cancelar Seña
          </h3>
          {cancelandoInline ? (
            <div className="space-y-3">
              <textarea
                value={motivoCancel}
                onChange={e => setMotivoCancel(e.target.value)}
                placeholder="Motivo de la cancelación (opcional)"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400"
              />
              {senia.estado_senia === "registrada" && (senia.monto_senia ?? 0) > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  La seña pagada de {fmtImpSenia(senia.monto_senia)} quedará como crédito en la cuenta corriente del cliente.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={cancelarSenia}
                  disabled={accionando}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {accionando ? "Cancelando…" : "Confirmar cancelación"}
                </button>
                <button
                  onClick={() => { setCancelandoInline(false); setMotivoCancel("") }}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  No cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Cancelar libera el stock y anula la reserva del equipo.</p>
              <button
                onClick={() => setCancelandoInline(true)}
                className="text-sm text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Cancelar seña
              </button>
            </div>
          )}
        </div>
      )}

      {/* Banner: Operación confirmada */}
      {senia.estado === "confirmada" && senia.factura_id && facturaId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-emerald-800">Operación confirmada</p>
            <p className="text-sm text-emerald-600">Equipo entregado — completá la facturación para finalizar.</p>
          </div>
          <Link
            href={`/ventas/facturas/${facturaId}`}
            className="px-4 py-2.5 bg-indigo-900 text-white font-semibold rounded-lg hover:bg-indigo-800 flex items-center gap-2 whitespace-nowrap"
          >
            <Receipt className="w-4 h-4" /> Ir a factura para finalizar operación
          </Link>
        </div>
      )}

      {/* Bloque: Seguimiento */}
      {Array.isArray((senia as { seguimiento?: SeguimientoEntry[] }).seguimiento) && ((senia as { seguimiento?: SeguimientoEntry[] }).seguimiento ?? []).length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" /> Seguimiento
          </h3>
          <div className="space-y-3">
            {[...((senia as { seguimiento?: SeguimientoEntry[] }).seguimiento ?? [])].reverse().map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{entry.accion}</p>
                  {entry.detalle && <p className="text-gray-500 text-xs">{entry.detalle}</p>}
                  <p className="text-gray-400 text-xs">{new Date(entry.fecha).toLocaleString("es-AR")} · {entry.usuario}</p>
                </div>
              </div>
            ))}
          </div>
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
