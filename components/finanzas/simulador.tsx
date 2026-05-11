"use client"

// Simulador de recargos de tarjeta — cálculo client-side, sin queries.
// Carga tarjetas + grupos + recargos al montar y permite jugar con
// tarjeta/cuotas/monto/fecha para ver el desglose de recargos.

import { useEffect, useState } from "react"
import { AlertCircle, Calculator, Percent } from "lucide-react"
import { type Tarjeta, type GrupoTarjeta, type RecargoTarjeta } from "./_shared"

const CUOTAS_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

const formatPct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`
const formatCurrency = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Simulador() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [recargos, setRecargos] = useState<RecargoTarjeta[]>([])

  const [tarjetaId, setTarjetaId] = useState<number | "">("")
  const [cuotas, setCuotas] = useState<number>(1)
  const [monto, setMonto] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [resultado, setResultado] = useState<null | {
    recargo: RecargoTarjeta
    grupo: GrupoTarjeta | undefined
    totalRecargo: number
    desglose: { nombre: string; pct: number; importe: number }[]
    totalConRecargo: number
  }>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/tarjetas").then(r => r.json()),
      fetch("/api/grupos-tarjeta").then(r => r.json()),
      fetch("/api/recargos-tarjeta").then(r => r.json()),
    ]).then(([t, g, r]) => {
      if (Array.isArray(t)) setTarjetas(t)
      if (Array.isArray(g)) setGrupos(g)
      if (Array.isArray(r)) setRecargos(r)
    }).catch(console.error)
  }, [])

  const calcular = () => {
    if (!tarjetaId || !monto) return
    const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", "."))
    const fechaDate = new Date(fecha)
    const diaSemana = fechaDate.getDay()
    const diasKeys: (keyof RecargoTarjeta["dias"])[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]
    const diaKey = diasKeys[diaSemana]

    const candidatos = recargos.filter(r =>
      r.tarjeta_id === tarjetaId &&
      r.activo &&
      cuotas >= r.desde_cuota &&
      cuotas <= r.hasta_cuota &&
      (!r.fecha_desde || fecha >= r.fecha_desde) &&
      (!r.fecha_hasta || fecha <= r.fecha_hasta) &&
      r.dias[diaKey]
    )

    if (candidatos.length === 0) {
      setResultado(null)
      setNoEncontrado(true)
      return
    }
    const mejor = candidatos.sort((a, b) => (a.hasta_cuota - a.desde_cuota) - (b.hasta_cuota - b.desde_cuota))[0]
    const grupo = grupos.find(g => g.id === mejor.grupo_id)
    const importeRecargo = montoNum * (mejor.recargo_pct / 100)
    const desglose = (grupo?.cargos ?? []).map(c => ({
      nombre: c.nombre,
      pct: c.arancel,
      importe: montoNum * (c.arancel / 100),
    }))
    const totalRecargo = importeRecargo + desglose.reduce((s, d) => s + d.importe, 0)
    setResultado({
      recargo: mejor,
      grupo,
      totalRecargo,
      desglose: [{ nombre: `Recargo ${mejor.recargo_pct}%`, pct: mejor.recargo_pct, importe: importeRecargo }, ...desglose],
      totalConRecargo: montoNum + totalRecargo,
    })
    setNoEncontrado(false)
  }

  const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", ".")) || 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-900">Simulador de Recargos</h1>
        <p className="text-sm text-gray-500 mt-1">Calcula el recargo que se aplica a una tarjeta en cuotas según los grupos y recargos configurados.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" /> Parámetros
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarjeta</label>
            <select value={tarjetaId} onChange={e => setTarjetaId(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">Seleccionar tarjeta...</option>
              {tarjetas.filter(t => t.activa).map(t => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas</label>
            <div className="flex gap-2 flex-wrap">
              {CUOTAS_OPTIONS.map(c => (
                <button key={c} onClick={() => setCuotas(c)}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                    cuotas === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"
                  }`}>
                  {c}c
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto (ARS)</label>
            <input type="text" placeholder="Ej: 50000" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <button onClick={calcular} disabled={!tarjetaId || !monto}
            className="w-full py-2 bg-emerald-700 text-white rounded-md font-medium hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            Calcular recargo
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-amber-600" /> Resultado
          </h3>
          {!resultado && !noEncontrado && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Calculator className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Completá los parámetros y calculá</p>
            </div>
          )}
          {noEncontrado && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">No se encontró un recargo configurado para la combinación seleccionada. Verificá la configuración.</p>
            </div>
          )}
          {resultado && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Tarjeta:</span>
                  <span className="font-medium">{tarjetas.find(t => t.id === tarjetaId)?.nombre} — {cuotas} cuota{cuotas > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Grupo:</span><span className="font-medium">{resultado.grupo?.nombre ?? "—"}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Monto base:</span><span className="font-medium">{formatCurrency(montoNum)}</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-800 text-white text-xs font-semibold uppercase px-4 py-2">Desglose de recargo</div>
                <table className="w-full text-sm">
                  <tbody>
                    {resultado.desglose.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-4 text-gray-700">{d.nombre}</td>
                        <td className="py-2 px-4 text-right text-gray-500 font-mono">{formatPct(d.pct)}</td>
                        <td className="py-2 px-4 text-right font-medium">{formatCurrency(d.importe)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50">
                      <td className="py-2.5 px-4 font-semibold text-amber-900">Total recargo</td>
                      <td className="py-2.5 px-4"></td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700">{formatCurrency(resultado.totalRecargo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-900 rounded-lg p-4 text-white flex justify-between items-center">
                <span className="font-semibold">Total con recargo:</span>
                <span className="text-xl font-bold">{formatCurrency(resultado.totalConRecargo)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
