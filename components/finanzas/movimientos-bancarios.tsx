"use client"

// ─── Movimientos Bancarios — vista libro mayor por cuenta bancaria ──────────
//
// Flujo:
//   1) Modal pregunta: cuenta bancaria + fecha desde / hasta.
//   2) Confirmar → trae todos los movimientos de esa cuenta en el rango,
//      ordenados por fecha ascendente, con saldo corriente.
//   3) Saldo inicial = suma signed (ingreso − egreso) de TODOS los movs
//      anteriores a `fecha_desde` (así el saldo del primer renglón es real).
//
// La columna "Saldo" se calcula en JS — no la guardamos en DB porque cambia
// con cada movimiento nuevo. Es similar a un libro mayor contable.

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { BookOpen, Building2, Calendar, RefreshCw, X, ArrowLeft } from "lucide-react"

interface CuentaBancaria {
  id: string
  numero_cuenta: string
  banco_nombre: string
  diario_nombre: string | null
  moneda: string
  tipo_cuenta: string
}

interface Movimiento {
  id: string
  cuenta_bancaria_id: string
  tipo_movimiento: "ingreso" | "egreso"
  importe: number
  moneda: string
  tipo_operacion: string | null
  numero_operacion: string | null
  fecha_operacion: string
  concepto: string | null
  documento_origen_tipo: string | null
  documento_origen_numero: string | null
  conciliado: boolean
  estado_movimiento?: "confirmado" | "cancelado" | null
  created_at: string
}

interface FilaLibroMayor extends Movimiento {
  saldo: number
}

const fmtMoneda = (n: number, moneda: string) => {
  const s = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))
  const signo = n < 0 ? "-" : ""
  return `${signo}${moneda === "USD" ? "USD " : "$"}${s}`
}

const fmtFecha = (iso: string) => {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const hoyIso = () => new Date().toISOString().split("T")[0]
const haceUnMes = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().split("T")[0]
}

