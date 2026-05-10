"use client"

// Formulario de Nueva OT.
// Extraído de components/modulo-taller.tsx → renderNuevaOT (~588-740).

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import {
  createOrden,
  fetchAreas,
  fetchCategorias,
  fetchEquipos,
  fetchFallas,
  fetchTiposOT,
  previewRepuestosSugeridos,
  type RepuestoSugeridoPreview,
  type TallerArea,
  type TallerCategoria,
  type TallerEquipo,
  type TallerFalla,
  type TallerTipoOT,
} from "@/lib/taller-actions"
import SearchableSelect from "@/components/ui/searchable-select"

interface Props {
  onCancelar: () => void
  onCreada: (id: string) => void
}

interface ClienteOpt {
  id: number | string
  codigo?: string
  nombre: string
  telefono?: string
  categoria?: string
}

export default function OtFormulario({ onCancelar, onCreada }: Props) {
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [tiposOT, setTiposOT] = useState<TallerTipoOT[]>([])
  const [equipos, setEquipos] = useState<TallerEquipo[]>([])
  const [fallas, setFallas] = useState<TallerFalla[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [listasPrecios, setListasPrecios] = useState<Array<{ id: number; nombre: string; visible_en_ot?: boolean; moneda_base?: string }>>([])

  const [formOT, setFormOT] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)
  // Modal de aviso de stock insuficiente: si tras pre-check hay productos
  // sin stock, mostramos la lista y el operador decide si crea igual.
  const [stockWarning, setStockWarning] = useState<RepuestoSugeridoPreview[] | null>(null)
  // Preview de repuestos sugeridos (live, según equipo+fallas+lista_precios)
  const [previewRepuestos, setPreviewRepuestos] = useState<RepuestoSugeridoPreview[]>([])
  const [previewTotal, setPreviewTotal] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      fetchAreas(),
      fetchCategorias(),
      fetchTiposOT(),
      fetchEquipos(),
      fetchFallas(),
      fetch("/api/clientes").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/listas-precios").then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([a, c, t, e, f, cli, lp]) => {
        if (cancelado) return
        setAreas(a)
        setCategorias(c)
        setTiposOT(t)
        setEquipos(e)
        setFallas(f)
        setClientes(Array.isArray(cli) ? cli : [])
        // Solo listas que tengan visible_en_ot tildado
        setListasPrecios((Array.isArray(lp) ? lp : []).filter(l => l.visible_en_ot))
      })
      .catch(console.error)
    return () => {
      cancelado = true
    }
  }, [])

  const setField = (key: string, value: unknown) => setFormOT(prev => ({ ...prev, [key]: value }))

  // Refresca el preview de repuestos sugeridos cuando cambia equipo, falla
  // principal, fallas secundarias o lista de precios. Sirve para que el
  // operador vea ANTES de confirmar qué repuestos y precios se van a cargar.
  useEffect(() => {
    const eq = formOT.equipo_id as string | undefined
    const fp = formOT.falla_principal_id as string | undefined
    if (!eq || !fp) {
      setPreviewRepuestos([])
      setPreviewTotal(0)
      return
    }
    let cancelado = false
    setPreviewLoading(true)
    previewRepuestosSugeridos({
      equipo_id: String(eq),
      falla_principal_id: String(fp),
      fallas_sec: (formOT.fallas_secundarias as string[]) ?? [],
      lista_precios_id: formOT.lista_precios_id ? Number(formOT.lista_precios_id) : null,
    })
      .then(p => {
        if (cancelado) return
        setPreviewRepuestos(p.repuestos)
        setPreviewTotal(p.total)
      })
      .catch(() => {
        if (cancelado) return
        setPreviewRepuestos([])
        setPreviewTotal(0)
      })
      .finally(() => {
        if (!cancelado) setPreviewLoading(false)
      })
    return () => { cancelado = true }
  }, [formOT.equipo_id, formOT.falla_principal_id, formOT.fallas_secundarias, formOT.lista_precios_id])

  const areaId = formOT.area_id as string | undefined
  const tipoOtId = formOT.tipo_ot_id as string | undefined
  const equipoId = formOT.equipo_id as string | undefined
  const fallaId = formOT.falla_principal_id as string | undefined

  const tipoOTSeleccionado = tiposOT.find(t => t.id === tipoOtId)
  const tiposFiltrados = tiposOT.filter(t => t.area_id === areaId && t.activo)
  const equiposFiltrados = equipos.filter(e => e.area_id === areaId && e.activo)
  const fallasFiltradas = fallas.filter(f => f.area_id === areaId && f.activo)
  const categoriaRep = fallas.find(f => f.id === fallaId)?.categoria_id
  const categoriaNombre = categorias.find(c => c.id === categoriaRep)?.nombre ?? ""
  const areaSeleccionada = areas.find(a => a.id === areaId)
  const mostrarIMEI = areaSeleccionada?.codigo === "CEL"
  const mostrarSerial = areaSeleccionada?.codigo === "LAP"

  const validarYCrear = async (forzarSinStock = false) => {
    if (guardando) return
    // Validación frontend: campos obligatorios que también son NOT NULL en DB.
    const faltantes: string[] = []
    if (!formOT.area_id) faltantes.push("Área de Reparación")
    if (!formOT.tipo_ot_id) faltantes.push("Tipo de OT")
    if (!formOT.equipo_id) faltantes.push("Equipo")
    if (!formOT.falla_principal_id) faltantes.push("Falla Principal")
    if (!formOT.cliente_id) faltantes.push("Cliente")
    if (!String(formOT.celular_contacto ?? "").trim()) faltantes.push("Celular de Contacto")
    if (faltantes.length) {
      alert(`Faltan campos obligatorios:\n· ${faltantes.join("\n· ")}`)
      return
    }

    // Pre-check de stock: si hay repuestos sugeridos sin stock, mostrar
    // modal de aviso. El operador puede crear igual (forzarSinStock=true).
    // Si ya cargamos el preview live (formOT.equipo + falla_principal_id),
    // reutilizamos ese resultado sin hacer otra request.
    if (!forzarSinStock) {
      const faltantesYa = previewRepuestos.filter(r => !r.stock_suficiente)
      if (faltantesYa.length > 0) {
        setStockWarning(faltantesYa)
        return
      }
    }

    setGuardando(true)
    try {
      const data = await createOrden({ ...formOT, usuario: "Admin" })
      setFormOT({})
      onCreada(data.id)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const handleCrear = () => validarYCrear(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancelar}
            className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
          </button>
          <h1 className="text-2xl font-bold text-amber-900">Nueva Orden de Trabajo</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={guardando}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
          >
            {guardando ? "Creando..." : "Crear Orden"}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Col izquierda */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de Reparación *</label>
              <select
                value={areaId ?? ""}
                onChange={e => {
                  const newArea = e.target.value
                  // Al cambiar área, los selects de tipo/equipo/falla quedan
                  // filtrados por la nueva área — limpiamos esos 3 para que
                  // el operador vuelva a elegirlos dentro del nuevo set, pero
                  // NO tocamos cliente, celular, IMEI, descripción, etc.
                  setFormOT(prev => ({
                    ...prev,
                    area_id: newArea,
                    tipo_ot_id: undefined,
                    equipo_id: undefined,
                    falla_principal_id: undefined,
                    categoria_reparacion_id: undefined,
                  }))
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {areas.filter(a => a.activo).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de OT *</label>
              <select
                value={tipoOtId ?? ""}
                onChange={e => setField("tipo_ot_id", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {tiposFiltrados.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {tipoOTSeleccionado?.es_garantia_compra && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Factura de Origen</label>
                <input
                  placeholder="Buscar factura X-XXXXXX"
                  value={(formOT.factura_origen_id as string) ?? ""}
                  onChange={e => setField("factura_origen_id", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            {tipoOTSeleccionado?.es_garantia_reparacion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OT de Origen</label>
                <input
                  placeholder="Buscar OT por número"
                  value={(formOT.ot_origen_id as string) ?? ""}
                  onChange={e => setField("ot_origen_id", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo *</label>
              <select
                value={equipoId ?? ""}
                onChange={e => setField("equipo_id", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {equiposFiltrados.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre} {eq.marca ? `(${eq.marca})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Falla Principal *</label>
              <select
                value={fallaId ?? ""}
                onChange={e => {
                  const fid = e.target.value
                  const cat = fallas.find(f => f.id === fid)?.categoria_id
                  setFormOT(prev => ({ ...prev, falla_principal_id: fid, categoria_reparacion_id: cat }))
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {fallasFiltradas.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fallas Secundarias <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <FallasSecundariasSelector
                fallasOpciones={fallasFiltradas.filter(f => f.id !== fallaId)}
                selected={(formOT.fallas_secundarias as string[]) ?? []}
                onChange={ids => setField("fallas_secundarias", ids)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Las fallas secundarias se usan para sugerir repuestos extra y calcular el tiempo teórico.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría de Reparación</label>
              <input
                value={categoriaNombre}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            {listasPrecios.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
                <select
                  value={(formOT.lista_precios_id as number | undefined) ?? ""}
                  onChange={e => setField("lista_precios_id", e.target.value ? Number(e.target.value) : null)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Sin lista (precio del producto) —</option>
                  {listasPrecios.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}{l.moneda_base && l.moneda_base !== "ARS" ? ` (${l.moneda_base})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define los precios de los repuestos que se cargarán automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* Col derecha */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <SearchableSelect
                value={(formOT.cliente_id as string | number | undefined) ?? ""}
                onChange={v => {
                  const id = v == null ? "" : String(v)
                  const cli = clientes.find(c => String(c.id) === id)
                  setFormOT(prev => ({
                    ...prev,
                    cliente_id: id,
                    cliente_nombre: cli?.nombre ?? null,
                    // Auto-completa el celular con el teléfono del cliente la
                    // primera vez que se elige (o si está vacío). Si el operador
                    // ya escribió un número distinto, no lo pisa.
                    celular_contacto:
                      (prev.celular_contacto as string)?.trim()
                        ? prev.celular_contacto
                        : cli?.telefono ?? "",
                    // Si el cliente tiene categoría (publico/corporativo), se pasa
                    // al backend para auditoría
                    categoria_cliente: cli?.categoria ?? null,
                  }))
                }}
                options={clientes.map(c => ({
                  value: String(c.id),
                  label: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre,
                  hint: c.telefono ? `Tel: ${c.telefono}` : undefined,
                  searchExtra: `${c.codigo ?? ""} ${c.telefono ?? ""}`,
                }))}
                placeholder="Buscar cliente por nombre, código o teléfono…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular de Contacto *</label>
              <input
                value={(formOT.celular_contacto as string) ?? ""}
                onChange={e => setField("celular_contacto", e.target.value)}
                placeholder="Se completa al elegir cliente"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {mostrarIMEI && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IMEI</label>
                <input
                  value={(formOT.imei as string) ?? ""}
                  onChange={e => setField("imei", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            {mostrarSerial && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  value={(formOT.serial_number as string) ?? ""}
                  onChange={e => setField("serial_number", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Desbloqueo</label>
              <input
                value={(formOT.codigo_desbloqueo as string) ?? ""}
                onChange={e => setField("codigo_desbloqueo", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: "ingresa_apagado", label: "Ingresa Apagado" },
                { key: "ingresa_mojado", label: "Ingresa Mojado" },
                { key: "deja_cargador", label: "Deja Cargador" },
                { key: "requerido_mkt", label: "Requerido por MKT" },
              ].map(cb => (
                <label key={cb.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!formOT[cb.key]}
                    onChange={e => setField(cb.key, e.target.checked)}
                    className="rounded"
                  />
                  {cb.label}
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto Estimado</label>
              <input
                type="number"
                value={(formOT.presupuesto_estimado as string) ?? ""}
                onChange={e => setField("presupuesto_estimado", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Observaciones</label>
              <textarea
                rows={3}
                value={(formOT.descripcion as string) ?? ""}
                onChange={e => setField("descripcion", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Preview de repuestos sugeridos — antes de confirmar la OT */}
        {(formOT.equipo_id && formOT.falla_principal_id) && (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-700">
                Repuestos sugeridos
                {previewLoading && <span className="ml-2 text-xs text-gray-400 italic">cargando…</span>}
              </h3>
              {previewRepuestos.length > 0 && (
                <span className="text-sm">
                  Total estimado: <strong className="text-gray-900">${previewTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                </span>
              )}
            </div>

            {!previewLoading && previewRepuestos.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-600">
                No hay repuestos sugeridos para esta combinación de equipo + falla(s). Si esperabas alguno, cargá la combinación en{" "}
                <strong>Configuración → Fallas por Equipos</strong> con sus repuestos. Igual podés crear la OT y agregar repuestos a mano después.
              </div>
            )}

            {previewRepuestos.length > 0 && (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase w-20">Cant.</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase w-20">Stock</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase w-32">Precio Unit.</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRepuestos.map(r => (
                      <tr key={r.producto_id} className={`border-b border-gray-100 ${!r.stock_suficiente ? "bg-red-50" : ""}`}>
                        <td className="py-2 px-2">
                          {r.producto_nombre}
                          {r.precio_origen === "ninguno" && (
                            <span className="ml-2 text-xs text-amber-700 italic">(sin precio definido)</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">{r.cantidad_sugerida}</td>
                        <td className="py-2 px-2 text-center">
                          {r.tipo !== "almacenable" ? (
                            <span className="text-gray-400 text-xs italic">({r.tipo})</span>
                          ) : (
                            <span className={!r.stock_suficiente ? "text-red-600 font-semibold" : "text-gray-700"}>
                              {r.stock_real}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          ${Number(r.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          <div className="text-[10px] text-gray-400 italic">
                            {r.precio_origen === "lista" ? "lista" : r.precio_origen === "costo_contable" ? "costo contable" : r.precio_origen === "costo_manual" ? "costo manual" : "—"}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          ${Number(r.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 italic mt-2">
                  Estos repuestos se van a auto-cargar en la OT al crearla. Después podés ajustarlos en la pestaña "Repuestos y Servicios".
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {stockWarning && (
        <ModalStockInsuficiente
          repuestos={stockWarning}
          onCancelar={() => setStockWarning(null)}
          onContinuar={() => {
            setStockWarning(null)
            validarYCrear(true)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: aviso de stock insuficiente ────────────────────────────────────
// Se muestra al crear una OT cuando los repuestos sugeridos por la combinación
// (equipo + falla) no tienen stock disponible. Permite continuar igual: la OT
// se crea, los repuestos quedan cargados pero el operador queda avisado.
function ModalStockInsuficiente({
  repuestos,
  onCancelar,
  onContinuar,
}: {
  repuestos: RepuestoSugeridoPreview[]
  onCancelar: () => void
  onContinuar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
            ⚠
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">Stock insuficiente</h3>
            <p className="text-xs text-gray-500">Los siguientes repuestos no tienen stock disponible</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-600 uppercase">Necesario</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-600 uppercase">Stock</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-600 uppercase">Falta</th>
              </tr>
            </thead>
            <tbody>
              {repuestos.map(r => (
                <tr key={r.producto_id} className="border-b border-gray-100">
                  <td className="py-2 pr-2">{r.producto_nombre}</td>
                  <td className="py-2 text-center">{r.cantidad_sugerida}</td>
                  <td className="py-2 text-center">
                    <span className={r.stock_real === 0 ? "text-red-600 font-semibold" : "text-amber-600"}>
                      {r.stock_real}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      {r.faltante}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-gray-500 mt-4 bg-blue-50 border border-blue-200 rounded p-2">
            Podés crear la OT igual — los repuestos quedan cargados con la cantidad sugerida.
            Cuando intentes facturar, vas a tener que reponer stock o ajustar las cantidades.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onContinuar}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Crear OT igual
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Multi-select de fallas secundarias (chips + dropdown) ─────────────────
function FallasSecundariasSelector({
  fallasOpciones,
  selected,
  onChange,
}: {
  fallasOpciones: TallerFalla[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <div className="border border-gray-300 rounded-lg p-2 bg-white">
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
        {selected.length === 0 && (
          <span className="text-xs text-gray-400 italic">Ninguna seleccionada</span>
        )}
        {selected.map(id => {
          const f = fallasOpciones.find(o => o.id === id)
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs"
            >
              {f?.nombre ?? id}
              <button
                type="button"
                onClick={() => onChange(selected.filter(x => x !== id))}
                className="hover:text-indigo-900 leading-none"
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
      <select
        value=""
        onChange={e => {
          if (e.target.value && !selected.includes(e.target.value)) {
            onChange([...selected, e.target.value])
          }
        }}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
      >
        <option value="">+ Agregar falla secundaria…</option>
        {fallasOpciones
          .filter(f => !selected.includes(f.id))
          .map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
      </select>
    </div>
  )
}
