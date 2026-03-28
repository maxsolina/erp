"use client"

import { useState, useEffect } from "react"
import { Plus, X, CreditCard, CheckCircle, AlertCircle } from "lucide-react"

// ── Tipos locales ─────────────────────────────────────────────
export interface LineaPago {
  id: number
  medio: "efectivo" | "transferencia" | "tarjeta"
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
  [key: string]: unknown
}

// ── Datos mock (se inyectan desde ventas-module via props) ────
interface BloquesMediosPagoProps {
  factura: Factura
  tarjetas: TarjetaFinanzas[]
  grupos: GrupoTarjeta[]
  recargos: RecargoTarjetaFinanzas[]
  onConfirmarCobro?: (lineas: LineaPago[], totalConRecargos: number, totalRecargos: number) => void
  onCobroConfirmado?: (totalRecargos: number, desglose: { nombre: string; importe: number }[]) => void
  onEstadoPagoChange?: (estado: { cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }) => void
}

const CUOTAS_OPTS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

export default function BloquesMediosPago({
  factura,
  tarjetas,
  grupos,
  recargos,
  onConfirmarCobro,
  onCobroConfirmado,
  onEstadoPagoChange,
}: BloquesMediosPagoProps) {
  const [lineas, setLineas] = useState<LineaPago[]>([])
  const [cobrado, setCobrado] = useState(false)

  useEffect(() => {
    const totalIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
    const diferencia = totalIngresado - factura.total
    onEstadoPagoChange?.({
      cobrado,
      tieneLineas: lineas.length > 0 && totalIngresado > 0,
      diferenciaOk: Math.abs(diferencia) <= 0.5,
    })
  }, [lineas, cobrado, factura.total])

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
    const yaIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
    const restante = lineas.length === 0 ? 0 : Math.max(0, factura.total - yaIngresado)
    setLineas(prev => [...prev, { id: Date.now(), medio: "efectivo", monto: restante }])
  }

  const actualizarLinea = (id: number, cambios: Partial<LineaPago>) =>
    setLineas(prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l))

  const eliminarLinea = (id: number) =>
    setLineas(prev => prev.filter(l => l.id !== id))

  const totalRecargos = lineas.reduce((sum, l) => sum + (calcularLinea(l)?.totalRecargo || 0), 0)
  const totalIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
  const totalConRecargos = totalIngresado + totalRecargos
  const diferencia = totalIngresado - factura.total

  if (cobrado) {
    return (
      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-4 h-4" />
          Cobro registrado — movimientos generados en cuenta corriente.
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
          const montoOtras = lineas.filter(l => l.id !== linea.id).reduce((s, l) => s + (l.monto || 0), 0)
          const restanteParaEstaLinea = factura.total - montoOtras
          const excedeLimite = (linea.monto || 0) > restanteParaEstaLinea + 0.5

          return (
            <div key={linea.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50">
                <select
                  value={linea.medio}
                  onChange={e => actualizarLinea(linea.id, { medio: e.target.value as LineaPago["medio"], tarjeta_id: undefined, cuotas: undefined })}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="efectivo">Efectivo</option>
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
                        checked={linea.monto === factura.total}
                        onChange={e => actualizarLinea(linea.id, { monto: e.target.checked ? factura.total : 0 })}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Todo efectivo</span>
                    </label>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <input
                      type="number"
                      value={linea.monto || ""}
                      onChange={e => actualizarLinea(linea.id, { monto: parseFloat(e.target.value) || 0 })}
                      disabled={linea.medio === "tarjeta" && !linea.tarjeta_id}
                      className={`w-32 border rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none ${excedeLimite ? "border-red-400 bg-red-50" : "border-gray-300"} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                      placeholder="0,00"
                    />
                    {excedeLimite && (
                      <span className="text-xs text-red-600 font-medium">
                        Supera el total ({formatARS(restanteParaEstaLinea)})
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
          Confirmar cobro y registrar en cuenta corriente
        </button>
      )}
    </div>
  )
}