export default function MovimientosBancarios() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)

  // Filtros (vienen del modal de selección)
  const [cuentaId, setCuentaId] = useState<string>("")
  const [fechaDesde, setFechaDesde] = useState<string>(haceUnMes())
  const [fechaHasta, setFechaHasta] = useState<string>(hoyIso())

  // Estado de la consulta
  const [modalAbierto, setModalAbierto] = useState(true)
  const [cargandoMovs, setCargandoMovs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaLibroMayor[]>([])
  const [saldoInicial, setSaldoInicial] = useState<number>(0)
  // `yaConsulto` = el usuario apretó "Consultar" al menos una vez. Sirve para
  // distinguir "nunca consultó" (placeholder con CTA) de "consultó y vino vacío"
  // (mostramos resumen con saldo inicial + tabla con 'sin movimientos').
  const [yaConsulto, setYaConsulto] = useState(false)

  // Cargar cuentas bancarias activas al montar
  useEffect(() => {
    const supabase = createClient()
    supabase.from("cuentas_bancarias")
      .select("id, numero_cuenta, banco_nombre, diario_nombre, moneda, tipo_cuenta")
      .eq("activo", true)
      .order("banco_nombre")
      .then(({ data, error }) => {
        if (error) console.error("[movimientos-bancarios] cuentas:", error)
        setCuentas(Array.isArray(data) ? data as CuentaBancaria[] : [])
        setCargandoCuentas(false)
      })
  }, [])

  const cuentaSel = useMemo(() => cuentas.find(c => c.id === cuentaId), [cuentas, cuentaId])

  // Trae los movimientos del rango + calcula saldo inicial mirando los
  // movimientos previos a fechaDesde. Saldo corriente se va calculando en JS.
  const cargarMovimientos = async () => {
    if (!cuentaId) { setError("Elegí una cuenta bancaria"); return }
    if (!fechaDesde || !fechaHasta) { setError("Falta el rango de fechas"); return }
    setError(null)
    setCargandoMovs(true)
    try {
      const supabase = createClient()

      // 1) Saldo inicial = suma signed de movs previos a fechaDesde
      //    Excluimos los cancelados — son rastro de auditoría, no afectan saldo.
      const { data: previos, error: ePrev } = await supabase
        .from("movimientos_banco")
        .select("tipo_movimiento, importe, estado_movimiento")
        .eq("cuenta_bancaria_id", cuentaId)
        .lt("fecha_operacion", fechaDesde)
      if (ePrev) throw new Error(ePrev.message)
      const inicial = (previos ?? [])
        .filter((m: any) => m.estado_movimiento !== "cancelado")
        .reduce((s, m: any) =>
          s + (m.tipo_movimiento === "ingreso" ? Number(m.importe) : -Number(m.importe)),
        0)
      setSaldoInicial(inicial)

      // 2) Movimientos en el rango (orden ascendente para libro mayor)
      const { data: movs, error: eMovs } = await supabase
        .from("movimientos_banco")
        .select("*")
        .eq("cuenta_bancaria_id", cuentaId)
        .gte("fecha_operacion", fechaDesde)
        .lte("fecha_operacion", fechaHasta)
        .order("fecha_operacion", { ascending: true })
        .order("created_at", { ascending: true })  // desempate consistente
      if (eMovs) throw new Error(eMovs.message)

      // 3) Calcular saldo corriente (los cancelados se muestran tachados
      //    pero no suman ni restan al saldo)
      let saldo = inicial
      const enriched: FilaLibroMayor[] = (movs ?? []).map((m: any) => {
        if (m.estado_movimiento !== "cancelado") {
          saldo += m.tipo_movimiento === "ingreso" ? Number(m.importe) : -Number(m.importe)
        }
        return { ...(m as Movimiento), saldo }
      })
      setFilas(enriched)
      setYaConsulto(true)
      setModalAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar movimientos")
    } finally {
      setCargandoMovs(false)
    }
  }

  // Totales del rango (excluyen cancelados)
  const filasVivas = filas.filter(f => f.estado_movimiento !== "cancelado")
  const totalIngresos = filasVivas.filter(f => f.tipo_movimiento === "ingreso").reduce((s, f) => s + Number(f.importe), 0)
  const totalEgresos  = filasVivas.filter(f => f.tipo_movimiento === "egreso").reduce((s, f) => s + Number(f.importe), 0)
  const saldoFinal    = saldoInicial + totalIngresos - totalEgresos

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Movimientos Bancarios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Libro mayor por cuenta bancaria con saldo corriente.</p>
        </div>
        {!modalAbierto && (
          <button
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Cambiar consulta
          </button>
        )}
      </div>

      {/* Modal de filtros (al inicio o cuando se cambia consulta) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-700" />
                Consulta de movimientos
              </h2>
              {/* X siempre visible — el caller debe poder salir sin consultar.
                  Si no hay datos previos, el contenido de fondo muestra un
                  placeholder que invita a reabrir la consulta. */}
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Bancaria *</label>
                <select
                  value={cuentaId}
                  onChange={e => setCuentaId(e.target.value)}
                  disabled={cargandoCuentas}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">{cargandoCuentas ? "Cargando..." : "Seleccionar..."}</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.banco_nombre}{c.diario_nombre ? ` — ${c.diario_nombre}` : ""}{c.numero_cuenta ? ` (${c.numero_cuenta})` : ""} · {c.moneda}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha desde *</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha hasta *</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Se incluye el saldo previo a la fecha desde, así el primer renglón arranca con el saldo real.
              </p>
            </div>

            <div className="px-5 py-3 border-t flex justify-end gap-2">
              {filas.length > 0 && (
                <button
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={cargarMovimientos}
                disabled={cargandoMovs || !cuentaId}
                className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50"
              >
                {cargandoMovs ? "Cargando..." : "Consultar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío: el usuario cerró el modal sin haber consultado nunca. */}
      {!modalAbierto && !yaConsulto && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-1">Sin consulta activa</p>
          <p className="text-sm text-gray-500 mb-4">
            Elegí una cuenta bancaria y un rango de fechas para ver los movimientos.
          </p>
          <button
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 inline-flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Abrir consulta
          </button>
        </div>
      )}

      {/* Resultado: libro mayor (incluso si filas viene vacío, mostramos
          el resumen con saldo inicial — eso confirma que la consulta corrió). */}
      {!modalAbierto && yaConsulto && (
        <>
          {/* Resumen arriba */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Cuenta
                </div>
                <div className="font-semibold text-gray-900 truncate">
                  {cuentaSel?.banco_nombre ?? "—"}
                </div>
                {cuentaSel?.diario_nombre && <div className="text-xs text-gray-500 truncate">{cuentaSel.diario_nombre}</div>}
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período
                </div>
                <div className="text-sm text-gray-900">
                  {fmtFecha(fechaDesde)} <span className="text-gray-400">→</span> {fmtFecha(fechaHasta)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Saldo inicial</div>
                <div className={`font-mono font-semibold ${saldoInicial < 0 ? "text-red-700" : "text-gray-900"}`}>
                  {fmtMoneda(saldoInicial, cuentaSel?.moneda ?? "ARS")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Movimientos</div>
                <div className="text-sm">
                  <span className="text-emerald-700 font-medium">+{fmtMoneda(totalIngresos, cuentaSel?.moneda ?? "ARS")}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-red-700 font-medium">-{fmtMoneda(totalEgresos, cuentaSel?.moneda ?? "ARS")}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">Saldo final</div>
                <div className={`font-mono font-bold text-base ${saldoFinal < 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {fmtMoneda(saldoFinal, cuentaSel?.moneda ?? "ARS")}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla libro mayor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {filas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No hay movimientos en este rango.</p>
                <p className="text-xs mt-1">Saldo inicial: {fmtMoneda(saldoInicial, cuentaSel?.moneda ?? "ARS")}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Operación</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Origen</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-32">Ingreso</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-32">Egreso</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase w-36">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Orden inverso: más reciente arriba. El saldo de cada
                      renglón está pre-calculado en ASC, así que dar vuelta
                      el array no rompe los saldos. */}
                  {[...filas].reverse().map(f => {
                    const esIngreso = f.tipo_movimiento === "ingreso"
                    const cancelado = f.estado_movimiento === "cancelado"
                    const cls = cancelado ? "line-through text-gray-400" : ""
                    return (
                      <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className={`py-2 px-3 text-gray-700 whitespace-nowrap ${cls}`}>{fmtFecha(f.fecha_operacion)}</td>
                        <td className={`py-2 px-3 text-gray-600 ${cls}`}>{f.tipo_operacion ?? "—"}{cancelado && <span className="ml-1 text-xs text-red-500">(cancelado)</span>}</td>
                        <td className={`py-2 px-3 text-gray-700 ${cls}`}>{f.concepto ?? "—"}</td>
                        <td className={`py-2 px-3 text-xs text-gray-500 ${cls}`}>
                          {f.documento_origen_numero ?? f.numero_operacion ?? "—"}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono ${cls}`}>
                          {esIngreso ? <span className={cancelado ? "" : "text-emerald-700 font-medium"}>{fmtMoneda(Number(f.importe), f.moneda)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono ${cls}`}>
                          {!esIngreso ? <span className={cancelado ? "" : "text-red-700 font-medium"}>{fmtMoneda(Number(f.importe), f.moneda)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-semibold ${f.saldo < 0 ? "text-red-700" : "text-gray-900"}`}>
                          {fmtMoneda(f.saldo, cuentaSel?.moneda ?? "ARS")}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Saldo inicial al pie — es el ancla del período. */}
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td className="py-2 px-3 text-xs text-gray-500" colSpan={4}>
                      Saldo al {fmtFecha(fechaDesde)}
                    </td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3"></td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold ${saldoInicial < 0 ? "text-red-700" : "text-gray-700"}`}>
                      {fmtMoneda(saldoInicial, cuentaSel?.moneda ?? "ARS")}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="py-2 px-3 text-right text-xs uppercase font-semibold text-gray-600">
                      Totales del período
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                      {fmtMoneda(totalIngresos, cuentaSel?.moneda ?? "ARS")}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-red-700">
                      {fmtMoneda(totalEgresos, cuentaSel?.moneda ?? "ARS")}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold text-base ${saldoFinal < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {fmtMoneda(saldoFinal, cuentaSel?.moneda ?? "ARS")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
