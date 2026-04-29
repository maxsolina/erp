"use client"

import { useState, useEffect } from "react"
import { Plus, X, CreditCard, CheckCircle, AlertCircle } from "lucide-react"

// ── Tipos locales ─────────────────────────────────────────────
export interface LineaPago {
  id: number
  medio: "efectivo" | "transferencia" | "tarjeta"
  // Moneda en la que el cliente paga esta línea. Solo es independiente del
  // factura.moneda para "efectivo" (ARS/USD). Para tarjeta/transferencia
  // siempre coincide con factura.moneda.
  moneda: "ARS" | "USD"
  // Monto en la moneda indicada por `moneda` (no necesariamente la de la factura)
  monto: number
  tarjeta_id?: number
  cuotas?: number
}

interface CargoGrupo {
  nombre: string
  pct: number
  importe: number
}

interface ResultadoCalculo {
  recargo: RecargoTarjetaFinanzas
  grupo: GrupoTarjeta | undefined
  tarjeta: TarjetaFinanzas | undefined
  importeRecargo: number
  cargos: CargoGrupo[]
  totalRecargo: number
  totalConRecargo: number
}

// ── Tipos externos reutilizados (deben coincidir con ventas-module) ──
interface TarjetaFinanzas {
  id: number
  nombre: string
  tipo: "credito" | "debito"
  activa: boolean
}

interface RecargoTarjetaFinanzas {
  id: number
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  recargo_pct: number
  activo: boolean
  dias: { dom: boolean; lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean }
}

interface GrupoTarjeta {
  id: number
  nombre: string
  cargos: { nombre: string; arancel: number }[]
}

interface Factura {
  id: number
  total: number
  moneda?: "ARS" | "USD"
  cotizacion?: number
  [key: string]: unknown
}

// ── Datos mock (se inyectan desde ventas-module via props) ────
interface BloquesMediosPagoProps {
  factura: Factura
  tarjetas: TarjetaFinanzas[]
  grupos: GrupoTarjeta[]
  recargos: RecargoTarjetaFinanzas[]
  /** Texto del botón principal. Default: "Confirmar cobro y registrar en cuenta corriente" */
  textoBoton?: string
  /** Texto del mensaje post-confirmación. Default: "Cobro registrado — movimientos generados en cuenta corriente." */
  textoConfirmado?: string
  onConfirmarCobro?: (lineas: LineaPago[], totalConRecargos: number, totalRecargos: number) => void
  onCobroConfirmado?: (totalRecargos: number, desglose: { nombre: string; importe: number }[]) => void
  onEstadoPagoChange?: (estado: { cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }) => void
}

const CUOTAS_OPTS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

const formatMoneda = (n: number, moneda: "ARS" | "USD") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, minimumFractionDigits: 2 }).format(n)

// Convierte un monto en una moneda dada al equivalente en la moneda de la factura.
function montoEnFacturaMoneda(monto: number, monedaLinea: "ARS" | "USD", factura: Factura): number {
  const monedaFac = factura.moneda ?? "ARS"
  const cot = factura.cotizacion ?? 1
  if (monedaLinea === monedaFac) return monto
  if (monedaLinea === "USD" && monedaFac === "ARS") return monto * cot
  if (monedaLinea === "ARS" && monedaFac === "USD") return cot > 0 ? monto / cot : 0
  return monto
}

// Convierte un monto desde la moneda de la factura a otra moneda destino.
function montoDesdeFacturaMoneda(montoFac: number, monedaDestino: "ARS" | "USD", factura: Factura): number {
  const monedaFac = factura.moneda ?? "ARS"
  const cot = factura.cotizacion ?? 1
  if (monedaDestino === monedaFac) return montoFac
  if (monedaFac === "USD" && monedaDestino === "ARS") return montoFac * cot
  if (monedaFac === "ARS" && monedaDestino === "USD") return cot > 0 ? montoFac / cot : 0
  return montoFac
}

