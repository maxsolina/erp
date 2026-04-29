"use client"

// Extraído de components/ventas-module.tsx → renderDetalleVersion (~14165-14567),
// modo lectura. La parte de edición se movió a `version-formulario.tsx`.
//
// Como no hay endpoint GET /api/listas-precios/versiones/[id], se obtiene el listado
// completo y se filtra por id (mismo enfoque que el ventas-module original, que tenía
// `versionesLista` cargado en memoria).

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Edit, AlertCircle, CheckCircle } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "./seguimiento-panel"
import {
  formatCurrency,
  formatPrecioForzadoARS,
  normalizarLista,
  type ListaPrecios,
  type VersionListaPrecios,
} from "./_shared"

export default function VersionFicha({ versionId }: { versionId: number }) {
  const router = useRouter()
  const [version, setVersion] = useState<VersionListaPrecios | null>(null)
  const [versionesDeLista, setVersionesDeLista] = useState<VersionListaPrecios[]>([])
  const [listaPrecios, setListaPrecios] = useState<ListaPrecios | null>(null)
  const [cotizacionesUsdPorTipo, setCotizacionesUsdPorTipo] = useState<Record<string, number>>({})
  const [cotizacionUsdBlue, setCotizacionUsdBlue] = useState<number>(0)

  // Carga de la versión: traemos todas y filtramos por id
  useEffect(() => {
    fetch("/api/listas-precios/versiones")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const v: VersionListaPrecios | undefined = data.find((x: VersionListaPrecios) => x.id === versionId)
        if (!v) {
          setVersion(null)
          return
        }
        setVersion(v)
        setVersionesDeLista(data.filter((x: VersionListaPrecios) => x.lista_precios_id === v.lista_precios_id))
      })
      .catch(() => {})
  }, [versionId])

  // Lista padre para mostrar moneda y tipo_cotizacion
  useEffect(() => {
    if (!version) return
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const found = data.map(normalizarLista).find((l: ListaPrecios) => l.id === version.lista_precios_id) ?? null
        setListaPrecios(found)
      })
      .catch(() => {})
  }, [version])

  // Cotizaciones USD por tipo (mismo patrón que ventas-module líneas 1574-1590)
  useEffect(() => {
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD")
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return
        const byTipo: Record<string, number> = {}
        for (const r of rows) {
          if (r?.tipo && byTipo[r.tipo] === undefined) {
            byTipo[r.tipo] = Number(r.tasa ?? r.valor ?? 0)
          }
        }
        setCotizacionesUsdPorTipo(byTipo)
      })
      .catch(() => {})

    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.tasa) setCotizacionUsdBlue(Number(d.tasa))
      })
      .catch(() => {})
  }, [])

  const { prevVersion, nextVersion } = useMemo(() => {
    if (!version) return { prevVersion: null, nextVersion: null }
    const idx = versionesDeLista.findIndex(v => v.id === version.id)
    return {
      prevVersion: idx > 0 ? versionesDeLista[idx - 1] : null,
      nextVersion: idx >= 0 && idx < versionesDeLista.length - 1 ? versionesDeLista[idx + 1] : null,
    }
  }, [version, versionesDeLista])

  if (!version) {
    return <div className="p-6 text-gray-500 text-sm">Cargando versión...</div>
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/listas-precios" className="hover:text-emerald-600">
          Versiones de Lista
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/listas-precios/${version.lista_precios_id}`} className="hover:text-emerald-600 text-gray-600">
          {version.lista_precios_nombre}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{version.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
        <BotonVolver onClick={() => router.push(`/listas-precios/${version.lista_precios_id}`)} />

        <div className="flex items-center gap-2">
          <Link
            href={`/listas-precios/${version.lista_precios_id}/versiones/${version.id}/editar`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" /> Editar
          </Link>
          <button
            onClick={() =>
              prevVersion &&
              router.push(`/listas-precios/${prevVersion.lista_precios_id}/versiones/${prevVersion.id}`)
            }
            disabled={!prevVersion}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={() =>
              nextVersion &&
              router.push(`/listas-precios/${nextVersion.lista_precios_id}/versiones/${nextVersion.id}`)
            }
            disabled={!nextVersion}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Banner Archivada */}
      {version.activa === false && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Esta versión está <strong>archivada</strong> y no aparece en los formularios. Reactivala marcando "Activa"
            abajo.
          </span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded p-6">
        <div className="grid grid-cols-4 gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
            <p className="text-gray-900 py-2">{version.lista_precios_nombre}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <p className="text-gray-900 py-2 font-medium">{version.nombre}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
            <p className="text-gray-900 py-2">{new Date(version.fecha_inicial).toLocaleDateString("es-AR")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
            <p className="text-gray-900 py-2">
              {version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "Sin fecha fin"}
            </p>
          </div>
        </div>

        {listaPrecios && (
          <div className="bg-gray-50 rounded p-3 mb-4 text-sm flex items-center gap-3 flex-wrap">
            <span>
              <span className="text-gray-600">Moneda: </span>
              <span className="font-medium">{listaPrecios.moneda_base}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className={`text-sm font-medium ${version.activa !== false ? "text-green-600" : "text-gray-400"}`}>
              {version.activa !== false ? "Activa" : "Archivada"}
            </span>
          </div>
        )}

        {/* Grilla de líneas (solo lectura) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Líneas de Precios ({version.lineas.length})
            </h4>
          </div>

          <div className="border border-gray-200 rounded overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[6%]" />
                <col className="w-[14%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-2 font-medium">Código</th>
                  <th className="text-left py-2 px-2 font-medium">Producto</th>
                  <th className="text-center py-2 px-2 font-medium">Mon. Costo</th>
                  <th className="text-right py-2 px-2 font-medium">Costo</th>
                  <th className="text-right py-2 px-2 font-medium">Markup %</th>
                  <th className="text-right py-2 px-2 font-medium">Markup $</th>
                  <th className="text-center py-2 px-2 font-medium">Forzar $</th>
                  <th className="text-right py-2 px-2 font-medium">Precio Venta</th>
                  <th className="text-center py-2 px-2 font-medium">IVA</th>
                </tr>
              </thead>
              <tbody>
                {version.lineas.map((linea, idx) => (
                  <tr
                    key={`${linea.id}-${idx}`}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="py-1.5 px-2 text-gray-600">{linea.producto_codigo}</td>
                    <td className="py-1.5 px-2 font-medium text-gray-900">{linea.producto_nombre}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`px-1 py-0.5 rounded text-xs ${
                          linea.costo_moneda === "USD" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {linea.costo_moneda}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <div>{formatCurrency(linea.costo_importe, linea.costo_moneda)}</div>
                      {linea.costo_moneda === "USD" && listaPrecios?.moneda_base === "ARS" && (() => {
                        const tipo = listaPrecios?.tipo_cotizacion ?? "blue"
                        const cotiz =
                          linea.cotizacion_dolar > 0
                            ? linea.cotizacion_dolar
                            : cotizacionesUsdPorTipo[tipo] ?? cotizacionUsdBlue
                        return cotiz > 0 ? (
                          <div className="text-[10px] text-gray-400 leading-tight">
                            ≈ {formatCurrency(linea.costo_importe * cotiz, "ARS")} ({tipo})
                          </div>
                        ) : null
                      })()}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {linea.forzar_precio_pesos ? <span className="text-gray-300">-</span> : `${linea.markup_porcentaje}%`}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {linea.forzar_precio_pesos ? (
                        <span className="text-gray-300">-</span>
                      ) : linea.markup_nominal > 0 ? (
                        formatCurrency(linea.markup_nominal, linea.costo_moneda)
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {linea.forzar_precio_pesos ? (
                        <CheckCircle className="w-3 h-3 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">
                      {linea.forzar_precio_pesos && linea.precio_forzado_ars ? (
                        <span className="text-amber-700">{formatPrecioForzadoARS(linea.precio_forzado_ars)}</span>
                      ) : (
                        <>
                          <div className="text-emerald-700">
                            {formatCurrency(linea.precio_venta, linea.precio_venta_moneda)}
                          </div>
                          {linea.precio_venta_moneda === "USD" && listaPrecios?.moneda_base === "ARS" && (() => {
                            const tipo = listaPrecios?.tipo_cotizacion ?? "blue"
                            const cotiz =
                              linea.cotizacion_dolar > 0
                                ? linea.cotizacion_dolar
                                : cotizacionesUsdPorTipo[tipo] ?? cotizacionUsdBlue
                            return cotiz > 0 ? (
                              <div className="text-[10px] text-gray-400 leading-tight font-normal">
                                ≈ {formatCurrency(linea.precio_venta * cotiz, "ARS")} ({tipo})
                              </div>
                            ) : null
                          })()}
                        </>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">{linea.iva}%</td>
                  </tr>
                ))}
                {version.lineas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No hay líneas en esta versión
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {version.seguimiento && <SeguimientoPanel seguimiento={version.seguimiento} />}
      </div>
    </div>
  )
}
