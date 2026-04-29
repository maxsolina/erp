"use client"

// Extraído de components/ventas-module.tsx → renderDetalleVersion (~14165-14567),
// modo edición/creación. Replica 1:1 las funciones:
//   - crearNuevaVersion (líneas 13091-13116)
//   - guardarVersion (líneas 13157-13246)
//   - agregarLineaVersion (líneas 13272-13334)
//   - eliminarLineaVersion (líneas 13336-13352)
//   - actualizarLineaVersion (líneas 13354-13394)
//
// Endpoint: POST /api/listas-precios/versiones (crear) /
//           PUT /api/listas-precios/versiones/[id] (editar — reemplaza todas las líneas)
//
// Estado local: `currentVersion` (la que se está editando), `nuevaLineaVersion` (form para
// agregar una nueva línea), `errorLineaPendiente` (avisa si hay datos en la fila de nueva
// línea sin haber tocado "+"), `editandoLineas` (en el original separa "editar cabecera"
// vs "editar líneas"; acá siempre estamos en modo edición/creación, así que se mantiene true).

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, X, Plus, Trash2 } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import {
  formatCurrency,
  mapearProductos,
  normalizarLista,
  type LineaListaPrecios,
  type ListaPrecios,
  type ProductoMaestro,
  type VersionListaPrecios,
} from "./_shared"

interface VersionFormularioProps {
  listaId: number
  inicial: VersionListaPrecios | null  // null = crear, objeto = editar
  onGuardar?: (versionGuardada: VersionListaPrecios) => void
  onCancelar?: () => void
}

function buildVersionVacia(lista: ListaPrecios | null, conteoExistente: number): VersionListaPrecios {
  const nombreDefault = lista ? `V${conteoExistente + 1} - ${lista.nombre}` : ""
  return {
    id: 0,
    lista_precios_id: lista?.id ?? 0,
    lista_precios_nombre: lista?.nombre ?? "",
    nombre: nombreDefault,
    fecha_inicial: new Date().toISOString().split("T")[0],
    fecha_final: null,
    activa: false,
    estado: "borrador",
    ultima_actualizacion: new Date().toISOString(),
    lineas: [],
    seguimiento: [],
  }
}

