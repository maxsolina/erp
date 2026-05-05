"use client"

// Ficha read-only de un Ajuste de Stock con acciones según estado:
//   borrador → Solicitar Aprobación / Cancelar
//   pendiente → Aprobar y Confirmar / Rechazar (vuelve a borrador) / Cancelar
//   confirmado → ver asiento (si tiene)
//   cancelado → solo lectura

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"

interface Linea {
  id: number
  ajuste_id: number
  producto_id: number | null
  producto_nombre: string | null
  producto_codigo: string | null
  cantidad: number
  stock_unidad_id: number | null
  nro_serie: string | null
  color: string | null
  bateria_pct: number | null
  es_outlet: boolean | null
  observaciones: string | null
  costo_unitario: number | null
  orden: number
}

interface Ajuste {
  id: number
  numero: string
  tipo: "positivo" | "negativo"
  fecha: string
  deposito_id: number | null
  deposito_nombre: string | null
  ubicacion_id: number | null
  ubicacion_nombre: string | null
  sucursal_id: number | null
  concepto: string | null
  observaciones: string | null
  estado: "borrador" | "pendiente" | "confirmado" | "cancelado"
  asiento_id: string | null
  solicitado_por: string | null
  solicitado_at: string | null
  aprobado_por: string | null
  aprobado_at: string | null
  cancelado_por: string | null
  cancelado_at: string | null
  motivo_cancelacion: string | null
  created_at: string
  lineas: Linea[]
}

const ESTADO_COLOR: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente de aprobación",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
}

