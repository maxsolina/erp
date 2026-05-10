"use client"

// Extraído de components/ventas-module.tsx → renderFichaTomaEquipo (~5999-6242)
// + modal de confirmar recepción (~15920-16122)
// + popups de detalle NC (~12517-12587) y Recepción (~12590-12691).
// Todos los modales/popups que la ficha dispara viajan con la ficha.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Package,
  X,
} from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { fetchDepositos, fetchUbicaciones } from "@/lib/stock-actions"
import { formatCurrency, type TomaEquipo } from "./_shared"

interface Deposito {
  id: number
  nombre: string
  codigo: string
  sucursal_id?: number | null
}

interface Ubicacion {
  id: number
  deposito_id: number
  codigo: string
  nombre: string
}

export default function TomaEquipoFicha({ tomaId }: { tomaId: number }) {
  const router = useRouter()
  const { sucursalActiva } = useERP()

  const [toma, setToma] = useState<TomaEquipo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Cancelación
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  // Confirmar recepción
  const [showConfirmarRecepcion, setShowConfirmarRecepcion] = useState(false)
  const [imeiInput, setImeiInput] = useState("")
  const [colorRecepcion, setColorRecepcion] = useState("")
  const [bateriaRecepcionPct, setBateriaRecepcionPct] = useState<number | undefined>(undefined)
  const [outletRecepcion, setOutletRecepcion] = useState(false)
  const [observacionesRecepcion, setObservacionesRecepcion] = useState("")
  const [ubicacionRecepcionId, setUbicacionRecepcionId] = useState<number | null>(null)
  const [errorRecepcion, setErrorRecepcion] = useState<string | null>(null)
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState(false)

  // Popups
  const [ncPopup, setNcPopup] = useState<any | null>(null)
  const [recPopup, setRecPopup] = useState<any | null>(null)

  // Estado del asiento de la NC (para mostrar OK / falla en la ficha + abrir modal)
  // Cuando es null mientras carga, no muestra nada; cuando trae { asiento_id }
  // muestra el número (clickeable → modal); cuando trae { asiento_id: null }
  // avisa explícitamente que el asiento no se generó (bug histórico: el asiento
  // fallaba silenciosamente y el operador no lo veía hasta auditar contabilidad).
  const [ncAsiento, setNcAsiento] = useState<{
    asiento_id: string | null
    numero?: string
    fecha?: string
    concepto?: string
    moneda_original?: string
    cotizacion_aplicada?: number | null
    tipo_cotizacion?: string | null
    lineas?: Array<{
      cuenta_codigo?: string | null
      cuenta_nombre?: string | null
      descripcion?: string | null
      debe: number
      haber: number
      importe_moneda_original?: number | null
    }>
  } | null>(null)
  const [asientoPopupOpen, setAsientoPopupOpen] = useState(false)

  // Depósitos / ubicaciones (para selector dentro del modal de recepción)
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])

  // Cargar la toma + depósitos/ubicaciones
  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setErrorCarga(null)
    fetch("/api/tomas-equipo")
      .then(r => r.json())
      .then(data => {
        if (cancelado) return
        if (!Array.isArray(data)) {
          setErrorCarga("Respuesta inválida del servidor")
          setCargando(false)
          return
        }
        const found = data.find((t: TomaEquipo) => t.id === tomaId)
        if (!found) {
          setErrorCarga("Toma no encontrada")
        } else {
          setToma(found)
        }
        setCargando(false)
      })
      .catch(err => {
        if (cancelado) return
        console.error("[toma-equipo] error al cargar:", err)
        setErrorCarga("Error de red al cargar la toma")
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [tomaId])

  useEffect(() => {
    fetchDepositos().then(d => setDepositos(Array.isArray(d) ? d : [])).catch(console.error)
    fetchUbicaciones().then(u => setUbicaciones(Array.isArray(u) ? u : [])).catch(console.error)
  }, [])

  // Cargar estado del asiento de la NC: mira el ajuste_clientes correspondiente
  // y de ahí saca asiento_id + número + líneas. Si asiento_id es null, la NC
  // quedó sin contabilizar y el operador necesita verlo. Cargamos las líneas
  // acá para que el modal "ver asiento" sea instantáneo (sin segundo round-trip).
  useEffect(() => {
    if (!toma?.nota_credito_numero) return
    let cancelado = false
    fetch("/api/ajustes-clientes")
      .then(r => r.json())
      .then(async (all: any[]) => {
        if (cancelado || !Array.isArray(all)) return
        const ajuste = all.find(a => a.numero === toma.nota_credito_numero)
        if (!ajuste) return
        if (!ajuste.asiento_id) {
          setNcAsiento({ asiento_id: null })
          return
        }
        // El endpoint usa ?id= como query param, no path /:id
        const r = await fetch(`/api/contabilidad/asientos?id=${ajuste.asiento_id}`).catch(() => null)
        if (!r || !r.ok) {
          setNcAsiento({ asiento_id: ajuste.asiento_id })
          return
        }
        const arr = await r.json().catch(() => null)
        const a = Array.isArray(arr) ? arr[0] : arr
        if (cancelado) return
        setNcAsiento({
          asiento_id: ajuste.asiento_id,
          numero: a?.numero,
          fecha: a?.fecha,
          concepto: a?.concepto,
          moneda_original: a?.moneda_original,
          cotizacion_aplicada: a?.cotizacion_aplicada,
          tipo_cotizacion: a?.tipo_cotizacion,
          lineas: Array.isArray(a?.lineas) ? a.lineas : [],
        })
      })
      .catch(() => {})
    return () => { cancelado = true }
  }, [toma?.nota_credito_numero])

  const fechaHora = useMemo(() => {
    if (!toma) return ""
    const fechaObj = new Date(toma.fecha)
    return (
      fechaObj.toLocaleDateString("es-AR") +
      " " +
      fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    )
  }, [toma])

  const operacionEnCurso =
    toma &&
    toma.estado !== "cancelado" &&
    toma.estado_recepcion !== "recibido" &&
    toma.estado_recepcion !== "cancelado"

  const handleCancelar = async () => {
    if (!toma) return
    setCancelando(true)
    try {
      const res = await fetch(`/api/tomas-equipo/${toma.id}/cancelar`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Error al cancelar la toma")
        return
      }
      const updated = await fetch("/api/tomas-equipo")
      if (updated.ok) {
        const all = await updated.json()
        const refreshed = all.find((t: TomaEquipo) => t.id === toma.id)
        if (refreshed) setToma(refreshed)
      }
      setShowCancelarModal(false)
    } catch {
      alert("Error de red al cancelar la toma")
    } finally {
      setCancelando(false)
    }
  }

  const abrirNcPopup = async () => {
    if (!toma?.nota_credito_numero) return
    const res = await fetch("/api/ajustes-clientes")
    if (res.ok) {
      const all = await res.json()
      const found = all.find((a: any) => a.numero === toma.nota_credito_numero)
      if (found) setNcPopup(found)
    }
  }

  const abrirRecPopup = async () => {
    if (!toma?.recepcion_numero) return
    const res = await fetch("/api/recepciones-toma")
    if (res.ok) {
      const all = await res.json()
      const found = all.find((r: any) => r.numero === toma.recepcion_numero)
      if (found) setRecPopup(found)
    }
  }

  const abrirModalConfirmarRecepcion = () => {
    if (!toma) return
    setImeiInput("")
    setColorRecepcion("")
    setBateriaRecepcionPct(undefined)
    setOutletRecepcion(false)
    setObservacionesRecepcion("")
    setErrorRecepcion(null)
    const dep =
      depositos.find(d =>
        d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre,
      ) ?? depositos[0]
    const primeraUbic = ubicaciones.find(u => u.deposito_id === dep?.id)
    setUbicacionRecepcionId(primeraUbic?.id ?? null)
    setShowConfirmarRecepcion(true)
  }

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando toma...</div>
  }

  if (errorCarga || !toma) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga ?? "Toma no encontrada"}</p>
        <Link href="/toma-equipo" className="text-indigo-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/toma-equipo")}
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{toma.numero}</h1>
          <p className="text-sm text-gray-500">{fechaHora}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              operacionEnCurso ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {operacionEnCurso ? "Operación en curso" : "Operación finalizada"}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              toma.estado === "confirmado"
                ? "bg-green-100 text-green-700"
                : toma.estado === "cancelado"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {toma.estado.charAt(0).toUpperCase() + toma.estado.slice(1)}
          </span>
          {toma.estado !== "cancelado" && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancelar toma
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Datos de la operación */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos de la Operación</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Número</span>
              <span className="font-medium">{toma.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha y Hora</span>
              <span className="font-medium">{fechaHora}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium">{toma.cliente_nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Equipo</span>
              <span className="font-medium">{toma.modelo_equipo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valor Base</span>
              <span className="font-medium">USD {Number(toma.precio_base).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Descuentos</span>
              <span className="font-medium text-red-600">-USD {Number(toma.descuentos).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-700 font-semibold">Precio Final Acordado</span>
              <span className="font-bold text-emerald-600 text-base">
                USD {Number(toma.precio_final).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluación de componentes */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Evaluación del Equipo</h3>
          <div className="space-y-2">
            {toma.evaluacion.map((ev: any, i: number) => {
              const nombre = ev.categoria ?? ev.componente ?? "—"
              const etiqueta = ev.etiqueta ?? ev.estado ?? "—"
              const descUsd = Number(ev.descuento_usd ?? ev.descuento ?? 0)
              const whatsappFlag = ev.whatsapp_flag === true
              const esOk = descUsd === 0 && !whatsappFlag
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-gray-600">{nombre}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        esOk
                          ? "bg-green-100 text-green-700"
                          : whatsappFlag
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {etiqueta}
                    </span>
                    {descUsd > 0 && <span className="text-red-600 text-xs">-USD {descUsd.toFixed(2)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nota de Crédito generada */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Nota de Crédito Generada
          </h3>
          {toma.nota_credito_numero ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Número</span>
                <button
                  onClick={abrirNcPopup}
                  className="font-medium text-emerald-700 hover:underline hover:text-emerald-900 cursor-pointer"
                >
                  {toma.nota_credito_numero}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Concepto</span>
                <span className="font-medium">Toma de equipo: {toma.modelo_equipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Importe</span>
                <span className="font-bold text-emerald-600">{formatCurrency(Number(toma.precio_final))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Asiento contable</span>
                {ncAsiento === null ? (
                  <span className="text-xs text-gray-400 italic">cargando…</span>
                ) : ncAsiento.asiento_id ? (
                  <button
                    type="button"
                    onClick={() => setAsientoPopupOpen(true)}
                    className="font-medium text-emerald-700 hover:underline hover:text-emerald-900 cursor-pointer"
                  >
                    {ncAsiento.numero ?? `#${ncAsiento.asiento_id.slice(0, 8)}`}
                  </button>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium" title="La NC no fue contabilizada. Revisar el log del servidor.">
                    ✗ no generado
                  </span>
                )}
              </div>
              {toma.estado === "cancelado" ? (
                <p className="text-xs text-red-500 pt-2 border-t">
                  Esta NC fue revertida con un asiento de reversa.
                </p>
              ) : (
                <p className="text-xs text-gray-400 pt-2 border-t">
                  Este crédito fue acreditado en la cuenta corriente del cliente.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin nota de crédito generada</p>
          )}
        </div>

        {/* Recepción de Compra generada */}
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Recepción de Compra
          </h3>
          {toma.recepcion_numero ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Número</span>
                <button
                  onClick={abrirRecPopup}
                  className="font-medium text-blue-700 hover:underline hover:text-blue-900 cursor-pointer"
                >
                  {toma.recepcion_numero}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Equipo</span>
                <span className="font-medium">{toma.modelo_equipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor acordado</span>
                <span className="font-medium">{formatCurrency(Number(toma.precio_final))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    toma.estado_recepcion === "recibido"
                      ? "bg-green-100 text-green-700"
                      : toma.estado_recepcion === "cancelado"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {toma.estado_recepcion === "recibido"
                    ? "Recibido"
                    : toma.estado_recepcion === "cancelado"
                    ? "Cancelado"
                    : "Esperando recepción"}
                </span>
              </div>
              {toma.estado_recepcion === "pendiente" && toma.estado !== "cancelado" && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-amber-600 mb-3">
                    El equipo aun no fue recibido fisicamente. Confirma la recepcion una vez que el equipo ingrese al
                    deposito.
                  </p>
                  <button
                    onClick={abrirModalConfirmarRecepcion}
                    className="w-full py-2 bg-indigo-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-800"
                  >
                    Confirmar recepcion del equipo
                  </button>
                </div>
              )}
              {toma.estado_recepcion === "recibido" && (
                <p className="text-xs text-green-600 pt-2 border-t">
                  Equipo recibido fisicamente en deposito.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin recepcion de compra generada</p>
          )}
        </div>
      </div>

      {/* Modal cancelación */}
      {showCancelarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCancelarModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancelar Toma de Equipo</h2>
            {toma.estado_recepcion === "recibido" ? (
              <p className="text-sm text-gray-600 mb-4">
                El equipo <strong>{toma.modelo_equipo}</strong> ya fue recibido físicamente. Al cancelar se
                revertirán <strong>la Nota de Crédito y la Recepción</strong>, generando los asientos de reversa
                correspondientes.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Se cancelarán la Nota de Crédito y la Recepción pendiente asociadas a esta toma, y se generará la
                reversa contable de la NC.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelarModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                No cancelar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelando ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar recepción */}
      {showConfirmarRecepcion && (() => {
        const autoDeposit =
          depositos.find(d =>
            d.sucursal_id && sucursalActiva?.id
              ? d.sucursal_id === sucursalActiva.id
              : d.nombre === sucursalActiva?.nombre,
          ) ?? depositos[0]
        const ubicacionesDep = ubicaciones.filter(u => u.deposito_id === autoDeposit?.id)
        const canConfirm =
          imeiInput.trim() !== "" &&
          colorRecepcion.trim() !== "" &&
          bateriaRecepcionPct !== undefined &&
          ubicacionRecepcionId !== null &&
          !confirmandoRecepcion

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{toma.modelo_equipo}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Registro de recepción · {toma.recepcion_numero}
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmarRecepcion(false)}
                  className="text-gray-400 hover:text-gray-600 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pt-4 pb-2">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-500">
                      Cliente: <span className="font-medium text-gray-800">{toma.cliente_nombre}</span>
                    </span>
                    <span className="text-gray-500">
                      Valor: <span className="font-medium text-emerald-600">{formatCurrency(Number(toma.precio_final))}</span>
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{autoDeposit?.nombre}</span>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    N° Serie / IMEI <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={imeiInput}
                    onChange={e => setImeiInput(e.target.value)}
                    placeholder="Ej: 356938035643809"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={colorRecepcion}
                    onChange={e => setColorRecepcion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Seleccionar color...</option>
                    {[
                      "Negro",
                      "Blanco",
                      "Azul",
                      "Rojo",
                      "Verde",
                      "Amarillo",
                      "Gris",
                      "Plata",
                      "Oro",
                      "Morado",
                      "Rosa",
                      "Naranja",
                    ].map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    % Batería <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bateriaRecepcionPct ?? ""}
                      placeholder="0 – 100"
                      onChange={e =>
                        setBateriaRecepcionPct(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="text-sm text-gray-400">%</span>
                    {bateriaRecepcionPct !== undefined && (
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            bateriaRecepcionPct >= 80
                              ? "bg-emerald-500"
                              : bateriaRecepcionPct >= 50
                              ? "bg-yellow-400"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, bateriaRecepcionPct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recepcion-outlet"
                    checked={outletRecepcion}
                    onChange={e => setOutletRecepcion(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                  />
                  <label htmlFor="recepcion-outlet" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Equipo Outlet (tiene daño estético)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Ubicación de Stock <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ubicacionRecepcionId ?? ""}
                    onChange={e => setUbicacionRecepcionId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Seleccionar ubicación...</option>
                    {ubicacionesDep.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Depósito: {autoDeposit?.nombre}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Observaciones / Fallas
                  </label>
                  <textarea
                    value={observacionesRecepcion}
                    onChange={e => setObservacionesRecepcion(e.target.value)}
                    rows={2}
                    placeholder="Describa fallas, daños o notas relevantes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 px-6 py-3 bg-gray-50 rounded-b-xl border-t">
                {errorRecepcion && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorRecepcion}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowConfirmarRecepcion(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!canConfirm}
                    onClick={async () => {
                      if (!canConfirm) return
                      setConfirmandoRecepcion(true)
                      setErrorRecepcion(null)
                      try {
                        const res = await fetch(`/api/recepciones-toma/${toma.id}/confirmar`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            imei: imeiInput.trim(),
                            color: colorRecepcion.trim(),
                            bateria_pct: bateriaRecepcionPct,
                            outlet: outletRecepcion,
                            ubicacion_id: ubicacionRecepcionId,
                            observaciones: observacionesRecepcion.trim(),
                          }),
                        })
                        if (res.ok) {
                          setToma(prev => (prev ? { ...prev, estado_recepcion: "recibido" } : prev))
                          setShowConfirmarRecepcion(false)
                        } else {
                          const data = await res.json().catch(() => ({}))
                          setErrorRecepcion(data?.error ?? `Error ${res.status}`)
                        }
                      } catch (err) {
                        console.error("[recepcion-toma] error al confirmar:", err)
                        setErrorRecepcion("Error de red. Intente nuevamente.")
                      } finally {
                        setConfirmandoRecepcion(false)
                      }
                    }}
                    className="px-5 py-2 bg-indigo-900 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirmandoRecepcion ? "Confirmando..." : "Confirmar recepción"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Popup detalle Nota de Crédito */}
      {ncPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setNcPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-emerald-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">
                    NOTA DE CREDITO
                  </span>
                  <span className="font-mono font-bold text-emerald-800 text-lg">{ncPopup.numero}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(ncPopup.fecha).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    ncPopup.estado === "activo"
                      ? "bg-green-100 text-green-700"
                      : ncPopup.estado === "cancelado"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ncPopup.estado === "activo"
                    ? "Activa"
                    : ncPopup.estado === "cancelado"
                    ? "Cancelada"
                    : "Borrador"}
                </span>
                <button
                  onClick={() => setNcPopup(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-b grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Cliente</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncPopup.cliente_nombre}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Sucursal</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncPopup.sucursal}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Concepto</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncPopup.concepto}</p>
              </div>
              {ncPopup.nota_venta_numero && (
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium">Nota de Venta</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">{ncPopup.nota_venta_numero}</p>
                </div>
              )}
            </div>
            {ncPopup.lineas && ncPopup.lineas.length > 0 && (
              <div className="px-6 py-4 border-b">
                <p className="text-xs uppercase font-semibold text-gray-400 mb-3">Detalle</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b">
                      <th className="text-left pb-2">Descripcion</th>
                      <th className="text-right pb-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncPopup.lineas.map((l: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700">{l.descripcion}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(l.importe, ncPopup.moneda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Moneda: <span className="font-semibold text-gray-800">{ncPopup.moneda}</span>
              </span>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-medium">Total Nota de Credito</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(ncPopup.total, ncPopup.moneda)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup detalle Recepción */}
      {recPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setRecPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                    RECEPCIÓN
                  </span>
                  <span className="font-mono font-bold text-blue-800 text-lg">{recPopup.numero}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(recPopup.fecha).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    recPopup.estado === "recibida"
                      ? "bg-green-100 text-green-700"
                      : recPopup.estado === "cancelada"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {recPopup.estado === "recibida"
                    ? "Recibida"
                    : recPopup.estado === "cancelada"
                    ? "Cancelada"
                    : "Esperando recepción"}
                </span>
                <button
                  onClick={() => setRecPopup(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-b grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Cliente</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {recPopup.proveedor_nombre?.replace(" (toma de equipo)", "") ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Sucursal</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recPopup.sucursal || "—"}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Depósito destino</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recPopup.deposito_destino || "—"}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Ubicación</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {recPopup.ubicacion || recPopup.ubicacion_destino || "—"}
                </p>
              </div>
            </div>
            {recPopup.lineas?.length > 0 && (
              <div className="px-6 py-4 border-b">
                <p className="text-xs uppercase font-semibold text-gray-400 mb-3">Equipo</p>
                {recPopup.lineas.map((l: any, i: number) => (
                  <div key={i} className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Producto</span>
                      <span className="font-semibold text-gray-900">{l.producto_nombre}</span>
                    </div>
                    {l.unidades_serie?.[0] && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">IMEI / Serie</span>
                          <span className="font-mono font-medium text-gray-800">
                            {l.unidades_serie[0].nro_serie}
                          </span>
                        </div>
                        {l.unidades_serie[0].color && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color</span>
                            <span className="font-medium">{l.unidades_serie[0].color}</span>
                          </div>
                        )}
                        {l.unidades_serie[0].bateria_pct !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">% Batería</span>
                            <span className="font-medium">{l.unidades_serie[0].bateria_pct}%</span>
                          </div>
                        )}
                        {l.unidades_serie[0].outlet && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Outlet</span>
                            <span className="text-amber-600 font-medium">Sí (daño estético)</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Valor acordado</span>
                      <span className="font-bold text-blue-700">{formatCurrency(l.precio_unitario)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recPopup.observaciones && (
              <div className="px-6 py-3 border-b">
                <span className="text-gray-400 text-xs uppercase font-medium">Observaciones</span>
                <p className="text-sm text-gray-700 mt-0.5">{recPopup.observaciones}</p>
              </div>
            )}
            <div className="px-6 py-3 text-right">
              <p className="text-xs text-gray-400 uppercase font-medium">Origen</p>
              <p className="text-sm font-semibold text-gray-700">{recPopup.documento_origen_ref ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup detalle Asiento contable de la NC — compacto, solo lo esencial */}
      {asientoPopupOpen && ncAsiento?.asiento_id && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setAsientoPopupOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b bg-indigo-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded px-2 py-0.5 uppercase">
                    Asiento
                  </span>
                  <span className="font-mono font-bold text-indigo-800 text-base">
                    {ncAsiento.numero ?? `#${ncAsiento.asiento_id.slice(0, 8)}`}
                  </span>
                </div>
                {ncAsiento.fecha && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(ncAsiento.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setAsientoPopupOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ncAsiento.concepto && (
              <div className="px-5 py-2 border-b text-xs">
                <span className="text-gray-400 uppercase font-medium">Concepto</span>
                <p className="text-gray-700 mt-0.5">{ncAsiento.concepto}</p>
              </div>
            )}

            {ncAsiento.moneda_original && ncAsiento.moneda_original !== "ARS" && (
              <div className="px-5 py-2 border-b bg-amber-50/50 text-xs flex items-center justify-between">
                <span className="text-gray-600">
                  Moneda original: <span className="font-semibold">{ncAsiento.moneda_original}</span>
                </span>
                {ncAsiento.cotizacion_aplicada != null && (
                  <span className="text-gray-600">
                    Cotización {ncAsiento.tipo_cotizacion ?? ""}:{" "}
                    <span className="font-semibold">{Number(ncAsiento.cotizacion_aplicada).toLocaleString("es-AR")}</span>
                  </span>
                )}
              </div>
            )}

            {/* Tabla de líneas: cuenta · debe · haber */}
            <div className="px-5 py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500 uppercase font-medium">
                    <th className="text-left py-1.5">Cuenta</th>
                    <th className="text-right py-1.5 w-24">Debe</th>
                    <th className="text-right py-1.5 w-24">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  {(ncAsiento.lineas ?? []).map((l, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5">
                        <div className="text-gray-900">
                          {l.cuenta_codigo && <span className="text-gray-400 font-mono mr-1">{l.cuenta_codigo}</span>}
                          {l.cuenta_nombre}
                        </div>
                        {l.descripcion && <div className="text-gray-400 text-[11px]">{l.descripcion}</div>}
                      </td>
                      <td className="text-right py-1.5 font-mono">
                        {Number(l.debe) > 0 ? formatCurrency(Number(l.debe)) : "—"}
                        {l.importe_moneda_original != null && Number(l.debe) > 0 && (
                          <div className="text-[10px] text-gray-400">
                            {ncAsiento.moneda_original} {Number(l.importe_moneda_original).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="text-right py-1.5 font-mono">
                        {Number(l.haber) > 0 ? formatCurrency(Number(l.haber)) : "—"}
                        {l.importe_moneda_original != null && Number(l.haber) > 0 && (
                          <div className="text-[10px] text-gray-400">
                            {ncAsiento.moneda_original} {Number(l.importe_moneda_original).toFixed(2)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-gray-700">
                    <td className="pt-2 text-right uppercase text-[10px] tracking-wide text-gray-400">Totales</td>
                    <td className="text-right pt-2 font-mono">
                      {formatCurrency((ncAsiento.lineas ?? []).reduce((s, l) => s + Number(l.debe ?? 0), 0))}
                    </td>
                    <td className="text-right pt-2 font-mono">
                      {formatCurrency((ncAsiento.lineas ?? []).reduce((s, l) => s + Number(l.haber ?? 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
