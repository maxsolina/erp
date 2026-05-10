"use client"

// Extraído de components/ventas-module.tsx → renderCrearTomaEquipo (~6244-6755).
// Wizard de 4 pasos: Cliente → Equipo → Evaluación → Confirmación.
// Carga cotizador (modelos/categorías/criterios) + cotización USD blue desde APIs.

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Package,
  Smartphone,
} from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { useClientes, type ClienteDB } from "@/hooks/use-clientes"
import SearchableSelect from "@/components/ui/searchable-select"
import {
  calcularPrecioFinalUsd,
  formatCurrency,
  type CotizadorCategoria,
  type CotizadorCriterio,
  type CotizadorModelo,
  type TomaEquipo,
  type TomaEquipoEvaluacionItem,
} from "./_shared"

interface Props {
  onCancelar: () => void
  onCreada: (toma: TomaEquipo) => void
}

export default function TomaEquipoFormulario({ onCancelar, onCreada }: Props) {
  const { sucursalActiva } = useERP()
  const { clientes } = useClientes()

  // Cotizador
  const [cotizadorModelos, setCotizadorModelos] = useState<CotizadorModelo[]>([])
  const [cotizadorCategorias, setCotizadorCategorias] = useState<CotizadorCategoria[]>([])
  const [cotizadorCriteriosByModelo, setCotizadorCriteriosByModelo] = useState<
    Record<string, CotizadorCriterio[]>
  >({})
  const [cotizacionUsdBlue, setCotizacionUsdBlue] = useState(0)

  // Wizard state
  const [paso, setPaso] = useState(1)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [modeloId, setModeloId] = useState<string | null>(null)
  const [precioBaseUsd, setPrecioBaseUsd] = useState(0)
  const [precioFinalUsd, setPrecioFinalUsd] = useState(0)
  const [evaluacion, setEvaluacion] = useState<TomaEquipoEvaluacionItem[]>([])
  const [guardando, setGuardando] = useState(false)

  // Carga inicial cotizador + cotización
  useEffect(() => {
    Promise.all([
      fetch("/api/cotizador/modelos").then(r => r.json()),
      fetch("/api/cotizador/categorias").then(r => r.json()),
      fetch("/api/cotizador/criterios").then(r => r.json()),
      fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true").then(r => r.json()),
    ])
      .then(([modelosResp, categorias, criterios, cotiz]) => {
        const modelos: CotizadorModelo[] = (Array.isArray(modelosResp) ? modelosResp : [])
          .filter((m: any) => m.activo)
          .map((m: any) => ({
            id: m.id,
            producto_id: m.producto_id,
            producto_nombre: m.producto?.nombre ?? `#${m.producto_id}`,
            valor_base_usd: Number(m.valor_base_usd),
          }))
        setCotizadorModelos(modelos)

        const cats: CotizadorCategoria[] = (Array.isArray(categorias) ? categorias : [])
          .filter((c: any) => c.activo)
          .sort((a: any, b: any) => a.orden - b.orden)
        setCotizadorCategorias(cats)

        const byModelo: Record<string, CotizadorCriterio[]> = {}
        const modeloPorId: Record<string, number> = {}
        for (const m of modelos) modeloPorId[m.id] = m.valor_base_usd
        for (const c of Array.isArray(criterios) ? criterios : []) {
          if (!c.activo) continue
          if (!byModelo[c.modelo_id]) byModelo[c.modelo_id] = []
          const pct = c.descuento_porcentaje !== null && c.descuento_porcentaje !== undefined ? Number(c.descuento_porcentaje) : null
          const base = modeloPorId[c.modelo_id] ?? 0
          const usdEfectivo = pct !== null ? Number(((base * pct) / 100).toFixed(2)) : Number(c.descuento_usd)
          byModelo[c.modelo_id].push({
            id: c.id,
            categoria_id: c.categoria_id,
            etiqueta: c.etiqueta,
            descuento_usd: usdEfectivo,
            descuento_porcentaje: pct,
          })
        }
        for (const mid of Object.keys(byModelo)) {
          byModelo[mid].sort((a, b) => a.descuento_usd - b.descuento_usd)
        }
        setCotizadorCriteriosByModelo(byModelo)

        if (cotiz?.tasa) setCotizacionUsdBlue(Number(cotiz.tasa))
      })
      .catch(console.error)
  }, [])

  // Filtrar modelos cotizables: tienen criterios "Impecable" (descuento 0) en TODAS las categorías de descuento
  const modelosCotizables = useMemo(() => {
    if (!cotizadorCategorias.length || !cotizadorModelos.length) return [] as CotizadorModelo[]
    const catsRequeridas = cotizadorCategorias.filter(c => c.accion === "descuento")
    if (!catsRequeridas.length) return cotizadorModelos
    return cotizadorModelos.filter(m => {
      const criterios = cotizadorCriteriosByModelo[m.id] ?? []
      return catsRequeridas.every(cat =>
        criterios.some(cr => cr.categoria_id === cat.id && Number(cr.descuento_usd) === 0),
      )
    })
  }, [cotizadorModelos, cotizadorCategorias, cotizadorCriteriosByModelo])

  const clienteSeleccionado: ClienteDB | undefined = clientes.find(c => c.id === clienteId)
  const modeloSeleccionado = cotizadorModelos.find(m => m.id === modeloId)
  const criteriosDelModelo = modeloId ? cotizadorCriteriosByModelo[modeloId] ?? [] : []

  const { final: precioCalculadoUsd, descuentoTotal: descuentoTotalUsd, aplicaCartel } = calcularPrecioFinalUsd(
    precioBaseUsd,
    evaluacion,
  )
  const precioFinalUsdEditable = precioFinalUsd > 0 ? precioFinalUsd : precioCalculadoUsd
  const precioFinalArs = cotizacionUsdBlue > 0 ? precioFinalUsdEditable * cotizacionUsdBlue : 0
  const tieneFlagWhatsapp = evaluacion.some(e => e.accion === "whatsapp" && e.whatsapp_flag)
  const rangoMinUsd = Number((precioCalculadoUsd * 0.8).toFixed(2))
  const rangoMaxUsd = Number((precioCalculadoUsd * 1.2).toFixed(2))
  const fueraDeRango =
    precioCalculadoUsd > 0 && (precioFinalUsdEditable < rangoMinUsd || precioFinalUsdEditable > rangoMaxUsd)

  const inicializarEvaluacion = (mid: string) => {
    const criterios = cotizadorCriteriosByModelo[mid] ?? []
    const evalInicial = cotizadorCategorias.map(cat => {
      const opcionesCat = criterios
        .filter(c => c.categoria_id === cat.id)
        .sort((a, b) => a.descuento_usd - b.descuento_usd)
      if (cat.accion === "whatsapp" && opcionesCat.length === 0) {
        return {
          categoria_id: cat.id,
          categoria_nombre: cat.nombre,
          accion: cat.accion,
          criterio_id: null,
          etiqueta: "Sin daño",
          descuento_usd: 0,
          whatsapp_flag: false,
        }
      }
      const impecable = opcionesCat.find(c => Number(c.descuento_usd) === 0) ?? opcionesCat[0]
      return {
        categoria_id: cat.id,
        categoria_nombre: cat.nombre,
        accion: cat.accion,
        criterio_id: impecable?.id ?? null,
        etiqueta: impecable?.etiqueta ?? "—",
        descuento_usd: Number(impecable?.descuento_usd ?? 0),
        whatsapp_flag: false,
      }
    })
    setEvaluacion(evalInicial)
  }

  const handleConfirmar = async () => {
    if (!clienteSeleccionado || !modeloSeleccionado || guardando) return
    if (!cotizacionUsdBlue || cotizacionUsdBlue <= 0) {
      alert("No hay cotización USD blue del día. Cargá una en Contabilidad → Cotizaciones antes de confirmar.")
      return
    }
    setGuardando(true)
    try {
      const res = await fetch("/api/tomas-equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteSeleccionado.id,
          cliente_nombre: clienteSeleccionado.nombre,
          modelo_equipo: modeloSeleccionado.producto_nombre,
          producto_id: modeloSeleccionado.producto_id,
          precio_base_usd: precioBaseUsd,
          descuentos_usd: descuentoTotalUsd,
          precio_final_usd: precioFinalUsdEditable,
          cotizacion: cotizacionUsdBlue,
          sucursal_id: sucursalActiva?.id ?? null,
          evaluacion: evaluacion.map(e => ({
            categoria_id: e.categoria_id,
            categoria: e.categoria_nombre,
            accion: e.accion,
            criterio_id: e.criterio_id,
            etiqueta: e.etiqueta,
            descuento_usd: e.descuento_usd,
            whatsapp_flag: e.whatsapp_flag,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Error al crear la toma")
        setGuardando(false)
        return
      }
      if (data._asiento_nc_error) {
        alert(`⚠️ Toma registrada, pero el asiento contable de la NC no se generó:\n${data._asiento_nc_error}`)
      }
      const updated = await fetch("/api/tomas-equipo")
      if (updated.ok) {
        const tomas: TomaEquipo[] = await updated.json()
        const tomaCreada = tomas.find(t => t.id === data.id)
        if (tomaCreada) {
          onCreada(tomaCreada)
          return
        }
      }
      // Fallback: navegar al listado
      onCreada({ ...(data as TomaEquipo) })
    } catch (err) {
      console.error("[tomas-equipo] error al persistir:", err)
      alert("Error de red al crear la toma")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancelar} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Cancelar">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-amber-900">Nueva Toma de Equipo</h1>
          <p className="text-sm text-gray-500">Complete el wizard para registrar la toma</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: "Cliente" },
          { num: 2, label: "Equipo" },
          { num: 3, label: "Evaluación" },
          { num: 4, label: "Confirmación" },
        ].map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                paso >= step.num ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {paso > step.num ? <CheckCircle className="w-5 h-5" /> : step.num}
            </div>
            <span className={`ml-2 text-sm font-medium ${paso >= step.num ? "text-emerald-700" : "text-gray-500"}`}>
              {step.label}
            </span>
            {idx < 3 && (
              <div className={`w-16 h-1 mx-4 rounded ${paso > step.num ? "bg-emerald-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Paso 1: Cliente */}
        {paso === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Seleccione el Cliente</h2>
            <p className="text-sm text-gray-500 mb-6">
              El cliente seleccionado recibirá una nota de crédito en su cuenta corriente.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <SearchableSelect
                  value={clienteId}
                  onChange={v => setClienteId(v == null ? null : Number(v))}
                  options={clientes.map(c => ({
                    value: String(c.id),
                    label: c.codigo ? `${c.codigo} - ${c.nombre}` : c.nombre,
                    hint: c.telefono ? `Tel: ${c.telefono}` : undefined,
                    searchExtra: `${c.codigo ?? ""} ${c.telefono ?? ""} ${c.numero_documento ?? ""}`,
                  }))}
                  placeholder="Buscar cliente por nombre, código o teléfono…"
                />
              </div>

              {clienteSeleccionado && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Documento:</span>
                      <span className="ml-2 font-medium">
                        {clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Teléfono:</span>
                      <span className="ml-2 font-medium">{clienteSeleccionado.telefono}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Saldo Actual:</span>
                      <span
                        className={`ml-2 font-semibold ${
                          (clienteSeleccionado.saldo_cuenta_corriente ?? 0) > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(Math.abs(clienteSeleccionado.saldo_cuenta_corriente ?? 0))}{" "}
                        {(clienteSeleccionado.saldo_cuenta_corriente ?? 0) > 0 ? "(Debe)" : "(A favor)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => clienteId && setPaso(2)}
                disabled={!clienteId}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Equipo */}
        {paso === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Seleccione el Modelo de Equipo</h2>
            <p className="text-sm text-gray-500 mb-6">
              Solo se muestran modelos con criterios de evaluación completos.
            </p>

            {modelosCotizables.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No hay modelos cotizables. Configurá modelos y criterios en Ventas → Configuración → Criterios para
                cotizador.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Equipo</label>
                <SearchableSelect
                  value={modeloId}
                  onChange={v => {
                    const id = v == null ? null : String(v)
                    const modelo = id ? cotizadorModelos.find(m => m.id === id) : undefined
                    setModeloId(id)
                    setPrecioBaseUsd(modelo?.valor_base_usd || 0)
                    setPrecioFinalUsd(0)
                    if (id) inicializarEvaluacion(id)
                  }}
                  options={modelosCotizables.map(m => ({
                    value: m.id,
                    label: m.producto_nombre,
                    hint: `USD ${m.valor_base_usd.toFixed(2)}`,
                    searchExtra: `${m.valor_base_usd}`,
                  }))}
                  placeholder="Buscar modelo de equipo…"
                />
              </div>

              {modeloSeleccionado && (
                <div className="bg-emerald-50 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-10 h-10 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-900">{modeloSeleccionado.producto_nombre}</p>
                      <p className="text-sm text-emerald-700">
                        Valor base: <span className="font-bold">USD {modeloSeleccionado.valor_base_usd.toFixed(2)}</span>
                      </p>
                      {cotizacionUsdBlue > 0 && (
                        <p className="text-xs text-emerald-600">
                          ≈ {formatCurrency(modeloSeleccionado.valor_base_usd * cotizacionUsdBlue)} (cotización blue: $
                          {cotizacionUsdBlue.toFixed(2)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setPaso(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => modeloId && setPaso(3)}
                disabled={!modeloId}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Evaluación */}
        {paso === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Evaluación del Estado del Equipo</h2>
            <p className="text-sm text-gray-500 mb-6">
              Evalúe cada categoría según el estado real del equipo. Los descuentos se aplican en USD.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {evaluacion.map((ev, idx) => {
                const opciones = criteriosDelModelo.filter(c => c.categoria_id === ev.categoria_id)

                if (ev.accion === "whatsapp" && opciones.length === 0) {
                  return (
                    <div key={ev.categoria_id} className="border rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ev.whatsapp_flag}
                          onChange={e => {
                            const next = [...evaluacion]
                            next[idx] = {
                              ...ev,
                              whatsapp_flag: e.target.checked,
                              etiqueta: e.target.checked ? "Con daño (sin criterios cargados)" : "Sin daño",
                            }
                            setEvaluacion(next)
                            setPrecioFinalUsd(0)
                          }}
                        />
                        ¿Tiene daño en {ev.categoria_nombre}?
                      </label>
                      {ev.whatsapp_flag && (
                        <p className="text-xs text-amber-600 mt-1.5">
                          Cargá criterios para esta categoría en Configuración para poder aplicar descuento.
                        </p>
                      )}
                    </div>
                  )
                }
                return (
                  <div key={ev.categoria_id} className="border rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {ev.categoria_nombre}
                      {ev.accion === "cartel_sistema" && (
                        <span className="ml-2 text-xs text-amber-600">(-50% si aplica)</span>
                      )}
                    </label>
                    <select
                      value={ev.criterio_id ?? ""}
                      onChange={e => {
                        const opt = opciones.find(o => o.id === e.target.value)
                        if (!opt) return
                        const next = [...evaluacion]
                        next[idx] = {
                          ...ev,
                          criterio_id: opt.id,
                          etiqueta: opt.etiqueta,
                          descuento_usd: Number(opt.descuento_usd),
                        }
                        setEvaluacion(next)
                        setPrecioFinalUsd(0)
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      {opciones.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.etiqueta}
                          {o.descuento_usd > 0 ? ` (-USD ${o.descuento_usd.toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen de Valorización (USD)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Valor base:</span>
                  <span className="font-medium">USD {precioBaseUsd.toFixed(2)}</span>
                </div>
                {aplicaCartel && (
                  <div className="flex justify-between text-amber-700">
                    <span>⚠️ Cartel de sistema (-50%):</span>
                    <span>-USD {(precioBaseUsd * 0.5).toFixed(2)}</span>
                  </div>
                )}
                {evaluacion
                  .filter(e => e.accion !== "cartel_sistema" && e.criterio_id && e.descuento_usd > 0)
                  .map(e => (
                    <div key={e.categoria_id} className="flex justify-between text-red-600">
                      <span>
                        - {e.categoria_nombre} ({e.etiqueta}):
                      </span>
                      <span>-USD {e.descuento_usd.toFixed(2)}</span>
                    </div>
                  ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Precio sugerido:</span>
                  <span className="text-emerald-600">USD {precioCalculadoUsd.toFixed(2)}</span>
                </div>
                {cotizacionUsdBlue > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Equivalente ARS @ {cotizacionUsdBlue.toFixed(2)}:</span>
                    <span>{formatCurrency(precioCalculadoUsd * cotizacionUsdBlue)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Final acordado (USD)
                  {precioCalculadoUsd > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Rango ±20%: USD {rangoMinUsd.toFixed(2)} – USD {rangoMaxUsd.toFixed(2)}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioFinalUsd || precioCalculadoUsd}
                  onChange={e => setPrecioFinalUsd(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    fueraDeRango
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-emerald-500"
                  }`}
                />
                {fueraDeRango ? (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Precio fuera del rango permitido (±20%). Requiere aprobación del supervisor.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    El operador puede ajustar el precio final si negocia con el cliente.
                  </p>
                )}
              </div>
            </div>

            {tieneFlagWhatsapp && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mt-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  El equipo tiene daños que requieren evaluación presencial. El precio final puede ajustarse después
                  de la inspección física.
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setPaso(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setPaso(4)}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 flex items-center gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {paso === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Confirmación de la Operación</h2>
            <p className="text-sm text-gray-500 mb-6">
              Revise los datos antes de confirmar. Se generará una recepción de compra y una nota de crédito en USD.
            </p>

            {(!cotizacionUsdBlue || cotizacionUsdBlue <= 0) && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No hay cotización USD blue del día. Cargá una en Contabilidad → Cotizaciones antes de confirmar.
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
                <p className="text-sm">
                  {clienteSeleccionado?.codigo} - {clienteSeleccionado?.nombre}
                </p>
                <p className="text-sm text-gray-500">
                  {clienteSeleccionado?.tipo_documento}: {clienteSeleccionado?.numero_documento}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Equipo</h3>
                <p className="text-sm font-medium">{modeloSeleccionado?.producto_nombre}</p>
                <div className="mt-2 space-y-1">
                  {evaluacion.map(e => (
                    <div key={e.categoria_id} className="flex justify-between text-xs">
                      <span className="text-gray-500">{e.categoria_nombre}:</span>
                      <span className={e.descuento_usd > 0 || e.whatsapp_flag ? "text-red-600" : "text-emerald-600"}>
                        {e.etiqueta}
                        {e.descuento_usd > 0 ? ` (-USD ${e.descuento_usd.toFixed(2)})` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-900 mb-2">Resumen Financiero</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Valor base:</span>
                    <span>USD {precioBaseUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos aplicados:</span>
                    <span>-USD {descuentoTotalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-emerald-200">
                    <span>Precio Final Acordado:</span>
                    <span className="text-emerald-700">USD {precioFinalUsdEditable.toFixed(2)}</span>
                  </div>
                  {cotizacionUsdBlue > 0 && (
                    <div className="flex justify-between text-xs text-gray-600 pt-1">
                      <span>Equivalente ARS @ blue {cotizacionUsdBlue.toFixed(2)}:</span>
                      <span className="font-medium">{formatCurrency(precioFinalArs)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Comprobantes a Generar</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Recepción de Compra (pendiente de recepción física)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Nota de Crédito por USD {precioFinalUsdEditable.toFixed(2)} en CC del cliente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-700 pl-6">
                    <span>+ asiento contable en ARS al cambio del día (blue)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setPaso(3)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={handleConfirmar}
                disabled={guardando || !cotizacionUsdBlue || cotizacionUsdBlue <= 0}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" /> {guardando ? "Procesando..." : "Confirmar Operación"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
