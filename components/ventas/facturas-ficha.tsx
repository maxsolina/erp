"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, DollarSign, Download, Edit, Trash2, X } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import BloquesMediosPago, { type LineaPago } from "@/components/bloques-medios-pago"
import {
  formatCurrency,
  formatDate,
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
  type Factura,
} from "./_shared"

interface Tarjeta { id: number; nombre: string; tipo: "credito" | "debito"; activa: boolean }
interface GrupoTarjeta { id: number; nombre: string; cargos: { nombre: string; arancel: number }[] }
interface RecargoTarjeta {
  id: number
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  recargo_pct: number
  activo: boolean
  dias: { dom: boolean; lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean }
}

function formatDateTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function FacturasFicha({ facturaId }: { facturaId: number }) {
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [accionando, setAccionando] = useState(false)
  const [recibosVinculados, setRecibosVinculados] = useState<{ id: string | number; numero: string; estado: string; importe: number; moneda: string }[]>([])
  const [nvVinculadaId, setNvVinculadaId] = useState<number | null>(null)
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [recargos, setRecargos] = useState<RecargoTarjeta[]>([])
  const [confirmandoMedios, setConfirmandoMedios] = useState(false)
  const [mediosLineas, setMediosLineas] = useState<LineaPago[]>([])
  const [estadoPago, setEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({
    cobrado: false, tieneLineas: false, diferenciaOk: false,
  })
  // FAC-11: NCs activas categoría "Equipos en parte de pago" del cliente —
  // se pre-cargan como medio "credito_toma" en el bloque de medios.
  const [creditosTomaEquipo, setCreditosTomaEquipo] = useState<LineaPago[]>([])

  useEffect(() => {
    fetch(`/api/facturas?id=${facturaId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setFactura(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Factura no encontrada")
          setFactura(null)
          return
        }
        setFactura(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la factura")
        setFactura(null)
      })
  }, [facturaId])

  useEffect(() => {
    if (!factura) return
    fetch("/api/recibos")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        setRecibosVinculados(data
          .filter(r => Number(r.factura_id) === Number(factura.id))
          .map(r => ({
            id: r.id, numero: r.numero, estado: r.estado,
            importe: Number(r.importe ?? 0), moneda: r.moneda ?? "ARS",
          })))
      })
      .catch(() => {})
    if (factura.nota_venta_numero && !factura.nota_venta_id) {
      fetch(`/api/notas-venta?numero=${encodeURIComponent(factura.nota_venta_numero)}`)
        .then(r => r.json())
        .then((data: any) => {
          const nv = Array.isArray(data) ? data[0] : data
          if (nv?.id) setNvVinculadaId(nv.id)
        })
        .catch(() => {})
    } else if (factura.nota_venta_id) {
      setNvVinculadaId(factura.nota_venta_id)
    }
  }, [factura])

  // Cargar tarjetas / grupos / recargos cuando la factura está abierta
  // (necesario para el bloque de medios de pago).
  useEffect(() => {
    if (!factura || factura.estado !== "abierta") return
    Promise.all([
      fetch("/api/tarjetas").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/grupos-tarjeta").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/recargos-tarjeta").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([t, g, r]) => {
      if (Array.isArray(t)) setTarjetas(t)
      if (Array.isArray(g)) setGrupos(g)
      if (Array.isArray(r)) setRecargos(r)
    })
  }, [factura?.id, factura?.estado])

  // FAC-11: detectar NCs activas categoría "Equipos en parte de pago" del cliente
  // y pre-cargar como medio "credito_toma" en el bloque de medios.
  useEffect(() => {
    if (!factura || factura.estado !== "abierta" || !factura.cliente_id) return
    fetch(`/api/ajustes-clientes?cliente_id=${factura.cliente_id}&estado=activo&con_saldo=true&categoria=${encodeURIComponent("Equipos en parte de pago")}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setCreditosTomaEquipo([])
          return
        }
        const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
        const cot = factura.cotizacion ?? 0
        const subtotalFac = Number(factura.subtotal ?? 0)
        // Ordenar NCs por fecha asc (FIFO)
        const ncs = [...data].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""))
        let restanteFac = subtotalFac
        const lineas: LineaPago[] = []
        for (const nc of ncs) {
          if (restanteFac <= 0.01) break
          const ncMoneda = nc.moneda === "USD" ? "USD" : "ARS"
          let saldoEnMonedaFac = Number(nc.saldo_disponible ?? 0)
          // Convertir a la moneda de la factura si difieren
          if (ncMoneda !== monedaFac) {
            if (cot > 0) {
              if (ncMoneda === "USD" && monedaFac === "ARS") saldoEnMonedaFac = saldoEnMonedaFac * cot
              else if (ncMoneda === "ARS" && monedaFac === "USD") saldoEnMonedaFac = saldoEnMonedaFac / cot
            } else {
              continue // sin cotización válida no podemos cruzar — saltamos esta NC
            }
          }
          const aplicar = Math.min(saldoEnMonedaFac, restanteFac)
          if (aplicar <= 0.01) continue
          lineas.push({
            id: -(nc.id), // id negativo para distinguir de líneas manuales
            medio: "credito_toma",
            moneda: monedaFac,
            monto: Math.round(aplicar * 100) / 100,
            nc_id: nc.id,
            nc_numero: nc.numero,
          })
          restanteFac -= aplicar
        }
        setCreditosTomaEquipo(lineas)
      })
      .catch(() => setCreditosTomaEquipo([]))
  }, [factura?.id, factura?.cliente_id, factura?.estado, factura?.subtotal, factura?.moneda, factura?.cotizacion])

  // Confirmar factura abierta — calcula IVA + recargos según los medios elegidos
  // y genera el segundo asiento contable. Después la factura queda en "confirmada"
  // con saldo = total_final. El cobro real se registra después con un Recibo.
  const confirmarFactura = async () => {
    if (!factura) return
    if (confirmandoMedios) return
    if (!estadoPago.tieneLineas) {
      alert("Debés ingresar al menos un medio de pago antes de confirmar la factura.")
      return
    }
    if (!estadoPago.cobrado) {
      alert('El cobro no fue confirmado. Completá los medios de pago y presioná "Confirmar medios de pago".')
      return
    }
    const lineasPago = mediosLineas
    setConfirmandoMedios(true)
    try {
      const cotFac = factura.cotizacion ?? 1
      const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
      const medios = lineasPago.filter(l => l.monto > 0).map(l => {
        let recargo_pct = 0
        if (l.medio === "tarjeta" && l.tarjeta_id) {
          const hoy = new Date()
          const diasKeys = ["dom","lun","mar","mie","jue","vie","sab"] as const
          const diaKey = diasKeys[hoy.getDay()]
          const rec = recargos.find(r =>
            r.tarjeta_id === l.tarjeta_id && r.activo &&
            (l.cuotas || 1) >= r.desde_cuota && (l.cuotas || 1) <= r.hasta_cuota && r.dias[diaKey]
          )
          recargo_pct = rec?.recargo_pct ?? 0
        }
        // Convertir el monto a la moneda de la factura
        let montoEnFac = l.monto
        if (l.moneda && l.moneda !== monedaFac) {
          if (l.moneda === "USD" && monedaFac === "ARS") {
            montoEnFac = l.monto * cotFac
          } else if (l.moneda === "ARS" && monedaFac === "USD" && cotFac > 0) {
            montoEnFac = l.monto / cotFac
          }
        }
        montoEnFac = Math.round(montoEnFac * 100) / 100
        return {
          medio: l.medio,
          // Moneda ORIGINAL (no la convertida) para mostrar "Efectivo USD"
          // o "Efectivo ARS" en el desglose post-confirmación.
          moneda: l.moneda ?? monedaFac,
          monto: montoEnFac,
          tarjeta_id: l.medio === "tarjeta" ? l.tarjeta_id : undefined,
          cuotas: l.medio === "tarjeta" ? (l.cuotas ?? 1) : undefined,
          // FAC-11: para credito_toma, pasar el id de la NC al backend
          nc_id: l.medio === "credito_toma" ? l.nc_id : undefined,
          recargo_pct,
        }
      })

      // La factura mantiene su moneda original — el backend calcula IVA y
      // recargos en la moneda de la factura. NO se convierte a ARS.
      const res = await fetch(`/api/facturas/${factura.id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medios }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al confirmar factura" }))
        alert(`No se pudo confirmar la factura: ${err.error}`)
        setConfirmandoMedios(false)
        return
      }
      // Recargar factura — el estado debería pasar a "confirmada"
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setConfirmandoMedios(false)
    }
  }

  const cancelarFactura = async () => {
    if (!motivoCancel.trim()) { alert("Ingresá un motivo"); return }
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoCancel }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al cancelar: ${text}`)
        setAccionando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  const suprimirBorrador = async () => {
    if (!confirm("¿Suprimir definitivamente esta factura borrador? Esta acción no se puede deshacer.")) return
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al suprimir: ${text}`)
        setAccionando(false)
        return
      }
      router.push("/ventas/facturas")
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  if (factura === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando factura...</div>
  }
  if (factura === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Factura no encontrada"}</p>
        <Link href="/ventas/facturas" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = factura.moneda ?? "ARS"
  const lineas = factura.facturas_lineas ?? []
  const vencimientos = factura.facturas_vencimientos ?? []

  // FAC-10: Preview de IVA + recargos cuando los medios fueron confirmados.
  // Fórmula: IVA = (monto + recargo + comisión) × IVA preponderante.
  //   - "preponderante" = el % de IVA con mayor subtotal entre las líneas
  //   - "comisión" = cargos del grupo de tarjeta cuyo nombre NO contenga "IVA"
  //     (los cargos llamados "IVA X%" son administrativos de la tarjeta, no
  //     son el IVA fiscal de la factura)
  let previewIva = 0
  let previewRecargo = 0
  let previewTotal = 0
  if (factura.estado === "abierta" && estadoPago.cobrado && mediosLineas.length > 0) {
    const subtotalFac = Number(factura.subtotal ?? 0)
    if (subtotalFac > 0) {
      // 1. IVA preponderante (mayor subtotal por % de IVA)
      const subtotalPorIva = new Map<number, number>()
      for (const l of lineas) {
        const iva = Number(l.iva ?? 21)
        subtotalPorIva.set(iva, (subtotalPorIva.get(iva) ?? 0) + Number(l.subtotal ?? 0))
      }
      let ivaPreponderante = 21
      let maxSubtotal = 0
      subtotalPorIva.forEach((sub, iva) => {
        if (sub > maxSubtotal) { maxSubtotal = sub; ivaPreponderante = iva }
      })

      // 2. Por cada medio facturable: base = monto + recargo + comisión
      const hoy = new Date()
      const diasKeys = ["dom","lun","mar","mie","jue","vie","sab"] as const
      const diaKey = diasKeys[hoy.getDay()]
      for (const m of mediosLineas) {
        let recargoMedio = 0
        let comisionMedio = 0
        if (m.medio === "tarjeta" && m.tarjeta_id) {
          const rec = recargos.find(r =>
            r.tarjeta_id === m.tarjeta_id && r.activo &&
            (m.cuotas || 1) >= r.desde_cuota && (m.cuotas || 1) <= r.hasta_cuota && r.dias[diaKey]
          )
          recargoMedio = m.monto * ((rec?.recargo_pct ?? 0) / 100)
          // Cargos del grupo (excluyendo los que se llamen "IVA*")
          const grupo = rec ? grupos.find(g => g.id === rec.grupo_id) : undefined
          if (grupo) {
            for (const c of grupo.cargos) {
              if (!/iva/i.test(c.nombre)) {
                comisionMedio += m.monto * (c.arancel / 100)
              }
            }
          }
        }
        // FAC-11: credito_toma se trata como efectivo (sin IVA, sin recargo).
        // Solo tarjeta/transferencia generan IVA fiscal sobre (monto+recargo+comisión).
        if (m.medio === "tarjeta" || m.medio === "transferencia") {
          const base = m.monto + recargoMedio + comisionMedio
          previewIva += base * (ivaPreponderante / 100)
        }
        previewRecargo += recargoMedio + comisionMedio
      }
      previewIva = Math.round(previewIva * 100) / 100
      previewRecargo = Math.round(previewRecargo * 100) / 100
      previewTotal = Math.round((subtotalFac + previewIva + previewRecargo) * 100) / 100
    }
  }
  const tienePreview = previewTotal > 0
  const impuestosShow = tienePreview ? previewIva : (factura.impuestos ?? 0)
  const totalShow = tienePreview ? previewTotal : factura.total
  const mediosPago = factura.factura_medios_pago ?? []

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push("/ventas/facturas")} className="hover:text-emerald-700">
          Facturas
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{factura.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push("/ventas/facturas")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{factura.numero}</h1>
            <p className="text-sm text-gray-500">{formatDateTime(factura.fecha)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {factura.estado === "borrador" && (
            <Link
              href={`/ventas/facturas/${factura.id}/editar`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
          )}
          <button
            disabled
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1 opacity-60 cursor-not-allowed"
            title="Descarga de PDF próximamente"
          >
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoFacturaColor(factura.estado)}`}>
            {getEstadoFacturaLabel(factura.estado)}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center gap-2 mb-0">
        {factura.estado === "borrador" && (
          <button
            onClick={suprimirBorrador}
            disabled={accionando}
            className="px-3 py-1.5 text-sm border border-red-400 text-red-300 rounded-md hover:bg-red-900/30 flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Suprimir
          </button>
        )}
        {(factura.estado === "confirmada" || factura.estado === "parcial") && (
          <Link
            href={`/ventas/recibos/nueva?factura_id=${factura.id}`}
            className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
          >
            <DollarSign className="w-4 h-4" /> Registrar Cobro
          </Link>
        )}
        {(factura.estado === "abierta" || factura.estado === "confirmada" || factura.estado === "parcial") && (
          <button
            onClick={() => setShowCancelarModal(true)}
            className="px-3 py-1.5 text-sm border border-gray-400 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
        )}
        {nvVinculadaId && (
          <Link
            href={`/ventas/nv/${nvVinculadaId}`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Nota de Venta
          </Link>
        )}
        {recibosVinculados.length > 0 && (
          <Link
            href={`/ventas/recibos/${recibosVinculados[0].id}`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Recibos ({recibosVinculados.length})
          </Link>
        )}
        {factura.estado === "abierta" && (
          <button
            onClick={confirmarFactura}
            disabled={confirmandoMedios || !estadoPago.cobrado}
            title={!estadoPago.cobrado ? "Primero cargá los medios de pago abajo y apretá 'Confirmar medios de pago'" : ""}
            className="ml-auto px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {confirmandoMedios ? "Confirmando..." : "Confirmar Factura"}
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-b-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Datos de Factura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Número:</span> <span className="font-medium">{factura.numero}</span></div>
              <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">Factura</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(factura.fecha)}</span></div>
              <div>
                <span className="text-gray-500">NV:</span>{" "}
                {nvVinculadaId ? (
                  <Link href={`/ventas/nv/${nvVinculadaId}`} className="font-medium text-emerald-700 hover:underline">
                    {factura.nota_venta_numero}
                  </Link>
                ) : (
                  <span className="font-medium">{factura.nota_venta_numero ?? "-"}</span>
                )}
              </div>
              <div><span className="text-gray-500">Vendedor:</span> <span className="font-medium">{factura.vendedor_nombre ?? "-"}</span></div>
              <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{factura.sucursal ?? "-"}</span></div>
              <div className="col-span-2">
                <span className="text-gray-500">Moneda:</span>{" "}
                <span className="font-medium">{moneda}</span>
                {moneda !== "ARS" && (factura.cotizacion ?? 0) > 0 && (
                  <span className="text-gray-500 ml-2">
                    · {factura.tipo_cotizacion ?? "blue"} · 1 {moneda} = ${(factura.cotizacion ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              {factura.termino_pago && (
                <div><span className="text-gray-500">Término de Pago:</span> <span className="font-medium">{factura.termino_pago}</span></div>
              )}
              {factura.fecha_vencimiento && (
                <div><span className="text-gray-500">Vencimiento:</span> <span className="font-medium">{formatDate(factura.fecha_vencimiento)}</span></div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{factura.cliente_nombre ?? "—"}</span></div>
              {factura.cliente_documento && (
                <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{factura.cliente_documento}</span></div>
              )}
              {factura.domicilio_facturacion && (
                <div className="col-span-2"><span className="text-gray-500">Dirección:</span> <span className="font-medium">{factura.domicilio_facturacion}</span></div>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Líneas</h3>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-3">Producto</th>
              <th className="text-center py-2 px-3">Cantidad</th>
              <th className="text-right py-2 px-3">Precio Unit.</th>
              <th className="text-center py-2 px-3">Dto. %</th>
              <th className="text-right py-2 px-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, idx) => (
              <tr key={l.id ?? idx} className="border-b">
                <td className="py-2 px-3">
                  <p className="font-medium">{l.producto_nombre}</p>
                  {l.descripcion && <p className="text-xs text-gray-500">{l.descripcion}</p>}
                </td>
                <td className="py-2 px-3 text-center">{l.cantidad}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(l.precio_unitario, moneda)}</td>
                <td className="py-2 px-3 text-center">{l.descuento ? `${l.descuento}%` : "—"}</td>
                <td className="py-2 px-3 text-right font-medium">{formatCurrency(l.subtotal ?? l.cantidad * l.precio_unitario, moneda)}</td>
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">Sin líneas</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totales a la derecha */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-sm">
            {factura.subtotal != null && (
              <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{formatCurrency(factura.subtotal, moneda)}</span></div>
            )}
            {(factura.descuento ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Descuento:</span><span>-{formatCurrency(factura.descuento ?? 0, moneda)}</span></div>
            )}
            {previewRecargo > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Recargos:</span><span>{formatCurrency(previewRecargo, moneda)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Impuestos{tienePreview ? " (estimado)" : ""}:</span>
              <span>{formatCurrency(impuestosShow, moneda)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Total{tienePreview ? " (estimado)" : ""}:</span>
              <span className="whitespace-nowrap">
                {formatCurrency(totalShow, moneda)} <span className="text-sm text-gray-500 font-normal">{moneda}</span>
              </span>
            </div>
            {tienePreview && (
              <p className="text-xs text-amber-600 italic">
                Se persistirá al apretar "Confirmar Factura"
              </p>
            )}
            {factura.saldo != null && !tienePreview && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Saldo:</span><span>{formatCurrency(factura.saldo, moneda)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vencimientos */}
        {vencimientos.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Vencimientos</h3>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Descripción</th>
                  <th className="text-left py-2 px-3">Fecha</th>
                  <th className="text-right py-2 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {vencimientos.map((v, i) => (
                  <tr key={v.id ?? i} className="border-b border-gray-100">
                    <td className="py-2 px-3">{v.descripcion ?? "—"}</td>
                    <td className="py-2 px-3">{formatDate(v.fecha)}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(v.total, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Recibos asociados */}
        {recibosVinculados.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Recibos asociados</h3>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Número</th>
                  <th className="text-center py-2 px-3">Estado</th>
                  <th className="text-right py-2 px-3">Importe</th>
                </tr>
              </thead>
              <tbody>
                {recibosVinculados.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <Link href={`/ventas/recibos/${r.id}`} className="text-emerald-700 hover:underline font-mono">
                        {r.numero}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-center text-xs text-gray-600">{r.estado}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(r.importe, r.moneda as "ARS" | "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Medios de pago — solo si la factura YA fue confirmada con su detalle */}
        {mediosPago.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Medios de Pago</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Medio</th>
                  <th className="text-center py-2 px-3">Cuotas</th>
                  <th className="text-right py-2 px-3">Monto</th>
                  <th className="text-right py-2 px-3">Recargo</th>
                  <th className="text-right py-2 px-3">IVA</th>
                  <th className="text-right py-2 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {mediosPago.map((m: any, i) => {
                  // Para distinguir efectivo USD vs ARS, mostramos la moneda en
                  // el label. Como los importes ya vienen en la moneda de la
                  // factura (post conversión backend), usamos factura.moneda.
                  const monedaMedio = m.moneda ?? moneda
                  const labelMedio =
                    m.medio === "credito_toma"
                      ? `Crédito por toma de equipo${m.nc_id ? ` (NC #${m.nc_id})` : ""}`
                      : m.medio === "tarjeta"
                        ? `${m.tarjeta?.nombre ?? "Tarjeta"}`
                        : m.medio === "transferencia" ? `Transferencia ${monedaMedio}`
                        : m.medio === "efectivo" ? `Efectivo ${monedaMedio}`
                        : (m.medio ?? "—")
                  const esTomaEquipo = m.medio === "credito_toma"
                  // Backend usa: monto_base, iva_calculado, recargo, monto_total
                  return (
                    <tr key={m.id ?? i} className={`border-b border-gray-100 ${esTomaEquipo ? "bg-amber-50" : ""}`}>
                      <td className="py-2 px-3">
                        {esTomaEquipo && (
                          <span className="inline-block px-1.5 py-0.5 mr-2 text-[10px] font-semibold bg-amber-200 text-amber-900 rounded">
                            Toma equipo
                          </span>
                        )}
                        {labelMedio}
                      </td>
                      <td className="py-2 px-3 text-center">{m.cuotas ?? "—"}</td>
                      <td className="py-2 px-3 text-right">{m.monto_base != null ? formatCurrency(Number(m.monto_base), moneda) : "—"}</td>
                      <td className="py-2 px-3 text-right">{Number(m.recargo ?? 0) > 0 ? formatCurrency(Number(m.recargo), moneda) : "—"}</td>
                      <td className="py-2 px-3 text-right">{Number(m.iva_calculado ?? 0) > 0 ? formatCurrency(Number(m.iva_calculado), moneda) : "—"}</td>
                      <td className="py-2 px-3 text-right font-medium">{m.monto_total != null ? formatCurrency(Number(m.monto_total), moneda) : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* FAC-1: Bloque de Medios de Pago — solo cuando la factura está "abierta".
          Flujo en 2 pasos (igual que el form de factura nueva):
            1. Cargar medios y apretar "Confirmar medios de pago" (botón verde del bloque)
            2. Apretar "Confirmar Factura" en la barra gris superior. */}
      {factura.estado === "abierta" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-amber-700">
            Cargá los medios de pago y luego apretá <strong>Confirmar Factura</strong> arriba para finalizar.
          </p>
          <BloquesMediosPago
            key={factura.id}
            factura={factura as any}
            tarjetas={tarjetas}
            grupos={grupos}
            recargos={recargos}
            lineasIniciales={creditosTomaEquipo}
            textoBoton="Confirmar medios de pago"
            textoConfirmado="Medios de pago listos. Apretá Confirmar Factura arriba."
            onEstadoPagoChange={setEstadoPago}
            onConfirmarCobro={(lineas) => setMediosLineas(lineas)}
            onRetrocederMedios={() => {
              setMediosLineas([])
              setEstadoPago({ cobrado: false, tieneLineas: false, diferenciaOk: false })
            }}
          />
        </div>
      )}

      {/* Modal Cancelar */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Factura {factura.numero}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Se generará un asiento de reversa por el total y la factura quedará en estado <strong>cancelada</strong>.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo *</label>
            <textarea
              value={motivoCancel}
              onChange={e => setMotivoCancel(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowCancelarModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={cancelarFactura}
                disabled={accionando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Cancelando..." : "Cancelar Factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SeguimientoPanel tipoDocumento="factura" documentoId={factura.id} />
    </div>
  )
}
