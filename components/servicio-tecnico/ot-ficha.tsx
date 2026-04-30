"use client"

// Ficha de Orden de Trabajo + state machine de transiciones + modal Cancelar.
// Extraído de components/modulo-taller.tsx → renderDetalleOT (~745-1069)
// y renderModalCancelar (~1366-1392).

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  CreditCard,
  FileText,
  Play,
  Receipt,
  XCircle,
} from "lucide-react"
import {
  fetchMotivosCierre,
  fetchOrden,
  transicionarOT,
  type TallerMotivoCierre,
  type TallerOrdenDetalle,
} from "@/lib/taller-actions"
import { ESTADOS_PAUSA, FLUJO_PRINCIPAL, getEstado, getEstadoLabel } from "./_shared"

export default function OtFicha({ otId }: { otId: string }) {
  const router = useRouter()
  const [ot, setOt] = useState<TallerOrdenDetalle | null>(null)
  const [activeTab, setActiveTab] = useState("equipo")
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [motivosCierre, setMotivosCierre] = useState<TallerMotivoCierre[]>([])
  const [showCancelar, setShowCancelar] = useState(false)

  const recargar = async () => {
    try {
      const det = await fetchOrden(otId)
      setOt(det)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setErrorCarga(null)
    Promise.all([fetchOrden(otId), fetchMotivosCierre()])
      .then(([det, mc]) => {
        if (cancelado) return
        setOt(det)
        setMotivosCierre(Array.isArray(mc) ? mc : [])
      })
      .catch(err => {
        if (cancelado) return
        console.error("[ot-ficha] error al cargar:", err)
        setErrorCarga((err as Error).message ?? "Error al cargar la OT")
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [otId])

  const handleTransicion = async (
    nuevo_estado: string,
    nota?: string,
    extras?: Record<string, string>,
  ) => {
    if (!ot) return
    try {
      await transicionarOT(ot.id, { nuevo_estado, usuario: "Admin", nota, ...extras })
      await recargar()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando OT...</div>
  }

  if (errorCarga || !ot) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga ?? "OT no encontrada"}</p>
        <Link href="/servicio-tecnico/ot" className="text-indigo-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  const estadoInfo = getEstado(ot.estado)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/servicio-tecnico/ot")}
            className="text-indigo-700 hover:text-indigo-900"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">{ot.numero}</h1>
          <span className={`text-xs px-3 py-1 rounded-full ${estadoInfo?.color ?? ""}`}>
            {estadoInfo?.label}
          </span>
        </div>
        <div className="flex gap-2">
          {["asignada", "asignada_en_proceso", "control_calidad", "facturado", "a_entregar", "entregado"].includes(
            ot.estado,
          ) && (
            <>
              <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Recibos ({ot.comprobantes?.recibos?.length ?? 0})
              </button>
              <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" /> NV ({ot.comprobantes?.notas_venta?.length ?? 0})
              </button>
              <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Facturas ({ot.comprobantes?.facturas?.length ?? 0})
              </button>
            </>
          )}
          <button
            onClick={() => setShowCancelar(true)}
            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100"
          >
            <XCircle className="w-3 h-3 inline mr-1" /> Cancelar OT
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-1">
          {FLUJO_PRINCIPAL.map((est, i) => {
            const info = getEstado(est)!
            const currentIdx = (FLUJO_PRINCIPAL as readonly string[]).indexOf(ot.estado)
            const isActive = est === ot.estado
            const isCompleted = i < currentIdx
            return (
              <React.Fragment key={est}>
                <div
                  className={`flex-1 text-center text-[10px] py-1.5 rounded ${
                    isActive
                      ? "bg-indigo-600 text-white font-medium"
                      : isCompleted
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {info.label}
                </div>
                {i < FLUJO_PRINCIPAL.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>
        {(ESTADOS_PAUSA as readonly string[]).includes(ot.estado) && (
          <div className="mt-2 flex gap-2">
            {ESTADOS_PAUSA.map(est => {
              const info = getEstado(est)!
              return (
                <span
                  key={est}
                  className={`text-[10px] px-2 py-1 rounded ${
                    est === ot.estado ? "bg-orange-500 text-white font-medium" : "bg-orange-50 text-orange-400"
                  }`}
                >
                  {info.label}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Acciones contextuales */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {ot.estado === "borrador" && (
            <span className="text-xs text-gray-500 italic">
              Completar el control de recepción para avanzar (pendiente de UI dedicada).
            </span>
          )}
          {ot.estado === "sin_asignar" && (
            <span className="text-xs text-gray-500 italic">
              Ejecutar el Asignador desde el listado de OTs.
            </span>
          )}
          {ot.estado === "asignada" && (
            <button
              onClick={() => handleTransicion("asignada_en_proceso", "Técnico inició trabajo")}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              <Play className="w-3 h-3 inline mr-1" /> Iniciar Trabajo
            </button>
          )}
          {ot.estado === "asignada_en_proceso" && (
            <>
              <button
                onClick={() => handleTransicion("control_calidad", "Enviado a control de calidad")}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
              >
                Enviar a Control de Calidad
              </button>
              <button
                onClick={() => {
                  const texto = prompt("Motivo de re-presupuestación:")
                  if (texto) handleTransicion("re_presupuestacion", texto)
                }}
                className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
              >
                Re-presupuestar
              </button>
              <button
                onClick={() => handleTransicion("falta_repuestos", "Falta de repuestos")}
                className="px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                Falta de Repuestos
              </button>
            </>
          )}
          {ot.estado === "re_presupuestacion" && (
            <>
              <button
                onClick={() => handleTransicion("asignada_en_proceso", "Cliente aceptó re-presupuestación")}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Cliente Aceptó
              </button>
              <button
                onClick={() => setShowCancelar(true)}
                className="px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                Cliente No Aceptó
              </button>
            </>
          )}
          {ot.estado === "falta_repuestos" && (
            <>
              <button
                onClick={() => handleTransicion("asignada_en_proceso", "Repuestos recibidos")}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Repuestos Recibidos
              </button>
              <button
                onClick={() => {
                  const texto = prompt("Motivo de re-presupuestación:")
                  if (texto) handleTransicion("re_presupuestacion", texto)
                }}
                className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
              >
                Requiere Re-presupuestación
              </button>
            </>
          )}
          {ot.estado === "control_calidad" && (
            <>
              <button
                onClick={() => handleTransicion("facturado", "Control de calidad aprobado")}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3 inline mr-1" /> Aprobar Control
              </button>
              <button
                onClick={() => handleTransicion("asignada_en_proceso", "Retrabajo solicitado")}
                className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
              >
                Retrabajo
              </button>
            </>
          )}
          {ot.estado === "a_entregar" && (
            <button
              onClick={() => handleTransicion("entregado", "Entregado al cliente")}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
            >
              Marcar como Entregado
            </button>
          )}
        </div>
      </div>

      {/* Info dos columnas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          {[
            ["Área", ot.taller_areas_reparacion?.nombre],
            ["Tipo de OT", ot.taller_tipos_ot?.nombre],
            ["Tipo Técnico", ot.tipo_tecnico],
            ["Cliente", ot.cliente_id],
            ["Categoría Cliente", ot.categoria_cliente],
            ["Código Desbloqueo", ot.codigo_desbloqueo],
            ["Serial", ot.serial_number],
            ["IMEI", ot.imei],
          ].map(([label, val]) =>
            val ? (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{val as string}</span>
              </div>
            ) : null,
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          {[
            ["Fecha Creación", ot.fecha_creacion?.split("T")[0]],
            ["Fecha Asignación", ot.fecha_asignacion?.split("T")[0]],
            ["Celular", ot.celular_contacto],
            ["Ingresa Apagado", ot.ingresa_apagado ? "Sí" : "No"],
            ["Ingresa Mojado", ot.ingresa_mojado ? "Sí" : "No"],
            ["Deja Cargador", ot.deja_cargador ? "Sí" : "No"],
            ["Requerido MKT", ot.requerido_mkt ? "Sí" : "No"],
            ["Retrabajo", ot.retrabajo ? "Sí" : "No"],
            ["Tiempo Teórico", ot.tiempo_reparacion_teorico ? `${ot.tiempo_reparacion_teorico} min` : "—"],
            ["Tiempo Real", ot.tiempo_reparacion_real ? `${ot.tiempo_reparacion_real} min` : "—"],
            ["Puntaje", ot.puntaje != null ? String(ot.puntaje) : "—"],
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900 font-medium">{val as string}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b flex">
          {[
            { key: "equipo", label: "Equipo" },
            { key: "repuestos", label: "Repuestos y Servicios" },
            { key: "control", label: "Control" },
            { key: "descripcion", label: "Descripción" },
            { key: "historial", label: "Etapas / Historial" },
            { key: "faltantes", label: "Repuestos Faltantes" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === "equipo" && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Equipo</span>
                <span className="font-medium">
                  {ot.taller_equipos?.nombre}{" "}
                  {ot.taller_equipos?.marca ? `(${ot.taller_equipos.marca} ${ot.taller_equipos.modelo ?? ""})` : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Falla Principal</span>
                <span className="font-medium">{ot.taller_fallas?.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fallas Secundarias</span>
                <span className="font-medium">
                  {ot.fallas_secundarias?.map(f => f.nombre).join(", ") || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Técnico</span>
                <span className="font-medium">{ot.taller_tecnicos?.nombre ?? "Sin asignar"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Categoría Reparación</span>
                <span className="font-medium">{ot.taller_categorias_reparacion?.nombre ?? "—"}</span>
              </div>
            </div>
          )}
          {activeTab === "repuestos" && (
            <div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Producto", "Cant.", "Unidad", "Precio Unit.", "Desc.%", "Subtotal", "Total"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ot.repuestos ?? []).map(r => (
                    <tr key={r.id} className="border-b">
                      <td className="px-2 py-2">{r.producto_nombre}</td>
                      <td className="px-2 py-2">{r.cantidad}</td>
                      <td className="px-2 py-2">{r.unidad}</td>
                      <td className="px-2 py-2 text-right">
                        ${Number(r.precio_unitario).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">{r.descuento_pct}%</td>
                      <td className="px-2 py-2 text-right">${Number(r.subtotal).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right font-medium">${Number(r.total).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!ot.repuestos || ot.repuestos.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-2 py-4 text-center text-gray-400">
                        Sin repuestos cargados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "control" && (
            <div>
              {(ot.controles ?? []).map(ctrl => (
                <div key={ctrl.id} className="mb-4 border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {ctrl.tipo === "inicial" ? "Control de Recepción" : "Control de Calidad"}
                    </span>
                    <div className="flex gap-2">
                      {ctrl.historico && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          Histórico
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          ctrl.completado ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {ctrl.completado ? "Completado" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Control</th>
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Inicial</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Inicial</th>
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Final</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ctrl.taller_ot_control_items ?? []).map(item => (
                        <tr key={item.id} className="border-b">
                          <td className="px-2 py-1">{item.nombre}</td>
                          <td className="px-2 py-1 text-gray-500">{item.obs_inicial ?? "—"}</td>
                          <td className="px-2 py-1 text-center">{item.check_inicial ? "✓" : "—"}</td>
                          <td className="px-2 py-1 text-gray-500">{item.obs_final ?? "—"}</td>
                          <td className="px-2 py-1 text-center">{item.check_final ? "✓" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {(!ot.controles || ot.controles.length === 0) && (
                <p className="text-center text-gray-400 py-4 text-sm">Sin controles registrados</p>
              )}
            </div>
          )}
          {activeTab === "descripcion" && (
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {ot.descripcion || "Sin descripción"}
            </div>
          )}
          {activeTab === "historial" && (
            <div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Fecha", "Usuario", "Estado Ant.", "Estado Nuevo", "Nota"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ot.historial ?? []).map(h => (
                    <tr key={h.id} className="border-b">
                      <td className="px-2 py-2 text-gray-500">
                        {h.fecha?.split("T")[0]} {h.fecha?.split("T")[1]?.substring(0, 5)}
                      </td>
                      <td className="px-2 py-2">{h.usuario}</td>
                      <td className="px-2 py-2">
                        {h.estado_anterior ? getEstadoLabel(h.estado_anterior) : "—"}
                      </td>
                      <td className="px-2 py-2">{h.estado_nuevo ? getEstadoLabel(h.estado_nuevo) : "—"}</td>
                      <td className="px-2 py-2 text-gray-600">{h.nota ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "faltantes" && (
            <div className="text-sm text-gray-500 text-center py-8">
              {ot.estado === "falta_repuestos"
                ? "Cargar repuestos faltantes desde aquí. (Funcionalidad pendiente de integración con módulo Compras)"
                : "Esta pestaña se activa cuando la OT está en estado Falta de Repuestos"}
            </div>
          )}
        </div>
      </div>

      {/* Modal Cancelar */}
      {showCancelar && (
        <ModalCancelar
          motivosCierre={motivosCierre}
          onCancelar={() => setShowCancelar(false)}
          onConfirmar={async motivoId => {
            await handleTransicion("cancelada", "OT cancelada", { motivo_cierre_id: motivoId })
            setShowCancelar(false)
          }}
        />
      )}
    </div>
  )
}

function ModalCancelar({
  motivosCierre,
  onCancelar,
  onConfirmar,
}: {
  motivosCierre: TallerMotivoCierre[]
  onCancelar: () => void
  onConfirmar: (motivoId: string) => void | Promise<void>
}) {
  const [motivoId, setMotivoId] = useState("")
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Cancelar OT</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cierre *</label>
          <select
            value={motivoId}
            onChange={e => setMotivoId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {motivosCierre
              .filter(m => m.activo)
              .map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="px-4 py-2 border rounded text-sm">
            Volver
          </button>
          <button
            onClick={() => {
              if (!motivoId) {
                alert("Seleccione un motivo")
                return
              }
              onConfirmar(motivoId)
            }}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Confirmar Cancelación
          </button>
        </div>
      </div>
    </div>
  )
}