export default function BloquesMediosPago({
  factura,
  tarjetas,
  grupos,
  recargos,
  textoBoton = "Confirmar cobro y registrar en cuenta corriente",
  textoConfirmado = "Cobro registrado — movimientos generados en cuenta corriente.",
  onConfirmarCobro,
  onCobroConfirmado,
  onEstadoPagoChange,
}: BloquesMediosPagoProps) {
  const [lineas, setLineas] = useState<LineaPago[]>([])
  const [cobrado, setCobrado] = useState(false)

  // Suma todas las líneas convertidas a la moneda de la factura
  const sumarEnFacturaMoneda = (lns: LineaPago[]) =>
    lns.reduce((s, l) => s + montoEnFacturaMoneda(l.monto || 0, l.moneda, factura), 0)

  useEffect(() => {
    const totalIngresado = sumarEnFacturaMoneda(lineas)
    const diferencia = totalIngresado - factura.total
    onEstadoPagoChange?.({
      cobrado,
      tieneLineas: lineas.length > 0 && totalIngresado > 0,
      diferenciaOk: Math.abs(diferencia) <= 0.5,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, cobrado, factura.total, factura.moneda, factura.cotizacion])

  const buscarRecargo = (tarjetaId: number, cuotas: number): RecargoTarjetaFinanzas | null => {
    const hoy = new Date()
    const diasKeys: (keyof RecargoTarjetaFinanzas["dias"])[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]
    const diaKey = diasKeys[hoy.getDay()]
    const candidatos = recargos.filter(r =>
      r.tarjeta_id === tarjetaId &&
      r.activo &&
      cuotas >= r.desde_cuota &&
      cuotas <= r.hasta_cuota &&
      r.dias[diaKey]
    )
    if (!candidatos.length) return null
    return candidatos.sort((a, b) => (a.hasta_cuota - a.desde_cuota) - (b.hasta_cuota - b.desde_cuota))[0]
  }

  const calcularLinea = (linea: LineaPago): ResultadoCalculo | null => {
    if (linea.medio !== "tarjeta" || !linea.tarjeta_id || linea.monto <= 0) return null
    const cuotas = linea.cuotas || 1
    const rec = buscarRecargo(linea.tarjeta_id, cuotas)
    if (!rec) return null
    const grupo = grupos.find(g => g.id === rec.grupo_id)
    const tarjeta = tarjetas.find(t => t.id === linea.tarjeta_id)
    const importeRecargo = linea.monto * (rec.recargo_pct / 100)
    const cargos = (grupo?.cargos || []).map(c => ({
      nombre: c.nombre,
      pct: c.arancel,
      importe: linea.monto * (c.arancel / 100),
    }))
    const totalRecargo = importeRecargo + cargos.reduce((s, c) => s + c.importe, 0)
    return { recargo: rec, grupo, tarjeta, importeRecargo, cargos, totalRecargo, totalConRecargo: linea.monto + totalRecargo }
  }

  const agregarLinea = () => {
    const yaIngresado = sumarEnFacturaMoneda(lineas)
    const monedaDefault = (factura.moneda ?? "ARS") as "ARS" | "USD"
    const restanteFac = lineas.length === 0 ? 0 : Math.max(0, factura.total - yaIngresado)
    const restanteEnMonedaDefault = montoDesdeFacturaMoneda(restanteFac, monedaDefault, factura)
    setLineas(prev => [...prev, { id: Date.now(), medio: "efectivo", moneda: monedaDefault, monto: restanteEnMonedaDefault }])
  }

  const actualizarLinea = (id: number, cambios: Partial<LineaPago>) =>
    setLineas(prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l))

  // Cambia el medio (incluyendo moneda en caso de "efectivo") y recalcula el
  // monto sugerido basado en lo que falta para cubrir la factura.
  const cambiarMedio = (id: number, opcion: "efectivo_ars" | "efectivo_usd" | "transferencia" | "tarjeta") => {
    setLineas(prev => {
      // Saldo restante en moneda de factura, EXCLUYENDO esta línea
      const restoDeLineas = prev.filter(l => l.id !== id)
      const yaIngresadoExclu = sumarEnFacturaMoneda(restoDeLineas)
      const restanteFac = Math.max(0, factura.total - yaIngresadoExclu)
      let medio: LineaPago["medio"] = "efectivo"
      let moneda: "ARS" | "USD" = (factura.moneda ?? "ARS") as "ARS" | "USD"
      if (opcion === "efectivo_ars") { medio = "efectivo"; moneda = "ARS" }
      else if (opcion === "efectivo_usd") { medio = "efectivo"; moneda = "USD" }
      else if (opcion === "transferencia") { medio = "transferencia"; moneda = (factura.moneda ?? "ARS") as "ARS" | "USD" }
      else if (opcion === "tarjeta") { medio = "tarjeta"; moneda = (factura.moneda ?? "ARS") as "ARS" | "USD" }
      const montoSugerido = montoDesdeFacturaMoneda(restanteFac, moneda, factura)
      return prev.map(l => l.id === id
        ? { ...l, medio, moneda, monto: montoSugerido, tarjeta_id: undefined, cuotas: undefined }
        : l
      )
    })
  }

  const eliminarLinea = (id: number) =>
    setLineas(prev => prev.filter(l => l.id !== id))

  const totalRecargos = lineas.reduce((sum, l) => sum + (calcularLinea(l)?.totalRecargo || 0), 0)
  const totalIngresado = sumarEnFacturaMoneda(lineas)
  const totalConRecargos = totalIngresado + totalRecargos
  const diferencia = totalIngresado - factura.total

  if (cobrado) {
    return (
      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-4 h-4" />
          {textoConfirmado}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 border-t pt-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Medios de Pago</h3>
        <button
          onClick={agregarLinea}
          className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
        >
          <Plus className="w-4 h-4" /> Agregar medio de pago
        </button>
      </div>

      {lineas.length === 0 && (
        <p className="text-sm text-gray-400 italic">Sin medios de pago ingresados.</p>
      )}

      <div className="space-y-3">
        {lineas.map((linea, idx) => {
          const calc = calcularLinea(linea)
          const esPrimeraLineaEfectivo = linea.medio === "efectivo" && lineas.findIndex(l => l.medio === "efectivo") === idx
          const montoOtrasFac = lineas.filter(l => l.id !== linea.id).reduce((s, l) => s + montoEnFacturaMoneda(l.monto || 0, l.moneda, factura), 0)
          const restanteParaEstaLineaFac = factura.total - montoOtrasFac
          const restanteParaEstaLineaEnMonedaLinea = montoDesdeFacturaMoneda(restanteParaEstaLineaFac, linea.moneda, factura)
          const excedeLimite = (linea.monto || 0) > restanteParaEstaLineaEnMonedaLinea + 0.5
          const opcionMedio = linea.medio === "efectivo"
            ? (linea.moneda === "USD" ? "efectivo_usd" : "efectivo_ars")
            : linea.medio

          return (
            <div key={linea.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50">
                <select
                  value={opcionMedio}
                  onChange={e => cambiarMedio(linea.id, e.target.value as "efectivo_ars" | "efectivo_usd" | "transferencia" | "tarjeta")}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="efectivo_ars">Efectivo ARS</option>
                  <option value="efectivo_usd">Efectivo USD</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>

                {linea.medio === "tarjeta" && (
                  <>
                    <select
                      value={linea.tarjeta_id || ""}
                      onChange={e => actualizarLinea(linea.id, { tarjeta_id: parseInt(e.target.value), cuotas: 1 })}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">Tarjeta...</option>
                      {tarjetas.filter(t => t.activa).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} ({t.tipo === "credito" ? "Crédito" : "Débito"})</option>
                      ))}
                    </select>
                    <select
                      value={linea.cuotas || 1}
                      onChange={e => actualizarLinea(linea.id, { cuotas: parseInt(e.target.value) })}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none w-24"
                    >
                      {CUOTAS_OPTS.map(c => <option key={c} value={c}>{c} cuota{c > 1 ? "s" : ""}</option>)}
                    </select>
                  </>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {esPrimeraLineaEfectivo && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Math.abs(linea.monto - restanteParaEstaLineaEnMonedaLinea) < 0.5 && restanteParaEstaLineaEnMonedaLinea > 0}
                        onChange={e => actualizarLinea(linea.id, { monto: e.target.checked ? restanteParaEstaLineaEnMonedaLinea : 0 })}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Todo efectivo</span>
                    </label>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium shrink-0">{linea.moneda}</span>
                      <input
                        type="number"
                        value={linea.monto || ""}
                        onChange={e => actualizarLinea(linea.id, { monto: parseFloat(e.target.value) || 0 })}
                        disabled={linea.medio === "tarjeta" && !linea.tarjeta_id}
                        className={`w-32 border rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none ${excedeLimite ? "border-red-400 bg-red-50" : "border-gray-300"} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder="0,00"
                      />
                    </div>
                    {linea.medio === "efectivo" && linea.moneda !== (factura.moneda ?? "ARS") && linea.monto > 0 && (
                      <span className="text-xs text-gray-500">
                        ≈ {formatMoneda(montoEnFacturaMoneda(linea.monto, linea.moneda, factura), (factura.moneda ?? "ARS") as "ARS" | "USD")}
                      </span>
                    )}
                    {excedeLimite && (
                      <span className="text-xs text-red-600 font-medium">
                        Supera el total ({formatMoneda(restanteParaEstaLineaEnMonedaLinea, linea.moneda)})
                      </span>
                    )}
                  </div>
                  <button onClick={() => eliminarLinea(linea.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {linea.medio === "tarjeta" && !linea.tarjeta_id && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Seleccioná una tarjeta para poder ingresar el monto.
                </div>
              )}

              {linea.medio === "tarjeta" && linea.tarjeta_id && linea.monto > 0 && (
                <div className="px-4 pb-3 pt-2.5 bg-white border-t border-gray-100 text-xs">
                  {calc ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 mb-2 text-gray-500 font-medium">
                        <CreditCard className="w-3.5 h-3.5" />
                        {calc.tarjeta?.nombre} {calc.tarjeta?.tipo === "credito" ? "Crédito" : "Débito"} — {linea.cuotas} cuota{(linea.cuotas || 1) > 1 ? "s" : ""} · {calc.grupo?.nombre}
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Monto abonado c/tarjeta:</span>
                        <span>{formatARS(linea.monto)}</span>
                      </div>
                      {calc.recargo.recargo_pct > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Recargo ({calc.recargo.recargo_pct}%):</span>
                          <span>{formatARS(calc.importeRecargo)}</span>
                        </div>
                      )}
                      {calc.cargos.map((c, i) => (
                        <div key={i} className="flex justify-between text-gray-500">
                          <span>{c.nombre} ({c.pct}%):</span>
                          <span>{formatARS(c.importe)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 my-1" />
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>Total recargo:</span>
                        <span>{formatARS(calc.totalRecargo)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>Total a acreditar:</span>
                        <span>{formatARS(calc.totalConRecargo)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No hay recargo configurado para esta combinación. Revisá Finanzas &rarr; Recargos de Tarjetas.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalIngresado > 0 && Math.abs(diferencia) <= 0.5 && (
        <button
          onClick={() => {
            const desgloseRecargos: { nombre: string; importe: number }[] = []
            lineas.forEach(l => {
              const c = calcularLinea(l)
              if (!c) return
              if (c.recargo.recargo_pct > 0) {
                desgloseRecargos.push({ nombre: `Recargo tarjeta (${c.tarjeta?.nombre} ${c.recargo.recargo_pct}%)`, importe: c.importeRecargo })
              }
              c.cargos.forEach(cargo => {
                desgloseRecargos.push({ nombre: cargo.nombre, importe: cargo.importe })
              })
            })
            onConfirmarCobro?.(lineas, totalConRecargos, totalRecargos)
            onCobroConfirmado?.(totalRecargos, desgloseRecargos)
            setCobrado(true)
          }}
          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {textoBoton}
        </button>
      )}
    </div>
  )
}
