"use client"

import { Fragment, useState, useEffect } from "react"
import { Plus, X, CreditCard, CheckCircle, AlertCircle } from "lucide-react"

// ── Tipos locales ─────────────────────────────────────────────
export interface LineaPago {
  id: number
  medio: "efectivo" | "transferencia" | "tarjeta" | "credito_toma"
  // Moneda en la que el cliente paga esta línea. Solo es independiente del
  // factura.moneda para "efectivo" (ARS/USD). Para tarjeta/transferencia/
  // credito_toma siempre coincide con factura.moneda.
  moneda: "ARS" | "USD"
  // Monto en la moneda indicada por `moneda` (no necesariamente la de la factura)
  monto: number
  tarjeta_id?: number
  cuotas?: number
  // FAC-11: para credito_toma, referencia a la NC (ajustes_clientes.id)
  nc_id?: number
  nc_numero?: string  // visual: ej. "NC-TE-00012"
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
  /** Si se provee, aparece un botón "Modificar medios de pago" tras confirmar.
   * El parent debe usar esto para limpiar su estado (mediosLineas, etc.). */
  onRetrocederMedios?: () => void
  /** FAC-11: líneas pre-cargadas (típicamente "credito_toma" desde NCs activas
   * del cliente). El componente las muestra como medios iniciales — el
   * operador puede quitarlas con la X o mantenerlas. */
  lineasIniciales?: LineaPago[]
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
  onRetrocederMedios,
  lineasIniciales,
}: BloquesMediosPagoProps) {
  const [lineas, setLineas] = useState<LineaPago[]>(() => lineasIniciales ?? [])
  const [cobrado, setCobrado] = useState(false)

  // FAC-11: cuando lineasIniciales cambia (porque cambió el cliente o se
  // detectaron nuevas NCs), reemplazar las líneas. Solo en estado no cobrado.
  useEffect(() => {
    if (cobrado) return
    if (!lineasIniciales) return
    // Si las líneas iniciales coinciden con lo que ya tenemos, no tocar
    const lineasInicialesIds = new Set(lineasIniciales.map(l => l.id))
    const tieneTodasIniciales = lineasIniciales.every(li => lineas.some(l => l.id === li.id))
    if (tieneTodasIniciales && lineas.length === lineasIniciales.length) return
    // Si el operador quitó alguna inicial (X), no la re-agregamos
    const yaQuitadasIds = new Set<number>()
    // (no tracking explícito de quitadas — más simple: solo agregar las que
    // todavía no están en lineas, sin remover las que el operador agregó manual)
    setLineas(prev => {
      const idsExistentes = new Set(prev.map(l => l.id))
      const nuevas = lineasIniciales.filter(li => !idsExistentes.has(li.id) && !yaQuitadasIds.has(li.id))
      return nuevas.length > 0 ? [...nuevas, ...prev] : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lineasIniciales?.map(l => `${l.id}-${l.monto}`) ?? [])])

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
    // FAC-10: separar cargos en "comisión" (no IVA) y "IVA fiscal" (cargos
    // del grupo cuyo nombre contenga "IVA"). El IVA se calcula sobre la base
    // CON recargo + comisión incluidos, no sobre el monto puro.
    const cargosOrig = grupo?.cargos ?? []
    const cargosComision = cargosOrig
      .filter(c => !/iva/i.test(c.nombre))
      .map(c => ({ nombre: c.nombre, pct: c.arancel, importe: linea.monto * (c.arancel / 100) }))
    const totalComision = cargosComision.reduce((s, c) => s + c.importe, 0)
    const baseConRecargoYComision = linea.monto + importeRecargo + totalComision
    const cargosIva = cargosOrig
      .filter(c => /iva/i.test(c.nombre))
      .map(c => ({ nombre: c.nombre, pct: c.arancel, importe: baseConRecargoYComision * (c.arancel / 100) }))
    // Orden visual: recargo, comisiones, IVA fiscal al final (refleja el cálculo)
    const cargos = [...cargosComision, ...cargosIva]
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
    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
    const totalRecargosConfirmado = lineas.reduce((s, l) => s + (calcularLinea(l)?.totalRecargo || 0), 0)
    const totalIngresadoConfirmado = sumarEnFacturaMoneda(lineas)
    const totalConRecargosConfirmado = totalIngresadoConfirmado + totalRecargosConfirmado

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
            <CheckCircle className="w-4 h-4" />
            {textoConfirmado}
          </div>
          {onRetrocederMedios && (
            <button
              onClick={() => {
                setCobrado(false)
                onRetrocederMedios()
              }}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-medium hover:underline"
            >
              Modificar medios de pago
            </button>
          )}
        </div>

        {/* FAC-8: detalle de cómo pagó — tabla flat, sin colapsable.
            Cada fila es independiente; los recargos/comisión/IVA/total a acreditar
            usan badges de colores distintos en la columna Concepto para que el
            operador identifique de un vistazo cada componente. */}
        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-2">
          Detalle del pago
        </p>
        {(() => {
          const cot = factura.cotizacion ?? 0
          const showAR = monedaFac === "USD" && cot > 0
          const arsCell = (v: number) =>
            showAR ? <span className="text-gray-500">≈ {formatARS(v * cot)}</span> : <span>—</span>

          // Filas planas. Cada `linea` es un medio principal; los recargos/comisión/IVA
          // se identifican por una pequeña marca a la izquierda del concepto y un
          // tamaño de texto menor. El "Total a acreditar" cierra cada bloque con
          // borde superior. Sin colores — sólo tipografía y dividers.
          type FilaTipo = "medio" | "equiv" | "recargo" | "comision" | "iva" | "total_acreditar"
          interface Fila {
            tipo: FilaTipo
            concepto: string
            monto: number
            monedaMonto: "ARS" | "USD"
            equivMonto?: number
            grupoIdx: number  // índice del medio al que pertenece esta fila
            esUltimaDelGrupo?: boolean
          }
          const filas: Fila[] = []
          lineas.forEach((linea, i) => {
            const calc = calcularLinea(linea)
            const labelMedio =
              linea.medio === "credito_toma"
                ? `Crédito por toma de equipo${linea.nc_numero ? ` (${linea.nc_numero})` : ""}`
                : linea.medio === "tarjeta" && calc
                  ? `${calc.tarjeta?.nombre ?? "Tarjeta"} — ${linea.cuotas ?? 1} cuota${(linea.cuotas ?? 1) > 1 ? "s" : ""}`
                  : linea.medio === "transferencia" ? "Transferencia"
                  : `Efectivo ${linea.moneda}`
            filas.push({
              tipo: "medio",
              concepto: labelMedio,
              monto: linea.monto,
              monedaMonto: linea.moneda,
              equivMonto: linea.moneda === monedaFac ? linea.monto : undefined,
              grupoIdx: i,
            })
            if (linea.medio === "efectivo" && linea.moneda !== monedaFac) {
              filas.push({
                tipo: "equiv",
                concepto: `Equivalente en ${monedaFac}`,
                monto: montoEnFacturaMoneda(linea.monto, linea.moneda, factura),
                monedaMonto: monedaFac,
                grupoIdx: i,
              })
            }
            if (calc && calc.totalRecargo > 0) {
              if (calc.recargo.recargo_pct > 0) {
                filas.push({
                  tipo: "recargo",
                  concepto: `Recargo ${calc.recargo.recargo_pct}%`,
                  monto: calc.importeRecargo,
                  monedaMonto: monedaFac,
                  equivMonto: calc.importeRecargo,
                  grupoIdx: i,
                })
              }
              for (const c of calc.cargos) {
                const esIva = /iva/i.test(c.nombre)
                filas.push({
                  tipo: esIva ? "iva" : "comision",
                  concepto: `${c.nombre} (${c.pct}%)`,
                  monto: c.importe,
                  monedaMonto: monedaFac,
                  equivMonto: c.importe,
                  grupoIdx: i,
                })
              }
              filas.push({
                tipo: "total_acreditar",
                concepto: "Total a acreditar",
                monto: calc.totalConRecargo,
                monedaMonto: monedaFac,
                equivMonto: calc.totalConRecargo,
                grupoIdx: i,
              })
            }
          })
          // Marcar la última fila de cada grupo (para divider más fuerte entre medios)
          for (let i = 0; i < filas.length; i++) {
            if (i === filas.length - 1 || filas[i + 1].grupoIdx !== filas[i].grupoIdx) {
              filas[i].esUltimaDelGrupo = true
            }
          }

          return (
            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Concepto</th>
                    <th className="text-right py-2 px-3 w-40">Monto</th>
                    <th className="text-right py-2 px-3 w-40">Equiv. ARS</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, idx) => {
                    const isMedio = f.tipo === "medio"
                    const isTotal = f.tipo === "total_acreditar"
                    const isSub = !isMedio && !isTotal
                    const fontWeight = isMedio
                      ? "font-semibold text-gray-900"
                      : isTotal ? "font-semibold text-gray-900"
                      : "font-normal text-gray-600"
                    const textSize = isSub ? "text-xs" : "text-sm"
                    // Borde inferior: línea fina entre filas del mismo grupo;
                    // borde más fuerte al cerrar grupo (separador entre medios)
                    const borderBot = f.esUltimaDelGrupo
                      ? "border-b border-gray-200"
                      : "border-b border-gray-100"
                    const borderTop = isTotal ? "border-t border-gray-200" : ""
                    return (
                      <tr key={idx} className={`${borderBot} ${borderTop}`}>
                        <td className={`py-2 px-3 ${fontWeight} ${textSize}`}>
                          {isSub
                            ? <span className="pl-4 text-gray-500">— {f.concepto}</span>
                            : f.concepto}
                        </td>
                        <td className={`py-2 px-3 text-right ${fontWeight} ${textSize}`}>
                          {formatMoneda(f.monto, f.monedaMonto)}
                        </td>
                        <td className={`py-2 px-3 text-right ${textSize} text-gray-500`}>
                          {f.equivMonto != null ? arsCell(f.equivMonto) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="py-2 px-3 font-bold text-gray-900">Total cobrado</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">
                      {formatMoneda(totalConRecargosConfirmado, monedaFac)}
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                      {showAR
                        ? <>≈ {formatARS(totalConRecargosConfirmado * cot)}</>
                        : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Medios de Pago</h3>
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
          // FAC-11: render especial para crédito por toma de equipo
          if (linea.medio === "credito_toma") {
            return (
              <div key={linea.id} className="rounded-lg border-2 border-amber-300 overflow-hidden bg-amber-50">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded text-xs font-semibold">
                    Crédito por toma de equipo
                  </span>
                  {linea.nc_numero && (
                    <span className="font-mono text-xs text-amber-800">{linea.nc_numero}</span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium shrink-0">{linea.moneda}</span>
                      <input
                        type="number"
                        value={linea.monto || ""}
                        onChange={e => actualizarLinea(linea.id, { monto: parseFloat(e.target.value) || 0 })}
                        className="w-32 border border-amber-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        placeholder="0,00"
                      />
                    </div>
                    <button
                      onClick={() => eliminarLinea(linea.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Quitar este crédito (no se aplicará al confirmar)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          }

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
                  {esPrimeraLineaEfectivo && (() => {
                    // FAC-5: si ya hay otra línea con monto cargado, "Todo efectivo"
                    // confundiría (tomaría sólo el resto, no el total). Lo deshabilito.
                    const otraLineaConMonto = lineas.some(l => l.id !== linea.id && (l.monto || 0) > 0)
                    return (
                      <label
                        className={`flex items-center gap-1.5 select-none ${otraLineaConMonto ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        title={otraLineaConMonto ? "Eliminá los otros medios de pago para usar Todo efectivo" : ""}
                      >
                        <input
                          type="checkbox"
                          disabled={otraLineaConMonto}
                          checked={Math.abs(linea.monto - restanteParaEstaLineaEnMonedaLinea) < 0.5 && restanteParaEstaLineaEnMonedaLinea > 0}
                          onChange={e => actualizarLinea(linea.id, { monto: e.target.checked ? restanteParaEstaLineaEnMonedaLinea : 0 })}
                          className="w-3.5 h-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">Todo efectivo</span>
                      </label>
                    )
                  })()}
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
                  {calc ? (() => {
                    // FAC-6: si la factura es USD, mostrar equivalente ARS al lado.
                    // (Los importes calculados están en la moneda de la factura.)
                    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
                    const cot = factura.cotizacion ?? 0
                    const showAR = monedaFac === "USD" && cot > 0
                    const fmt = (v: number) => formatMoneda(v, monedaFac)
                    const ars = (v: number) => showAR ? <span className="text-gray-400 ml-2">≈ {formatARS(v * cot)}</span> : null
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 mb-2 text-gray-500 font-medium">
                          <CreditCard className="w-3.5 h-3.5" />
                          {calc.tarjeta?.nombre} {calc.tarjeta?.tipo === "credito" ? "Crédito" : "Débito"} — {linea.cuotas} cuota{(linea.cuotas || 1) > 1 ? "s" : ""} · {calc.grupo?.nombre}
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Monto abonado c/tarjeta:</span>
                          <span>{fmt(linea.monto)}{ars(linea.monto)}</span>
                        </div>
                        {calc.recargo.recargo_pct > 0 && (
                          <div className="flex justify-between text-gray-500">
                            <span>Recargo ({calc.recargo.recargo_pct}%):</span>
                            <span>{fmt(calc.importeRecargo)}{ars(calc.importeRecargo)}</span>
                          </div>
                        )}
                        {calc.cargos.map((c, i) => (
                          <div key={i} className="flex justify-between text-gray-500">
                            <span>{c.nombre} ({c.pct}%):</span>
                            <span>{fmt(c.importe)}{ars(c.importe)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 my-1" />
                        <div className="flex justify-between text-amber-700 font-semibold">
                          <span>Total recargo:</span>
                          <span>{fmt(calc.totalRecargo)}{ars(calc.totalRecargo)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900">
                          <span>Total a acreditar:</span>
                          <span>{fmt(calc.totalConRecargo)}{ars(calc.totalConRecargo)}</span>
                        </div>
                      </div>
                    )
                  })() : (
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
