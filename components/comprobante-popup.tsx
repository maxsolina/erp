"use client"

// ─── <ComprobantePopup> ─────────────────────────────────────────────────────
//
// Modal compacto para previsualizar un comprobante (Factura, Recibo, NC, ND,
// OP, FC) sin tener que navegar a su ficha. Se usa desde la conciliación de
// deuda (ventas y compras) — el usuario hace click en la lupita y ve los
// campos clave del documento sin perder la pantalla actual.
//
// Es 100% presentacional: el caller le pasa la info ya formateada y este
// componente sólo se encarga del layout/estilo. Sin fetches, sin lógica de
// negocio. Esto evita acoplar el popup a APIs específicas o tipos de la DB.

import { X } from "lucide-react"

export interface ComprobantePopupTotal {
  label: string
  value: number
  /** Si es true se renderiza más grande y en negrita (típicamente el Total). */
  bold?: boolean
  /** Color del valor: emerald para ingresos, red para deuda. */
  color?: "default" | "emerald" | "red" | "amber"
}

export interface ComprobantePopupLinea {
  descripcion: string
  cantidad?: number | null
  precio_unitario?: number | null
  subtotal?: number | null
}

export interface ComprobantePopupProps {
  open: boolean
  onClose: () => void
  /** Etiqueta del tipo de comprobante: "Factura", "Recibo", "NC", "ND", "OP", "FC", etc. */
  tipoLabel: string
  /** Color del header: ajusta el "tono" según tipo de comprobante. */
  tipoColor?: "indigo" | "emerald" | "red" | "amber" | "blue" | "purple"
  numero: string
  fecha?: string | null
  /** Etiqueta de estado a mostrar como pill (ej: "Conciliada", "Publicada"). */
  estado?: string | null
  /** Si la moneda es USD se renderizan los montos con prefijo USD. */
  moneda?: "ARS" | "USD" | string
  /** "Cliente" / "Proveedor" — etiqueta de la contraparte. */
  contraparteLabel?: string
  contraparteNombre?: string | null
  /** Concepto / motivo / descripción libre. */
  concepto?: string | null
  /** Lista de líneas a mostrar (opcional). Si está vacío no se renderiza la tabla. */
  lineas?: ComprobantePopupLinea[]
  /** Filas de la sección "Totales" abajo. */
  totales?: ComprobantePopupTotal[]
  /** Observaciones libres (string multiline). */
  observaciones?: string | null
}

const TIPO_HEADER_BG: Record<NonNullable<ComprobantePopupProps["tipoColor"]>, string> = {
  indigo:  "bg-indigo-50 border-indigo-100 text-indigo-800",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-800",
  red:     "bg-red-50 border-red-100 text-red-800",
  amber:   "bg-amber-50 border-amber-100 text-amber-800",
  blue:    "bg-blue-50 border-blue-100 text-blue-800",
  purple:  "bg-purple-50 border-purple-100 text-purple-800",
}

const TIPO_PILL_BG: Record<NonNullable<ComprobantePopupProps["tipoColor"]>, string> = {
  indigo:  "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  red:     "bg-red-100 text-red-700",
  amber:   "bg-amber-100 text-amber-700",
  blue:    "bg-blue-100 text-blue-700",
  purple:  "bg-purple-100 text-purple-700",
}

function formatMoney(n: number, moneda?: string) {
  const s = Number(n ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
  return moneda === "USD" ? `USD ${s}` : `$${s}`
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return ""
  const f = new Date(fecha)
  if (Number.isNaN(f.getTime())) return fecha.split("T")[0]
  return f.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
}

const COLOR_TOTAL: Record<NonNullable<ComprobantePopupTotal["color"]>, string> = {
  default: "text-gray-900",
  emerald: "text-emerald-700",
  red:     "text-red-700",
  amber:   "text-amber-700",
}

export default function ComprobantePopup({
  open,
  onClose,
  tipoLabel,
  tipoColor = "indigo",
  numero,
  fecha,
  estado,
  moneda = "ARS",
  contraparteLabel = "Contraparte",
  contraparteNombre,
  concepto,
  lineas,
  totales,
  observaciones,
}: ComprobantePopupProps) {
  if (!open) return null
  const headerCls = TIPO_HEADER_BG[tipoColor]
  const pillCls   = TIPO_PILL_BG[tipoColor]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-3 border-b flex items-center justify-between ${headerCls}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold rounded px-2 py-0.5 uppercase ${pillCls}`}>
                {tipoLabel}
              </span>
              <span className="font-mono font-bold text-base">{numero}</span>
              {moneda && moneda !== "ARS" && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-gray-700">{moneda}</span>
              )}
            </div>
            {fecha && (
              <p className="text-xs text-gray-600 mt-0.5">{formatFecha(fecha)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {estado && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/70 text-gray-700">
                {estado}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/40 rounded-lg text-gray-500 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1">
          {(contraparteNombre || concepto) && (
            <div className="px-5 py-3 border-b text-sm grid grid-cols-1 gap-2">
              {contraparteNombre && (
                <div>
                  <span className="text-[10px] uppercase font-medium text-gray-400">{contraparteLabel}</span>
                  <p className="text-gray-900 font-medium">{contraparteNombre}</p>
                </div>
              )}
              {concepto && (
                <div>
                  <span className="text-[10px] uppercase font-medium text-gray-400">Concepto</span>
                  <p className="text-gray-700">{concepto}</p>
                </div>
              )}
            </div>
          )}

          {lineas && lineas.length > 0 && (
            <div className="px-5 py-3 border-b">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase border-b">
                    <th className="text-left py-1.5 font-medium">Descripción</th>
                    <th className="text-right py-1.5 font-medium w-12">Cant.</th>
                    <th className="text-right py-1.5 font-medium w-24">P. Unit.</th>
                    <th className="text-right py-1.5 font-medium w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-800">{l.descripcion ?? "—"}</td>
                      <td className="py-1.5 text-right font-mono text-gray-600">
                        {l.cantidad != null ? l.cantidad : "—"}
                      </td>
                      <td className="py-1.5 text-right font-mono text-gray-600">
                        {l.precio_unitario != null ? formatMoney(l.precio_unitario, moneda) : "—"}
                      </td>
                      <td className="py-1.5 text-right font-mono text-gray-900 font-medium">
                        {l.subtotal != null ? formatMoney(l.subtotal, moneda) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totales && totales.length > 0 && (
            <div className="px-5 py-3 border-b space-y-1.5 text-sm">
              {totales.map((t, i) => {
                const colorCls = COLOR_TOTAL[t.color ?? "default"]
                return (
                  <div key={i} className="flex justify-between items-center">
                    <span className={`${t.bold ? "font-semibold text-gray-700" : "text-gray-500"}`}>
                      {t.label}
                    </span>
                    <span className={`font-mono ${t.bold ? "text-base font-bold" : "text-sm"} ${colorCls}`}>
                      {formatMoney(t.value, moneda)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {observaciones && (
            <div className="px-5 py-3 text-xs text-gray-600">
              <span className="text-[10px] uppercase font-medium text-gray-400 block mb-1">Observaciones</span>
              <p className="whitespace-pre-wrap">{observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
