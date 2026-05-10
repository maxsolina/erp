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
  Package,
  Play,
  Receipt,
  XCircle,
} from "lucide-react"
import {
  cargarRepuestosSugeridos,
  cobrarOT,
  crearControlOT,
  deleteControlOT,
  fetchMotivosCierre,
  fetchOrden,
  generarNVDesdeOT,
  registrarSeniaOT,
  transicionarOT,
  updateControlOT,
  type CobroPago,
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

  // Crea el control de recepción (tipo "inicial") con los items del maestro
  // que apliquen al área + categoría de la OT. Después se completa desde la
  // pestaña Control.
  const handleIniciarControl = async () => {
    if (!ot) return
    try {
      await crearControlOT(ot.id, {
        tipo: "inicial",
        area_id: ot.area_id,
        categoria_id: ot.categoria_reparacion_id,
      })
      await recargar()
      setActiveTab("control")
    } catch (err) {
      alert((err as Error).message)
    }
  }

  // Persiste un cambio en un item del control (check + observación) sin
  // marcar el control como completado. Se llama por cada cambio de input.
  const handleActualizarItem = async (
    controlId: string,
    itemId: string,
    patch: { check_inicial?: boolean; obs_inicial?: string | null; check_final?: boolean; obs_final?: string | null },
  ) => {
    if (!ot) return
    try {
      await updateControlOT(ot.id, controlId, { items: [{ id: itemId, ...patch }] })
      await recargar()
    } catch (err) {
      console.error("[ot-ficha] error al actualizar item:", err)
    }
  }

  // Marca el control como completado y, si era el inicial, transiciona la OT
  // de borrador → sin_asignar (queda lista para el asignador).
  const handleCompletarControl = async (controlId: string, tipoControl: string) => {
    if (!ot) return
    try {
      await updateControlOT(ot.id, controlId, { completado: true })
      if (tipoControl === "inicial" && ot.estado === "borrador") {
        await transicionarOT(ot.id, {
          nuevo_estado: "sin_asignar",
          usuario: "Admin",
          nota: "Control de recepción completado",
        })
      }
      if (tipoControl === "final" && ot.estado === "control_calidad") {
        await transicionarOT(ot.id, {
          nuevo_estado: "facturado",
          usuario: "Admin",
          nota: "Control de calidad completado",
        })
      }
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
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
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
            <ComprobantesChips
              recibos={ot.comprobantes?.recibos ?? []}
              notas_venta={ot.comprobantes?.notas_venta ?? []}
              facturas={ot.comprobantes?.facturas ?? []}
              remitos={ot.comprobantes?.remitos ?? []}
            />
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

      {/* Documentos comerciales (Presupuesto / NV / Factura / Recibos) */}
      {ot.estado !== "cancelada" && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <DocumentosComerciales ot={ot} onCambio={recargar} />
        </div>
      )}

      {/* Acciones contextuales */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {ot.estado === "borrador" && (() => {
            const ctrlInicial = (ot.controles ?? []).find(c => c.tipo === "inicial")
            // El área puede tener `control_inicial_obligatorio = true` para
            // forzar el control. Si no, el operador puede saltarlo.
            const controlObligatorio = !!(ot.taller_areas_reparacion as { control_inicial_obligatorio?: boolean } | null)?.control_inicial_obligatorio

            if (!ctrlInicial) {
              return (
                <>
                  <button
                    onClick={handleIniciarControl}
                    className="px-3 py-1.5 bg-indigo-900 text-white rounded text-xs hover:bg-indigo-800 flex items-center gap-1"
                  >
                    Iniciar Control Inicial
                  </button>
                  {!controlObligatorio && (
                    <button
                      onClick={() => {
                        if (!confirm(
                          "¿Pasar a Sin Asignar sin completar control inicial?\n\n" +
                          "No quedará registro del estado del equipo al ingresar."
                        )) return
                        handleTransicion("sin_asignar", "Saltado control inicial")
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 flex items-center gap-1"
                      title="Pasar a Sin Asignar sin completar checklist"
                    >
                      Saltar control y avanzar
                    </button>
                  )}
                  <span className="text-xs text-gray-500 italic flex items-center">
                    {controlObligatorio
                      ? "Control inicial obligatorio para esta área"
                      : "El control es opcional — podés saltearlo si querés"}
                  </span>
                </>
              )
            }
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 italic">
                  Completá el control inicial en la pestaña <strong>Control</strong> y marcalo como completado para pasar a Sin Asignar.
                </span>
                <button
                  onClick={() => setActiveTab("control")}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs hover:bg-indigo-100"
                >
                  Ir al control
                </button>
              </div>
            )
          })()}
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
          {ot.estado === "control_calidad" && (() => {
            const ctrlFinal = (ot.controles ?? []).find(c => c.tipo === "final")
            return (
              <>
                {!ctrlFinal && (
                  <button
                    onClick={async () => {
                      try {
                        await crearControlOT(ot.id, {
                          tipo: "final",
                          area_id: ot.area_id,
                          categoria_id: ot.categoria_reparacion_id,
                        })
                        await recargar()
                        setActiveTab("control")
                      } catch (err) {
                        alert((err as Error).message)
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                  >
                    Iniciar Control Final
                  </button>
                )}
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
            )
          })()}
          {ot.estado === "facturado" && (
            <button
              onClick={() => handleTransicion("a_entregar", "Listo para entregar al cliente")}
              className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 flex items-center gap-1"
            >
              <CheckCircle className="w-3 h-3" /> Listo para Entregar
            </button>
          )}
          {ot.estado === "a_entregar" && (
            <button
              onClick={() => handleTransicion("entregado", "Entregado al cliente")}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
            >
              Marcar como Entregado
            </button>
          )}
          {ot.estado === "entregado" && (
            <span className="text-xs text-emerald-700 italic flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> OT finalizada — entregada al cliente
            </span>
          )}
        </div>
      </div>

      {/* Lista de Precios — selector que afecta la valuación de repuestos */}
      {ot.estado !== "entregado" && ot.estado !== "cancelada" && (
        <ListaPreciosSelector
          ot={ot}
          onCambio={recargar}
        />
      )}

      {/* Info dos columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          {[
            ["Área", ot.taller_areas_reparacion?.nombre],
            ["Tipo de OT", ot.taller_tipos_ot?.nombre],
            ["Tipo Técnico", ot.tipo_tecnico],
            ["Cliente", ot.cliente_nombre ?? ot.cliente?.nombre ?? (ot.cliente_id ? `#${ot.cliente_id}` : null)],
            ["Celular Cliente", ot.cliente?.telefono ?? ot.celular_contacto],
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
              <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                <p className="text-xs text-gray-500">
                  Los repuestos sugeridos se cargan automáticamente al crear la OT, basándose en la combinación equipo + fallas configurada en{" "}
                  <strong>Fallas por Equipos</strong>.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const r = await cargarRepuestosSugeridos(ot.id)
                      alert(r.mensaje)
                      await recargar()
                    } catch (err) {
                      alert((err as Error).message)
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs hover:bg-indigo-100 whitespace-nowrap"
                >
                  Recargar repuestos sugeridos
                </button>
              </div>

              {/* Banner consolidado: si algún repuesto no tiene stock suficiente */}
              {(() => {
                const sinStock = (ot.repuestos ?? []).filter(r => r.stock_suficiente === false)
                if (sinStock.length === 0) return null
                return (
                  <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                    <span className="text-amber-700 text-lg leading-none">⚠</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-800">
                        {sinStock.length} repuesto(s) sin stock suficiente
                      </p>
                      <p className="text-xs text-amber-700">
                        Antes de facturar tenés que reponer el stock o ajustar la cantidad. La OT igual se puede trabajar.
                      </p>
                    </div>
                  </div>
                )
              })()}

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Producto", "Cant.", "Stock", "Unidad", "Precio Unit.", "Desc.%", "Subtotal", "Total"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ot.repuestos ?? []).map(r => {
                    const sinStock = r.stock_suficiente === false
                    const tipoSvc = r.tipo_producto && r.tipo_producto !== "almacenable"
                    return (
                      <tr key={r.id} className={`border-b ${sinStock ? "bg-red-50" : ""}`}>
                        <td className="px-2 py-2">
                          {r.producto_nombre}
                          {sinStock && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold">
                              Falta {r.faltante}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">{r.cantidad}</td>
                        <td className="px-2 py-2">
                          {tipoSvc ? (
                            <span className="text-gray-400 text-xs italic">
                              ({r.tipo_producto})
                            </span>
                          ) : r.stock_real != null ? (
                            <span className={sinStock ? "text-red-600 font-semibold" : "text-gray-700"}>
                              {r.stock_real}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2">{r.unidad}</td>
                        <td className="px-2 py-2 text-right">
                          ${Number(r.precio_unitario).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right">{r.descuento_pct}%</td>
                        <td className="px-2 py-2 text-right">${Number(r.subtotal).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-medium">${Number(r.total).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {(!ot.repuestos || ot.repuestos.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-2 py-4">
                        <RepuestosVaciosDiagnostico ot={ot} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "control" && (
            <div>
              {(ot.controles ?? []).map(ctrl => {
                // Editable solo si NO está completado y NO es histórico. La
                // columna "Inicial" se edita durante la recepción (estado
                // borrador). La "Final" durante el control de calidad.
                const editable = !ctrl.completado && !ctrl.historico
                const editaInicial = editable && ctrl.tipo === "inicial"
                const editaFinal = editable && ctrl.tipo === "final"
                const items = ctrl.taller_ot_control_items ?? []
                const totalChecks = items.length
                const checksHechos = items.filter(i =>
                  ctrl.tipo === "inicial" ? i.check_inicial : i.check_final
                ).length

                return (
                  <div key={ctrl.id} className="mb-4 border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {ctrl.tipo === "inicial" ? "Control Inicial" : "Control Final"}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({checksHechos}/{totalChecks} ítems)
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
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
                        {editable && (
                          <button
                            onClick={() => handleCompletarControl(ctrl.id, ctrl.tipo)}
                            className="px-3 py-1 bg-indigo-900 text-white rounded text-xs hover:bg-indigo-800 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Completar y avanzar
                          </button>
                        )}
                      </div>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-1 text-left text-xs text-gray-500 w-1/3">Control</th>
                          <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Inicial</th>
                          <th className="px-2 py-1 text-center text-xs text-gray-500 w-16">Inicial</th>
                          <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Final</th>
                          <th className="px-2 py-1 text-center text-xs text-gray-500 w-16">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="px-2 py-2">{item.nombre}</td>
                            <td className="px-2 py-1">
                              {editaInicial ? (
                                <input
                                  type="text"
                                  defaultValue={item.obs_inicial ?? ""}
                                  onBlur={e => {
                                    const v = e.target.value.trim()
                                    if (v !== (item.obs_inicial ?? "")) {
                                      handleActualizarItem(ctrl.id, item.id, { obs_inicial: v || null })
                                    }
                                  }}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                                  placeholder="—"
                                />
                              ) : (
                                <span className="text-gray-500 text-xs">{item.obs_inicial ?? "—"}</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {editaInicial ? (
                                <input
                                  type="checkbox"
                                  checked={item.check_inicial}
                                  onChange={e => handleActualizarItem(ctrl.id, item.id, { check_inicial: e.target.checked })}
                                  className="rounded"
                                />
                              ) : (
                                <span>{item.check_inicial ? "✓" : "—"}</span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              {editaFinal ? (
                                <input
                                  type="text"
                                  defaultValue={item.obs_final ?? ""}
                                  onBlur={e => {
                                    const v = e.target.value.trim()
                                    if (v !== (item.obs_final ?? "")) {
                                      handleActualizarItem(ctrl.id, item.id, { obs_final: v || null })
                                    }
                                  }}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                                  placeholder="—"
                                />
                              ) : (
                                <span className="text-gray-500 text-xs">{item.obs_final ?? "—"}</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {editaFinal ? (
                                <input
                                  type="checkbox"
                                  checked={item.check_final}
                                  onChange={e => handleActualizarItem(ctrl.id, item.id, { check_final: e.target.checked })}
                                  className="rounded"
                                />
                              ) : (
                                <span>{item.check_final ? "✓" : "—"}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-2 py-4">
                              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                                <p className="font-medium mb-1">Este control quedó sin ítems del checklist.</p>
                                <p className="mb-2">
                                  Probablemente el control de configuración no tiene tildado{" "}
                                  <strong>{ctrl.tipo === "inicial" ? "Aparece en el control inicial" : "Aparece en el control final"}</strong>,
                                  o pertenece a otra área/categoría.
                                </p>
                                <p className="mb-2">
                                  OT actual:{" "}
                                  <strong>{ot.taller_areas_reparacion?.nombre ?? "—"}</strong>
                                  {ot.taller_categorias_reparacion?.nombre ? <> · <strong>{ot.taller_categorias_reparacion.nombre}</strong></> : null}
                                </p>
                                <div className="flex gap-2">
                                  <Link
                                    href="/servicio-tecnico/controles"
                                    className="px-2 py-1 bg-white border border-amber-300 text-amber-800 rounded text-xs hover:bg-amber-100"
                                  >
                                    Ir a Controles
                                  </Link>
                                  {editable && (
                                    <button
                                      onClick={async () => {
                                        if (!confirm("¿Eliminar este control vacío y reintentar?")) return
                                        try {
                                          await deleteControlOT(ot.id, ctrl.id)
                                          await recargar()
                                        } catch (err) {
                                          alert((err as Error).message)
                                        }
                                      }}
                                      className="px-2 py-1 bg-white border border-red-300 text-red-700 rounded text-xs hover:bg-red-50"
                                    >
                                      Eliminar control vacío
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              })}
              {(!ot.controles || ot.controles.length === 0) && (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-3">Sin controles registrados.</p>
                  {ot.estado === "borrador" && (
                    <button
                      onClick={handleIniciarControl}
                      className="px-3 py-1.5 bg-indigo-900 text-white rounded text-xs hover:bg-indigo-800"
                    >
                      Iniciar Control Inicial
                    </button>
                  )}
                </div>
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

// ─── Selector de Lista de Precios ──────────────────────────────────────────
// Aparece arriba del grid de info de la OT. Lista solo las listas con
// `visible_en_ot=true`. Al cambiar, hace PATCH a la OT con el nuevo
// `lista_precios_id` y recarga la ficha.

interface ListaPreciosOpt {
  id: number
  nombre: string
  moneda_base?: string
  visible_en_ot?: boolean
}

function ListaPreciosSelector({
  ot,
  onCambio,
}: {
  ot: TallerOrdenDetalle
  onCambio: () => Promise<void>
}) {
  const [listas, setListas] = useState<ListaPreciosOpt[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const otAny = ot as TallerOrdenDetalle & { lista_precios_id?: number | null }
  const listaActual = otAny.lista_precios_id

  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.ok ? r.json() : [])
      .then((d: ListaPreciosOpt[]) => {
        const filtradas = (Array.isArray(d) ? d : []).filter(l => l.visible_en_ot)
        setListas(filtradas)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  async function cambiarLista(nuevoId: number | null) {
    setGuardando(true)
    try {
      const r = await fetch(`/api/taller/ordenes/${ot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lista_precios_id: nuevoId }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        alert(e?.error ?? "Error al cambiar lista de precios")
        return
      }
      await onCambio()
    } finally {
      setGuardando(false)
    }
  }

  // Si no hay listas configuradas como "Visible en OT", no mostramos nada
  // (evita ruido visual). Si el operador la quiere usar, la habilita
  // tildando el flag en la lista correspondiente.
  if (!cargando && listas.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Lista de Precios:</span>
      <select
        value={listaActual ?? ""}
        onChange={e => cambiarLista(e.target.value ? Number(e.target.value) : null)}
        disabled={cargando || guardando}
        className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm disabled:bg-gray-50"
      >
        <option value="">— Sin lista (precio del producto) —</option>
        {listas.map(l => (
          <option key={l.id} value={l.id}>
            {l.nombre}{l.moneda_base && l.moneda_base !== "ARS" ? ` (${l.moneda_base})` : ""}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500 italic whitespace-nowrap">
        Define el precio de los repuestos al cargarse en la OT
      </span>
    </div>
  )
}

// ─── Diagnóstico cuando la pestaña Repuestos está vacía ────────────────────
// Llama al endpoint preview con la combinación equipo+fallas de la OT y
// muestra POR QUÉ no se cargaron repuestos automáticamente:
//   • Si no hay match en taller_fallas_por_equipo → sugerir crear la combo
//   • Si hay match pero sin repuestos cargados → sugerir editar la combo
//   • Si todos los productos no existen / costo en 0 → mostrar lo que pasa

function RepuestosVaciosDiagnostico({ ot }: { ot: TallerOrdenDetalle }) {
  const [diagnostico, setDiagnostico] = useState<{ cantidad: number; mensaje: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  async function diagnosticar() {
    if (!ot.equipo_id || !ot.falla_principal_id) {
      setDiagnostico({ cantidad: 0, mensaje: "La OT no tiene equipo o falla principal cargada." })
      return
    }
    setCargando(true)
    try {
      const fallasSec = (ot.fallas_secundarias ?? []).map(f => f.falla_id).filter(Boolean)
      const qs = new URLSearchParams({
        equipo_id: ot.equipo_id,
        falla_principal_id: ot.falla_principal_id,
        fallas_sec: fallasSec.join(","),
      })
      const r = await fetch(`/api/taller/repuestos-sugeridos-preview?${qs.toString()}`)
      const d = await r.json()
      const repuestos = d.repuestos ?? []
      if (repuestos.length === 0) {
        setDiagnostico({
          cantidad: 0,
          mensaje:
            "No hay ninguna combinación 'Falla por Equipo' configurada para este equipo + falla(s), " +
            "o las que existen no tienen repuestos definidos. " +
            "Cargá la combinación en Configuración → Fallas por Equipos y volvé a hacer click en 'Recargar repuestos sugeridos'.",
        })
      } else {
        setDiagnostico({
          cantidad: repuestos.length,
          mensaje: `Se encontraron ${repuestos.length} repuesto(s) sugeridos para esta combinación, pero ninguno se auto-cargó. Hacé click en "Recargar repuestos sugeridos" arriba a la derecha.`,
        })
      }
    } catch (err) {
      setDiagnostico({ cantidad: 0, mensaje: (err as Error).message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="text-center text-sm text-gray-500">
      <p className="mb-3">Sin repuestos cargados.</p>
      {!diagnostico ? (
        <button
          onClick={diagnosticar}
          disabled={cargando}
          className="px-3 py-1.5 bg-gray-50 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-50"
        >
          {cargando ? "Diagnosticando…" : "¿Por qué no se cargaron?"}
        </button>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-left text-xs text-blue-900 max-w-2xl mx-auto">
          {diagnostico.mensaje}
        </div>
      )}
    </div>
  )
}

// ─── Panel: Documentos Comerciales ──────────────────────────────────────────
// Muestra los comprobantes vinculados a la OT (Presupuesto/NV, Factura,
// Remito, Recibos) y permite generar la NV a partir de la OT con un click.
// Si todavía no hay NV vinculada, aparece el botón "Generar Presupuesto".

function DocumentosComerciales({
  ot,
  onCambio,
}: {
  ot: TallerOrdenDetalle
  onCambio: () => Promise<void>
}) {
  const [generando, setGenerando] = useState(false)
  const [showSenia, setShowSenia] = useState(false)
  const [showCobrar, setShowCobrar] = useState(false)

  // NV NO cancelada vinculada a la OT (puede haber varias canceladas viejas
  // de re-presupuestaciones). Estados: borrador, abierta, facturada, etc.
  const nvActiva = (ot.comprobantes?.notas_venta ?? []).find(n => n.estado !== "cancelada")
  const facturaActiva = (ot.comprobantes?.facturas ?? []).find(f => f.estado !== "cancelada")
  const remitoActivo = (ot.comprobantes?.remitos ?? []).find(r => r.estado !== "cancelado")
  const recibos = ot.comprobantes?.recibos ?? []

  const totalCobrado = recibos.reduce((a, r) => a + Number(r.importe_total ?? 0), 0)
  const totalNV = nvActiva ? Number(nvActiva.total ?? 0) : 0
  const saldo = totalNV - totalCobrado

  const handleGenerarNV = async (forceRegenerate = false) => {
    const mensaje = forceRegenerate
      ? `Se cancelará la NV ${nvActiva?.numero ?? "actual"} y se generará una nueva con los repuestos y mano de obra actualizados.\n\n¿Continuar?`
      : "Se generará una Nota de Venta como presupuesto, con:\n\n" +
        "• Los repuestos cargados\n" +
        "• Una línea de Mano de Obra (con el presupuesto estimado)\n\n" +
        "Después podés editarla, registrar señas y confirmarla. ¿Continuar?"
    if (!confirm(mensaje)) return

    setGenerando(true)
    try {
      const r = await generarNVDesdeOT(ot.id, forceRegenerate ? { force_regenerate: true } : undefined)
      alert(`NV ${r.nv_numero} generada por $${r.total.toLocaleString("es-AR")}.`)
      await onCambio()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setGenerando(false)
    }
  }

  // Reglas de visibilidad según el flujo real del taller:
  //
  // • Generar Presupuesto: SOLO cuando la OT pasó el control final (estado
  //   "facturado") o ya está lista para entregar. Antes no, porque durante
  //   el trabajo se pueden agregar repuestos y re-presupuestar y la NV
  //   quedaría desactualizada.
  // • Regenerar Presupuesto: si después de generada hubo cambios (raro,
  //   pero puede pasar) — solo en estados post-control.
  // • Registrar Seña: disponible desde el inicio. La seña queda como saldo
  //   a favor del cliente y se imputa cuando se genere la NV.
  // • Cobrar Saldo: solo cuando ya hay NV (entonces post-control).
  const estadosConNV = ["facturado", "a_entregar"]
  const puedeGenerarNV = !nvActiva && estadosConNV.includes(ot.estado)
  const puedeRegenerar = nvActiva
    && ["borrador", "abierta", "a_facturar"].includes(nvActiva.estado)
    && estadosConNV.includes(ot.estado)
  const puedeCobrar = nvActiva && saldo > 0.01 && estadosConNV.includes(ot.estado)
  const puedeRegistrarSenia = ot.estado !== "entregado" && ot.estado !== "cancelada"

  const fmtMoney = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          Documentos Comerciales
        </h3>
        <div className="flex items-center gap-2">
          {puedeRegistrarSenia && (
            <button
              onClick={() => setShowSenia(true)}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded text-xs hover:bg-emerald-800 flex items-center gap-1"
            >
              <Receipt className="w-3 h-3" />
              Registrar Seña
            </button>
          )}
          {puedeCobrar && (
            <button
              onClick={() => setShowCobrar(true)}
              className="px-3 py-1.5 bg-indigo-700 text-white rounded text-xs hover:bg-indigo-800 flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              Cobrar Saldo
            </button>
          )}
          {puedeGenerarNV && (
            <button
              onClick={() => handleGenerarNV(false)}
              disabled={generando}
              className="px-3 py-1.5 bg-indigo-900 text-white rounded text-xs hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {generando ? "Generando…" : "Generar Nota de Venta"}
            </button>
          )}
          {puedeRegenerar && (
            <button
              onClick={() => handleGenerarNV(true)}
              disabled={generando}
              className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
              title="Cancela la NV actual y genera una nueva con los repuestos y mano de obra actualizados"
            >
              <FileText className="w-3 h-3" />
              {generando ? "Regenerando…" : "Regenerar NV"}
            </button>
          )}
        </div>
      </div>

      {showSenia && (
        <ModalRegistrarSenia
          otId={ot.id}
          saldoPendiente={Math.max(0, saldo)}
          onCancelar={() => setShowSenia(false)}
          onConfirmar={async () => {
            setShowSenia(false)
            await onCambio()
          }}
        />
      )}

      {showCobrar && (
        <ModalCobrar
          otId={ot.id}
          saldoPendiente={Math.max(0, saldo)}
          nvNumero={nvActiva?.numero}
          onCancelar={() => setShowCobrar(false)}
          onConfirmar={async () => {
            setShowCobrar(false)
            await onCambio()
          }}
        />
      )}

      {!nvActiva ? (
        <div className="text-xs text-gray-500 italic">
          {ot.estado === "entregado" || ot.estado === "cancelada" ? (
            <p>Esta OT no tiene documentos comerciales asociados.</p>
          ) : estadosConNV.includes(ot.estado) ? (
            <p>
              La OT pasó el control final. Hacé click en <strong>Generar Nota de Venta</strong> para crear el comprobante con los repuestos y la mano de obra finales.
            </p>
          ) : (
            <p>
              La <strong>Nota de Venta</strong> se genera después del control final. Mientras tanto podés <strong>registrar señas</strong> (quedan como saldo a favor del cliente) y agregar/quitar repuestos según se desarrolle el trabajo.
            </p>
          )}
          {recibos.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-700 not-italic">Recibos asociados ({recibos.length}):</p>
              {recibos.map(r => (
                <Link
                  key={r.id}
                  href={`/ventas/recibos/${r.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 not-italic"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-700 font-medium">Recibo</span>
                    <span className="font-mono text-xs font-semibold text-emerald-600">{r.numero}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">{r.estado}</span>
                  </div>
                  <span className="font-medium text-gray-900">{fmtMoney(Number(r.importe_total ?? 0))}</span>
                </Link>
              ))}
              <p className="text-xs text-gray-500 italic mt-1">
                Total señas: <strong>{fmtMoney(totalCobrado)}</strong> — se imputará a la NV cuando se genere.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          {/* Nota de Venta */}
          <Link
            href={`/ventas/nv/${nvActiva.id}`}
            className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700 font-medium">Nota de Venta</span>
              <span className="font-mono text-xs font-semibold text-blue-600">{nvActiva.numero}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                nvActiva.estado === "borrador" ? "bg-gray-100 text-gray-600"
                : nvActiva.estado === "facturada" ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
              }`}>
                {nvActiva.estado}
              </span>
            </div>
            <span className="font-medium text-gray-900">{fmtMoney(totalNV)}</span>
          </Link>

          {/* Factura */}
          {facturaActiva && (
            <Link
              href={`/ventas/facturas/${facturaActiva.id}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700 font-medium">Factura</span>
                <span className="font-mono text-xs font-semibold text-purple-600">{facturaActiva.numero}</span>
                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{facturaActiva.estado}</span>
              </div>
              <span className="font-medium text-gray-900">{fmtMoney(Number(facturaActiva.total ?? 0))}</span>
            </Link>
          )}

          {/* Remito */}
          {remitoActivo && (
            <Link
              href={`/ventas/remitos/${remitoActivo.id}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700 font-medium">Remito</span>
                <span className="font-mono text-xs font-semibold text-orange-600">{remitoActivo.numero}</span>
                <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{remitoActivo.estado}</span>
              </div>
            </Link>
          )}

          {/* Recibos (puede haber varios: seña + cierre) */}
          {recibos.map(r => (
            <Link
              key={r.id}
              href={`/ventas/recibos/${r.id}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="text-gray-700 font-medium">Recibo</span>
                <span className="font-mono text-xs font-semibold text-emerald-600">{r.numero}</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">{r.estado}</span>
              </div>
              <span className="font-medium text-gray-900">{fmtMoney(Number(r.importe_total ?? 0))}</span>
            </Link>
          ))}

          {/* Resumen económico */}
          {nvActiva && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-500">Total NV</p>
                <p className="font-semibold text-gray-900">{fmtMoney(totalNV)}</p>
              </div>
              <div className="bg-emerald-50 rounded p-2">
                <p className="text-gray-500">Cobrado</p>
                <p className="font-semibold text-emerald-700">{fmtMoney(totalCobrado)}</p>
              </div>
              <div className={`rounded p-2 ${saldo > 0.01 ? "bg-amber-50" : "bg-green-50"}`}>
                <p className="text-gray-500">{saldo > 0.01 ? "Saldo pendiente" : "Cancelado"}</p>
                <p className={`font-semibold ${saldo > 0.01 ? "text-amber-700" : "text-green-700"}`}>
                  {fmtMoney(Math.max(0, saldo))}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal: Registrar Seña ─────────────────────────────────────────────────
// Pide caja + medio de pago + monto, llama al endpoint que crea recibo +
// publica + imputa contra la NV vinculada (si existe).

interface CajaOpt { id: string | number; nombre: string }
interface ValorCaja {
  id: string | number
  nombre: string
  tipo: string
  subtipo?: string
  moneda?: string
  es_tarjeta?: boolean
}

function ModalRegistrarSenia({
  otId,
  saldoPendiente,
  onCancelar,
  onConfirmar,
}: {
  otId: string
  saldoPendiente: number
  onCancelar: () => void
  onConfirmar: () => Promise<void>
}) {
  const [cajas, setCajas] = useState<CajaOpt[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [cajaId, setCajaId] = useState<string>("")
  const [valorId, setValorId] = useState<string>("")
  const [importe, setImporte] = useState<number>(saldoPendiente > 0 ? Math.min(saldoPendiente, 0) : 0)
  const [cotizacion, setCotizacion] = useState<number>(1)
  const [observaciones, setObservaciones] = useState("")
  const [tarjetaNombre, setTarjetaNombre] = useState("")
  const [cantidadCuotas, setCantidadCuotas] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/cajas")
      .then(r => r.ok ? r.json() : [])
      .then(d => setCajas(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!cajaId) {
      setValores([])
      setValorId("")
      return
    }
    fetch(`/api/cajas/${cajaId}/valores`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setValores(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [cajaId])

  const valorSeleccionado = valores.find(v => String(v.id) === valorId)
  const monedaPago = valorSeleccionado?.moneda ?? "ARS"
  const necesitaCotizacion = monedaPago !== "ARS"
  const esTarjeta = !!valorSeleccionado?.es_tarjeta

  async function handleConfirmar() {
    setError(null)
    if (!cajaId) { setError("Seleccioná la caja"); return }
    if (!valorId) { setError("Seleccioná el medio de pago"); return }
    if (!importe || importe <= 0) { setError("El importe debe ser mayor a 0"); return }
    if (necesitaCotizacion && (!cotizacion || cotizacion <= 0)) {
      setError("Ingresá la cotización"); return
    }

    setEnviando(true)
    try {
      const cajaSel = cajas.find(c => String(c.id) === cajaId)
      const r = await registrarSeniaOT(otId, {
        caja_id: cajaId,
        caja_nombre: cajaSel?.nombre,
        valor_id: valorId,
        valor_nombre: valorSeleccionado?.nombre,
        tipo_valor: valorSeleccionado?.tipo,
        importe,
        moneda: monedaPago,
        cotizacion: necesitaCotizacion ? cotizacion : 1,
        observaciones,
        es_tarjeta: esTarjeta,
        tarjeta_nombre: esTarjeta ? tarjetaNombre : null,
        cantidad_cuotas: esTarjeta ? cantidadCuotas : 1,
      })
      alert(
        `Seña registrada: $${r.importe.toLocaleString("es-AR")}\n` +
        `Recibo: ${r.recibo_numero}\n` +
        (r.imputado_a_nv ? `Imputada a NV ${r.imputado_a_nv}` : "(Sin NV vinculada — queda como saldo a favor)")
      )
      await onConfirmar()
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Registrar Seña</h3>
          <button
            onClick={onCancelar}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {saldoPendiente > 0 && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              Saldo pendiente: <strong>${saldoPendiente.toLocaleString("es-AR")}</strong>
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja *</label>
            <select
              value={cajaId}
              onChange={e => setCajaId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Seleccionar…</option>
              {cajas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medio de Pago *</label>
            <select
              value={valorId}
              onChange={e => setValorId(e.target.value)}
              disabled={!cajaId}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
            >
              <option value="">{cajaId ? "Seleccionar…" : "Elegí una caja primero"}</option>
              {valores.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nombre} ({v.tipo}{v.subtipo ? `/${v.subtipo}` : ""}{v.moneda && v.moneda !== "ARS" ? ` · ${v.moneda}` : ""})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Importe ({monedaPago}) *
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              value={importe || ""}
              onChange={e => setImporte(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>

          {necesitaCotizacion && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <label className="block text-xs font-medium text-amber-800 mb-1">
                Cotización {monedaPago} → ARS
              </label>
              <input
                type="number"
                step={0.01}
                min={0}
                value={cotizacion || ""}
                onChange={e => setCotizacion(Number(e.target.value) || 0)}
                className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm bg-white"
              />
              {cotizacion > 0 && importe > 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  ≈ ARS {(importe * cotizacion).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {esTarjeta && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta</label>
                <input
                  type="text"
                  placeholder="Visa, Master, etc."
                  value={tarjetaNombre}
                  onChange={e => setTarjetaNombre(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuotas</label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={cantidadCuotas}
                  onChange={e => setCantidadCuotas(Number(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            disabled={enviando}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={enviando}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? "Registrando…" : "Registrar Seña"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Cobrar saldo (varios medios de pago) ───────────────────────────

function ModalCobrar({
  otId,
  saldoPendiente,
  nvNumero,
  onCancelar,
  onConfirmar,
}: {
  otId: string
  saldoPendiente: number
  nvNumero?: string
  onCancelar: () => void
  onConfirmar: () => Promise<void>
}) {
  const [cajas, setCajas] = useState<CajaOpt[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [cajaId, setCajaId] = useState<string>("")
  const [pagos, setPagos] = useState<CobroPago[]>([
    { valor_id: "", importe: saldoPendiente, moneda: "ARS", cotizacion: 1 },
  ])
  const [observaciones, setObservaciones] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/cajas")
      .then(r => r.ok ? r.json() : [])
      .then(d => setCajas(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!cajaId) { setValores([]); return }
    fetch(`/api/cajas/${cajaId}/valores`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setValores(Array.isArray(d) ? d : []))
      .catch(console.error)
  }, [cajaId])

  function actualizarPago(idx: number, patch: Partial<CobroPago>) {
    setPagos(prev => prev.map((p, i) => {
      if (i !== idx) return p
      const merged = { ...p, ...patch }
      // Si cambió el valor, completar info del valor (nombre/tipo/moneda/tarjeta)
      if ("valor_id" in patch) {
        const v = valores.find(x => String(x.id) === String(patch.valor_id))
        merged.valor_nombre = v?.nombre
        merged.tipo_valor = v?.tipo
        merged.moneda = v?.moneda ?? "ARS"
        merged.es_tarjeta = !!v?.es_tarjeta
        merged.cotizacion = (v?.moneda && v.moneda !== "ARS") ? merged.cotizacion ?? 1 : 1
      }
      return merged
    }))
  }

  function agregarPago() {
    setPagos(prev => [...prev, { valor_id: "", importe: 0, moneda: "ARS", cotizacion: 1 }])
  }

  function eliminarPago(idx: number) {
    setPagos(prev => prev.filter((_, i) => i !== idx))
  }

  // Total ingresado en ARS (aplicando cotización a cada pago)
  const totalIngresado = pagos.reduce(
    (acc, p) => acc + Number(p.importe ?? 0) * Number(p.cotizacion ?? 1),
    0,
  )
  const diferencia = totalIngresado - saldoPendiente

  async function handleConfirmar() {
    setError(null)
    if (!cajaId) { setError("Seleccioná la caja"); return }
    for (const [idx, p] of pagos.entries()) {
      if (!p.valor_id) { setError(`Pago ${idx + 1}: falta medio de pago`); return }
      if (!Number(p.importe) || Number(p.importe) <= 0) { setError(`Pago ${idx + 1}: importe inválido`); return }
      if (p.moneda && p.moneda !== "ARS" && (!p.cotizacion || p.cotizacion <= 0)) {
        setError(`Pago ${idx + 1}: falta cotización`); return
      }
    }

    setEnviando(true)
    try {
      const cajaSel = cajas.find(c => String(c.id) === cajaId)
      const r = await cobrarOT(otId, {
        caja_id: cajaId,
        caja_nombre: cajaSel?.nombre,
        pagos,
        observaciones,
      })
      const msg = r.nv_cubierta
        ? `Cobro registrado: $${r.importe.toLocaleString("es-AR")}\n` +
          `Recibo: ${r.recibo_numero}\n\n` +
          `✓ NV ${r.nv_numero} totalmente cubierta. Andá a la NV y dale "Confirmar" para emitir Factura + Remito.`
        : `Cobro registrado: $${r.importe.toLocaleString("es-AR")}\n` +
          `Recibo: ${r.recibo_numero}\n` +
          `Saldo restante: $${r.saldo_nv.toLocaleString("es-AR")}`
      alert(msg)
      await onConfirmar()
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Cobrar saldo {nvNumero && <span className="text-gray-500 font-normal">— NV {nvNumero}</span>}
          </h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            Saldo pendiente: <strong>${saldoPendiente.toLocaleString("es-AR")}</strong>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caja *</label>
            <select
              value={cajaId}
              onChange={e => setCajaId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Seleccionar…</option>
              {cajas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <label className="text-xs font-medium text-gray-700">Medios de Pago *</label>
              <button
                onClick={agregarPago}
                disabled={!cajaId}
                className="text-xs text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
              >
                + Agregar pago
              </button>
            </div>
            <div className="space-y-2">
              {pagos.map((p, idx) => {
                const v = valores.find(x => String(x.id) === String(p.valor_id))
                const necesitaCot = p.moneda && p.moneda !== "ARS"
                return (
                  <div key={idx} className="border border-gray-200 rounded p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={String(p.valor_id ?? "")}
                        onChange={e => actualizarPago(idx, { valor_id: e.target.value })}
                        disabled={!cajaId}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-50"
                      >
                        <option value="">{cajaId ? "Medio…" : "Caja primero"}</option>
                        {valores.map(x => (
                          <option key={x.id} value={x.id}>
                            {x.nombre} ({x.tipo}{x.moneda && x.moneda !== "ARS" ? ` · ${x.moneda}` : ""})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={p.importe || ""}
                        onChange={e => actualizarPago(idx, { importe: Number(e.target.value) || 0 })}
                        placeholder="Importe"
                        className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                      {pagos.length > 1 && (
                        <button
                          onClick={() => eliminarPago(idx)}
                          className="text-red-400 hover:text-red-600 p-1"
                          aria-label="Eliminar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {necesitaCot && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-amber-50 border border-amber-200 rounded p-2">
                        <div>
                          <label className="block text-[11px] font-medium text-amber-800">
                            Cotización {p.moneda} → ARS
                          </label>
                          <input
                            type="number"
                            step={0.01}
                            value={p.cotizacion || ""}
                            onChange={e => actualizarPago(idx, { cotizacion: Number(e.target.value) || 0 })}
                            className="w-full border border-amber-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-amber-800">Equivalente ARS</label>
                          <p className="text-xs py-1.5">
                            ${((p.importe ?? 0) * (p.cotizacion ?? 1)).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                    {v?.es_tarjeta && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Tarjeta (Visa, Master…)"
                          value={p.tarjeta_nombre ?? ""}
                          onChange={e => actualizarPago(idx, { tarjeta_nombre: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          max={36}
                          placeholder="Cuotas"
                          value={p.cantidad_cuotas ?? 1}
                          onChange={e => actualizarPago(idx, { cantidad_cuotas: Number(e.target.value) || 1 })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={`flex justify-between items-center text-sm font-medium px-3 py-2 rounded ${
            Math.abs(diferencia) < 0.01 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}>
            <span>Total ingresado:</span>
            <span>
              ${totalIngresado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              {Math.abs(diferencia) >= 0.01 && (
                <span className="ml-2 text-xs">
                  ({diferencia > 0 ? "+" : ""}${diferencia.toLocaleString("es-AR", { minimumFractionDigits: 2 })})
                </span>
              )}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            disabled={enviando}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={enviando || pagos.length === 0}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
          >
            {enviando ? "Cobrando…" : "Cobrar"}
          </button>
        </div>
      </div>
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

// ─── Chips de Comprobantes (clickeables) ──────────────────────────────────
// Antes esos chips no tenían onClick. Ahora cada uno abre un dropdown con la
// lista de comprobantes asociados a la OT, y cada item linkea a la ficha del
// comprobante en su módulo (Recibos, NV, Factura, Remito).

interface ComprobanteItem { id: string; numero: string; estado: string }
interface FacturaItem extends ComprobanteItem { total: number }
interface ReciboItem extends ComprobanteItem { importe_total: number }

function ComprobantesChips({
  recibos, notas_venta, facturas, remitos,
}: {
  recibos: ReciboItem[]
  notas_venta: FacturaItem[]
  facturas: FacturaItem[]
  remitos: ComprobanteItem[]
}) {
  return (
    <>
      <ChipDropdown
        icon={<Receipt className="w-3 h-3" />}
        label="Recibos"
        count={recibos.length}
        items={recibos.map(r => ({
          numero: r.numero,
          estado: r.estado,
          href: `/ventas/recibos/${r.id}`,
          extra: `$ ${Number(r.importe_total ?? 0).toLocaleString("es-AR")}`,
        }))}
        emptyText="No hay recibos asociados a esta OT"
      />
      <ChipDropdown
        icon={<FileText className="w-3 h-3" />}
        label="NV"
        count={notas_venta.length}
        items={notas_venta.map(n => ({
          numero: n.numero,
          estado: n.estado,
          href: `/ventas/nv/${n.id}`,
          extra: `$ ${Number(n.total ?? 0).toLocaleString("es-AR")}`,
        }))}
        emptyText="No hay notas de venta asociadas a esta OT"
      />
      <ChipDropdown
        icon={<CreditCard className="w-3 h-3" />}
        label="Facturas"
        count={facturas.length}
        items={facturas.map(f => ({
          numero: f.numero,
          estado: f.estado,
          href: `/ventas/facturas/${f.id}`,
          extra: `$ ${Number(f.total ?? 0).toLocaleString("es-AR")}`,
        }))}
        emptyText="No hay facturas asociadas a esta OT"
      />
      <ChipDropdown
        icon={<Package className="w-3 h-3" />}
        label="Remitos"
        count={remitos.length}
        items={remitos.map(r => ({
          numero: r.numero,
          estado: r.estado,
          href: `/ventas/remitos/${r.id}`,
        }))}
        emptyText="No hay remitos asociados a esta OT"
      />
    </>
  )
}

function ChipDropdown({
  icon, label, count, items, emptyText,
}: {
  icon: React.ReactNode
  label: string
  count: number
  items: { numero: string; estado: string; href: string; extra?: string }[]
  emptyText: string
}) {
  const [open, setOpen] = useState(false)

  // Si hay un solo comprobante, click directo lleva ahí (sin dropdown)
  if (count === 1) {
    return (
      <Link
        href={items[0].href}
        className="px-3 py-1.5 border border-gray-300 rounded text-xs flex items-center gap-1 hover:bg-gray-50 hover:border-gray-400"
      >
        {icon} {label} ({count})
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-1.5 border rounded text-xs flex items-center gap-1 ${
          count > 0
            ? "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            : "border-gray-200 text-gray-400 cursor-default"
        }`}
        disabled={count === 0}
      >
        {icon} {label} ({count})
        {count > 1 && <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {open && count > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[260px]">
            {items.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">{emptyText}</p>
            ) : (
              <ul className="py-1 max-h-64 overflow-y-auto">
                {items.map((it, i) => (
                  <li key={i}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-medium text-amber-700">{it.numero}</span>
                        {it.extra && <span className="text-gray-600">{it.extra}</span>}
                      </div>
                      <span className="text-gray-400 mt-0.5 block">{it.estado}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