export default function VersionFormulario({
  listaId,
  inicial,
  onGuardar,
  onCancelar,
}: VersionFormularioProps) {
  const router = useRouter()
  const { currentUser } = useERP()
  const creando = inicial === null

  // Datos de soporte
  const [listas, setListas] = useState<ListaPrecios[]>([])
  const [productosMaestro, setProductosMaestro] = useState<ProductoMaestro[]>([])

  const listaActual = useMemo(
    () => listas.find(l => l.id === listaId) ?? null,
    [listas, listaId],
  )

  // currentVersion arranca con `inicial` si está, o con un esqueleto vacío.
  // Cuando carga la lista padre y currentVersion todavía no tiene lista_precios_nombre, lo seteamos.
  const [currentVersion, setCurrentVersion] = useState<VersionListaPrecios>(
    inicial ?? buildVersionVacia(null, 0),
  )

  const [nuevaLineaVersion, setNuevaLineaVersion] = useState<Partial<LineaListaPrecios>>({})
  const [errorLineaPendiente, setErrorLineaPendiente] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar listas de precios y maestro de productos
  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setListas(data.map(normalizarLista))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/productos")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return
        setProductosMaestro(mapearProductos(data))
      })
      .catch(() => {})
  }, [])

  // Si estamos creando y la lista padre cargó, sincronizar nombre default y moneda
  useEffect(() => {
    if (!listaActual) return
    if (!creando) return
    // Solo si todavía no hay nombre/lista cargados
    setCurrentVersion(prev => {
      if (prev.lista_precios_id === listaActual.id && prev.lista_precios_nombre) return prev
      // Estimar conteo para nombre default — sin acceso al backend, dejamos V1
      return {
        ...prev,
        lista_precios_id: listaActual.id,
        lista_precios_nombre: listaActual.nombre,
        nombre: prev.nombre || `V1 - ${listaActual.nombre}`,
      }
    })
    setNuevaLineaVersion(prev => ({
      ...prev,
      costo_moneda: (prev.costo_moneda ?? listaActual.moneda_base) as "ARS" | "USD",
    }))
  }, [listaActual, creando])

  // Helpers de líneas — calcan agregarLineaVersion / actualizarLineaVersion / eliminarLineaVersion
  const agregarLineaVersion = () => {
    if (!nuevaLineaVersion.producto_id) return

    const costoImporte = nuevaLineaVersion.costo_importe || 0
    const markupPorcentaje = nuevaLineaVersion.markup_porcentaje || 0
    const markupNominal = nuevaLineaVersion.markup_nominal || 0
    const forzarPrecio = nuevaLineaVersion.forzar_precio_pesos || false
    const precioForzado = nuevaLineaVersion.precio_forzado_ars || null

    let precioVenta: number
    let precioVentaMoneda: "ARS" | "USD"
    if (forzarPrecio && precioForzado) {
      precioVenta = precioForzado
      precioVentaMoneda = "ARS"
    } else {
      const costoConMarkup = costoImporte * (1 + markupPorcentaje / 100) + markupNominal
      precioVenta = costoConMarkup
      precioVentaMoneda = nuevaLineaVersion.costo_moneda || "ARS"
    }

    const nuevaLinea: LineaListaPrecios = {
      id: Math.max(...currentVersion.lineas.map(l => l.id), 0) + 1,
      producto_id: nuevaLineaVersion.producto_id,
      producto_codigo: nuevaLineaVersion.producto_codigo || "",
      producto_nombre: nuevaLineaVersion.producto_nombre || "",
      costo_moneda: nuevaLineaVersion.costo_moneda || "ARS",
      costo_importe: costoImporte,
      cotizacion_dolar: 0,
      markup_porcentaje: markupPorcentaje,
      markup_nominal: markupNominal,
      forzar_precio_pesos: forzarPrecio,
      precio_forzado_ars: precioForzado,
      precio_venta: Math.round(precioVenta * 100) / 100,
      precio_venta_moneda: precioVentaMoneda,
      iva: (nuevaLineaVersion.iva ?? 21) as 0 | 10.5 | 21,
    }

    setCurrentVersion(prev => ({
      ...prev,
      lineas: [...prev.lineas, nuevaLinea],
      ultima_actualizacion: new Date().toISOString(),
    }))

    const monedaLista = (listaActual?.moneda_base ?? "ARS") as "ARS" | "USD"
    setNuevaLineaVersion({ costo_moneda: monedaLista })
    setErrorLineaPendiente(false)
  }

  const eliminarLineaVersion = (lineaId: number) => {
    setCurrentVersion(prev => ({
      ...prev,
      lineas: prev.lineas.filter(l => l.id !== lineaId),
      ultima_actualizacion: new Date().toISOString(),
    }))
  }

  const actualizarLineaVersion = (lineaId: number, campo: keyof LineaListaPrecios, valor: unknown) => {
    setCurrentVersion(prev => ({
      ...prev,
      lineas: prev.lineas.map(l => {
        if (l.id !== lineaId) return l
        let lineaActualizada: LineaListaPrecios = { ...l, [campo]: valor as never }

        if (campo === "forzar_precio_pesos" && valor === true) {
          lineaActualizada = { ...lineaActualizada, markup_porcentaje: 0, markup_nominal: 0 }
        }

        if (
          ["costo_importe", "markup_porcentaje", "markup_nominal", "forzar_precio_pesos", "precio_forzado_ars"].includes(
            campo as string,
          )
        ) {
          if (lineaActualizada.forzar_precio_pesos && lineaActualizada.precio_forzado_ars) {
            lineaActualizada.precio_venta = lineaActualizada.precio_forzado_ars
            lineaActualizada.precio_venta_moneda = "ARS"
          } else {
            const costoConMarkup =
              lineaActualizada.costo_importe * (1 + lineaActualizada.markup_porcentaje / 100) +
              lineaActualizada.markup_nominal
            lineaActualizada.precio_venta = Math.round(costoConMarkup * 100) / 100
            lineaActualizada.precio_venta_moneda = lineaActualizada.costo_moneda
          }
        }

        return lineaActualizada
      }),
      ultima_actualizacion: new Date().toISOString(),
    }))
  }

  // Guardar — calca guardarVersion
  const handleGuardar = async () => {
    // Validar línea pendiente
    if (nuevaLineaVersion.producto_id) {
      setErrorLineaPendiente(true)
      return
    }
    setErrorLineaPendiente(false)

    if (!currentVersion.nombre.trim()) return
    setGuardando(true)
    setError(null)

    const fechaActual = new Date().toISOString()
    const usuario = (currentUser as any)?.nombre || "Sistema"

    try {
      if (creando) {
        const payload: VersionListaPrecios = {
          ...currentVersion,
          id: 0,
          ultima_actualizacion: fechaActual,
          seguimiento: [
            {
              id: 1,
              fecha: fechaActual,
              usuario,
              tipo: "creacion",
              descripcion: "Versión creada",
            },
          ],
        }
        const res = await fetch("/api/listas-precios/versiones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errBody = await res.text()
          console.error("[guardarVersion POST] ERROR:", res.status, errBody)
          setError(errBody)
          alert("Error al guardar la versión: " + errBody)
          return
        }
        const nuevaVersion: VersionListaPrecios = await res.json()
        onGuardar?.(nuevaVersion)
      } else {
        const seguimientoActualizado = [
          {
            id: (currentVersion.seguimiento?.length || 0) + 1,
            fecha: fechaActual,
            usuario,
            tipo: "cambio_campo" as const,
            campo: "Datos",
            valor_nuevo: "Versión actualizada",
          },
          ...(currentVersion.seguimiento || []),
        ]
        const versionActualizada: VersionListaPrecios = {
          ...currentVersion,
          ultima_actualizacion: fechaActual,
          seguimiento: seguimientoActualizado,
        }
        const res = await fetch(`/api/listas-precios/versiones/${currentVersion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(versionActualizada),
        })
        if (!res.ok) {
          const errBody = await res.text()
          console.error("[guardarVersion PUT] ERROR:", res.status, errBody)
          setError(errBody)
          // Mantener el original: aún si la API falló, devolvemos lo que el usuario editó
          onGuardar?.(versionActualizada)
          return
        }
        const saved: VersionListaPrecios = await res.json()
        onGuardar?.(saved)
      }
    } catch (e) {
      console.error("[guardarVersion] error:", e)
      setError(String(e))
    } finally {
      setGuardando(false)
    }
  }

  // Modo edición/creación → siempre se muestran inputs editables
  const editandoLineas = true

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGuardar}
            disabled={!currentVersion.nombre.trim() || guardando}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={onCancelar}
            className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          {errorLineaPendiente && (
            <span className="text-sm text-red-600 font-medium flex items-center gap-1">
              ⚠ Hay una línea sin agregar — presioná{" "}
              <span className="font-bold text-red-700">+</span> para agregarla
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-6">
        {/* Cabecera */}
        <div className="grid grid-cols-4 gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
            {creando ? (
              <select
                value={currentVersion.lista_precios_id}
                onChange={e => {
                  const lista = listas.find(l => l.id === Number(e.target.value))
                  if (lista) {
                    setCurrentVersion({
                      ...currentVersion,
                      lista_precios_id: lista.id,
                      lista_precios_nombre: lista.nombre,
                    })
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
              >
                {listas.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900 py-2">{currentVersion.lista_precios_nombre}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={currentVersion.nombre}
              onChange={e => setCurrentVersion({ ...currentVersion, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
              placeholder="Nombre de la versión"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
            <input
              type="date"
              value={currentVersion.fecha_inicial}
              onChange={e => setCurrentVersion({ ...currentVersion, fecha_inicial: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
            <input
              type="date"
              value={currentVersion.fecha_final || ""}
              onChange={e =>
                setCurrentVersion({ ...currentVersion, fecha_final: e.target.value || null })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Info de la Lista Padre + Activa */}
        {listaActual && (
          <div className="bg-gray-50 rounded p-3 mb-4 text-sm flex items-center gap-3 flex-wrap">
            <span>
              <span className="text-gray-600">Moneda: </span>
              <span className="font-medium">{listaActual.moneda_base}</span>
            </span>
            <span className="text-gray-300">|</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentVersion.activa}
                onChange={e => setCurrentVersion({ ...currentVersion, activa: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Activa</span>
            </label>
          </div>
        )}

        {/* Grilla de Líneas */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Líneas de Precios ({currentVersion.lineas.length})
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
                <col className="w-[2%]" />
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
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {/* Fila para agregar nueva línea */}
                <tr className="border-b border-gray-200 bg-emerald-50/50">
                  <td className="py-1.5 px-2 text-gray-500 text-xs truncate">
                    {nuevaLineaVersion.producto_codigo || <span className="text-gray-300">-</span>}
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={nuevaLineaVersion.producto_id || ""}
                      onChange={e => {
                        const prod = productosMaestro.find(p => p.id === Number(e.target.value))
                        if (prod) {
                          const monedaDefault = (listaActual?.moneda_base ?? prod.moneda_costo ?? "ARS") as
                            | "ARS"
                            | "USD"
                          setNuevaLineaVersion({
                            ...nuevaLineaVersion,
                            producto_id: prod.id,
                            producto_codigo: prod.sku,
                            producto_nombre: prod.nombre,
                            costo_importe: prod.costo_manual ?? prod.costo ?? 0,
                            costo_moneda: monedaDefault,
                          })
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Seleccionar producto...</option>
                      {productosMaestro.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.sku} - {prod.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={nuevaLineaVersion.costo_moneda || listaActual?.moneda_base || "ARS"}
                      onChange={e =>
                        setNuevaLineaVersion({
                          ...nuevaLineaVersion,
                          costo_moneda: e.target.value as "ARS" | "USD",
                        })
                      }
                      className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      value={nuevaLineaVersion.costo_importe || ""}
                      onChange={e =>
                        setNuevaLineaVersion({ ...nuevaLineaVersion, costo_importe: Number(e.target.value) })
                      }
                      className="w-20 px-1 py-1 border border-gray-300 rounded text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      value={nuevaLineaVersion.markup_porcentaje || ""}
                      onChange={e =>
                        setNuevaLineaVersion({
                          ...nuevaLineaVersion,
                          markup_porcentaje: Number(e.target.value),
                        })
                      }
                      disabled={!!nuevaLineaVersion.forzar_precio_pesos}
                      className={`w-16 px-1 py-1 border rounded text-xs text-right ${
                        nuevaLineaVersion.forzar_precio_pesos
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "border-gray-300"
                      }`}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      value={nuevaLineaVersion.markup_nominal || ""}
                      onChange={e =>
                        setNuevaLineaVersion({ ...nuevaLineaVersion, markup_nominal: Number(e.target.value) })
                      }
                      disabled={!!nuevaLineaVersion.forzar_precio_pesos}
                      className={`w-16 px-1 py-1 border rounded text-xs text-right ${
                        nuevaLineaVersion.forzar_precio_pesos
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "border-gray-300"
                      }`}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={nuevaLineaVersion.forzar_precio_pesos || false}
                      onChange={e =>
                        setNuevaLineaVersion({
                          ...nuevaLineaVersion,
                          forzar_precio_pesos: e.target.checked,
                          markup_porcentaje: e.target.checked ? 0 : nuevaLineaVersion.markup_porcentaje,
                          markup_nominal: e.target.checked ? 0 : nuevaLineaVersion.markup_nominal,
                        })
                      }
                      className="w-3 h-3 text-emerald-600 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    {nuevaLineaVersion.forzar_precio_pesos ? (
                      <input
                        type="number"
                        value={nuevaLineaVersion.precio_forzado_ars || ""}
                        onChange={e =>
                          setNuevaLineaVersion({
                            ...nuevaLineaVersion,
                            precio_forzado_ars: Number(e.target.value),
                          })
                        }
                        className="w-28 px-1 py-1 border border-amber-400 bg-amber-50 rounded text-xs text-right text-amber-800 placeholder-amber-400 focus:ring-1 focus:ring-amber-400"
                        placeholder="Precio ARS"
                      />
                    ) : (
                      (() => {
                        const costo = nuevaLineaVersion.costo_importe || 0
                        const mkPct = nuevaLineaVersion.markup_porcentaje || 0
                        const mkNom = nuevaLineaVersion.markup_nominal || 0
                        const pvCalc = costo * (1 + mkPct / 100) + mkNom
                        return pvCalc > 0 ? (
                          <span className="text-emerald-700 text-xs font-medium">
                            {formatCurrency(
                              Math.round(pvCalc * 100) / 100,
                              (nuevaLineaVersion.costo_moneda || "ARS") as "ARS" | "USD",
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Auto</span>
                        )
                      })()
                    )}
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={nuevaLineaVersion.iva ?? 21}
                      onChange={e =>
                        setNuevaLineaVersion({
                          ...nuevaLineaVersion,
                          iva: Number(e.target.value) as 0 | 10.5 | 21,
                        })
                      }
                      className="w-14 px-1 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value={21}>21%</option>
                      <option value={10.5}>10.5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <button
                      onClick={agregarLineaVersion}
                      disabled={!nuevaLineaVersion.producto_id}
                      className="p-1 text-emerald-600 hover:bg-emerald-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>

                {/* Líneas existentes */}
                {currentVersion.lineas.map((linea, idx) => (
                  <tr
                    key={`${linea.id}-${idx}`}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="py-1.5 px-2 text-gray-600">{linea.producto_codigo}</td>
                    <td className="py-1.5 px-2 font-medium text-gray-900">{linea.producto_nombre}</td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={linea.costo_moneda}
                        onChange={e => actualizarLineaVersion(linea.id, "costo_moneda", e.target.value)}
                        className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={linea.costo_importe}
                        onChange={e =>
                          actualizarLineaVersion(linea.id, "costo_importe", Number(e.target.value))
                        }
                        className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs text-right"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={linea.markup_porcentaje}
                        onChange={e =>
                          actualizarLineaVersion(linea.id, "markup_porcentaje", Number(e.target.value))
                        }
                        disabled={linea.forzar_precio_pesos}
                        className={`w-14 px-1 py-0.5 border rounded text-xs text-right ${
                          linea.forzar_precio_pesos
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={linea.markup_nominal}
                        onChange={e =>
                          actualizarLineaVersion(linea.id, "markup_nominal", Number(e.target.value))
                        }
                        disabled={linea.forzar_precio_pesos}
                        className={`w-14 px-1 py-0.5 border rounded text-xs text-right ${
                          linea.forzar_precio_pesos
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={linea.forzar_precio_pesos}
                        onChange={e =>
                          actualizarLineaVersion(linea.id, "forzar_precio_pesos", e.target.checked)
                        }
                        className="w-3 h-3 text-emerald-600 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">
                      {linea.forzar_precio_pesos ? (
                        <input
                          type="number"
                          value={linea.precio_forzado_ars ?? ""}
                          onChange={e =>
                            actualizarLineaVersion(
                              linea.id,
                              "precio_forzado_ars",
                              e.target.value === "" ? null : Number(e.target.value),
                            )
                          }
                          placeholder="Precio ARS"
                          className="w-28 px-1 py-0.5 border border-amber-400 bg-amber-50 rounded text-xs text-right text-amber-800 focus:ring-1 focus:ring-amber-400"
                        />
                      ) : (
                        <span className="text-emerald-700">
                          {formatCurrency(linea.precio_venta, linea.precio_venta_moneda)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={linea.iva}
                        onChange={e => actualizarLineaVersion(linea.id, "iva", Number(e.target.value))}
                        className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs"
                      >
                        <option value={21}>21%</option>
                        <option value={10.5}>10.5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        onClick={() => eliminarLineaVersion(linea.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