export default function AjusteFicha({
  ajusteId,
  tipo,
}: {
  ajusteId: number
  tipo: "positivo" | "negativo"
}) {
  const router = useRouter()
  const [aj, setAj] = useState<Ajuste | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null)
  const [advertencia, setAdvertencia] = useState<string | null>(null)

  function recargar() {
    fetch(`/api/stock/ajustes/${ajusteId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Ajuste no encontrado (HTTP ${r.status})`)
          setAj(null)
          return
        }
        const data = await r.json()
        setAj(data)
      })
      .catch(() => {
        setError("Error de red")
        setAj(null)
      })
  }

  useEffect(() => {
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajusteId])

  async function llamar(accion: "solicitar-aprobacion" | "confirmar" | "cancelar", body?: any) {
    setAccionEnCurso(accion)
    setError(null)
    setAdvertencia(null)
    try {
      const res = await fetch(`/api/stock/ajustes/${ajusteId}/${accion}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`)
        return
      }
      if (data?._advertencia_contable) {
        setAdvertencia(data._advertencia_contable)
      }
      recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red")
    } finally {
      setAccionEnCurso(null)
    }
  }

  if (aj === undefined) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (aj === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Ajuste no encontrado"}</p>
        <Link href={`/stock/ajustes/${tipo}s`} className="text-amber-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  const cfgEstado = ESTADO_COLOR[aj.estado] ?? "bg-gray-100 text-gray-700"
  // Sólo se calcula tras confirmar (costo_unitario se persiste con el último
  // costo contable del producto en ese momento). En borrador / pendiente queda 0.
  const totalCosto = aj.lineas.reduce(
    (s, l) => s + Number(l.costo_unitario ?? 0) * Number(l.cantidad ?? 0),
    0,
  )
  const yaConfirmado = aj.estado === "confirmado"

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push(`/stock/ajustes/${tipo}s`)} variant="ghost" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900 font-mono">{aj.numero}</h1>
            <p className="text-sm text-gray-500">
              Ajuste {aj.tipo === "positivo" ? "Positivo" : "Negativo"} · {new Date(aj.fecha).toLocaleDateString("es-AR")}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfgEstado}`}>
          {ESTADO_LABEL[aj.estado] ?? aj.estado}
        </span>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      {advertencia && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          ⚠️ {advertencia}
        </div>
      )}

      {/* Acciones según estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {aj.estado === "borrador" && (
          <>
            <button
              type="button"
              disabled={accionEnCurso != null}
              onClick={() => llamar("solicitar-aprobacion")}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {accionEnCurso === "solicitar-aprobacion" ? "Enviando…" : "Solicitar aprobación"}
            </button>
            <button
              type="button"
              disabled={accionEnCurso != null}
              onClick={() => {
                const motivo = prompt("Motivo de la cancelación (opcional):")
                if (motivo === null) return
                llamar("cancelar", { motivo })
              }}
              className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-md text-sm"
            >
              Cancelar ajuste
            </button>
          </>
        )}
        {aj.estado === "pendiente" && (
          <>
            <button
              type="button"
              disabled={accionEnCurso != null}
              onClick={() => {
                if (!confirm("¿Aprobar y confirmar el ajuste? Esto va a mover el stock y generar el asiento contable.")) return
                llamar("confirmar")
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {accionEnCurso === "confirmar" ? "Aplicando…" : "Aprobar y confirmar"}
            </button>
            <button
              type="button"
              disabled={accionEnCurso != null}
              onClick={() => {
                const motivo = prompt("Motivo de la cancelación (opcional):")
                if (motivo === null) return
                llamar("cancelar", { motivo })
              }}
              className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-md text-sm"
            >
              Cancelar ajuste
            </button>
          </>
        )}
        {aj.estado === "confirmado" && aj.asiento_id && (
          <Link
            href={`/contabilidad/asientos/${aj.asiento_id}`}
            className="border border-indigo-300 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-md text-sm"
          >
            Ver asiento contable
          </Link>
        )}
      </div>

      {/* Cabecera */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Depósito">{aj.deposito_nombre ?? "—"}</Field>
          <Field label="Ubicación">{aj.ubicacion_nombre ?? "—"}</Field>
          <Field label="Concepto">{aj.concepto ?? "—"}</Field>
          {aj.observaciones && (
            <div className="md:col-span-3">
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{aj.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* Líneas */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Detalle</h3>
          <span className="text-xs text-gray-500">
            {aj.lineas.length} {aj.lineas.length === 1 ? "línea" : "líneas"}
          </span>
        </div>
        {aj.lineas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin líneas</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">IMEI / Serie</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Color</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Batería</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                {yaConfirmado && (
                  <>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase" title="Último costo contable del producto al confirmar">
                      Costo contable
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {aj.lineas.map(l => {
                const subtotal = Number(l.costo_unitario ?? 0) * Number(l.cantidad ?? 0)
                return (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">
                      <div className="text-gray-900 font-medium">{l.producto_nombre ?? "—"}</div>
                      {l.producto_codigo && (
                        <div className="text-xs text-gray-500 font-mono">{l.producto_codigo}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-amber-700">{l.nro_serie ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{l.color ?? "—"}</td>
                    <td className="py-2 px-3 text-center text-gray-700">
                      {l.bateria_pct != null ? `${l.bateria_pct}%` : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">{l.cantidad}</td>
                    {yaConfirmado && (
                      <>
                        <td className="py-2 px-3 text-right">
                          {l.costo_unitario != null
                            ? Number(l.costo_unitario).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {subtotal.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
            {yaConfirmado && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={6} className="py-2 px-3 text-right">Total ARS (asiento)</td>
                  <td className="py-2 px-3 text-right">
                    {totalCosto.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Trazabilidad de cambios de estado */}
      {(aj.solicitado_at || aj.aprobado_at || aj.cancelado_at) && (
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Seguimiento</h3>
          <ul className="space-y-1.5 text-xs text-gray-600">
            <li>
              <span className="text-gray-400">{new Date(aj.created_at).toLocaleString("es-AR")}</span>
              {" — "}Creado en estado borrador
            </li>
            {aj.solicitado_at && (
              <li>
                <span className="text-gray-400">{new Date(aj.solicitado_at).toLocaleString("es-AR")}</span>
                {" — "}Aprobación solicitada{aj.solicitado_por ? ` por ${aj.solicitado_por}` : ""}
              </li>
            )}
            {aj.aprobado_at && (
              <li>
                <span className="text-gray-400">{new Date(aj.aprobado_at).toLocaleString("es-AR")}</span>
                {" — "}Confirmado{aj.aprobado_por ? ` por ${aj.aprobado_por}` : ""}
              </li>
            )}
            {aj.cancelado_at && (
              <li className="text-red-600">
                <span className="text-gray-400">{new Date(aj.cancelado_at).toLocaleString("es-AR")}</span>
                {" — "}Cancelado{aj.cancelado_por ? ` por ${aj.cancelado_por}` : ""}
                {aj.motivo_cancelacion ? ` (${aj.motivo_cancelacion})` : ""}
              </li>
            )}
          </ul>
        </div>
      )}

      <SeguimientoPanel tipoDocumento="ajuste_stock" documentoId={aj.id} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900">{children}</p>
    </div>
  )
}
