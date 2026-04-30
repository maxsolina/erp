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
  type TallerArea,
  type TallerCategoria,
  type TallerEquipo,
  type TallerFalla,
  type TallerTipoOT,
} from "@/lib/taller-actions"

interface Props {
  onCancelar: () => void
  onCreada: (id: string) => void
}

export default function OtFormulario({ onCancelar, onCreada }: Props) {
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [tiposOT, setTiposOT] = useState<TallerTipoOT[]>([])
  const [equipos, setEquipos] = useState<TallerEquipo[]>([])
  const [fallas, setFallas] = useState<TallerFalla[]>([])

  const [formOT, setFormOT] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let cancelado = false
    Promise.all([fetchAreas(), fetchCategorias(), fetchTiposOT(), fetchEquipos(), fetchFallas()])
      .then(([a, c, t, e, f]) => {
        if (cancelado) return
        setAreas(a)
        setCategorias(c)
        setTiposOT(t)
        setEquipos(e)
        setFallas(f)
      })
      .catch(console.error)
    return () => {
      cancelado = true
    }
  }, [])

  const setField = (key: string, value: unknown) => setFormOT(prev => ({ ...prev, [key]: value }))

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

  const handleCrear = async () => {
    if (guardando) return
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
        <div className="grid grid-cols-2 gap-6">
          {/* Col izquierda */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de Reparación *</label>
              <select
                value={areaId ?? ""}
                onChange={e => setFormOT({ area_id: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría de Reparación</label>
              <input
                value={categoriaNombre}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
              />
            </div>
          </div>

          {/* Col derecha */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <input
                placeholder="Buscar cliente..."
                value={(formOT.cliente_id as string) ?? ""}
                onChange={e => setField("cliente_id", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular de Contacto *</label>
              <input
                value={(formOT.celular_contacto as string) ?? ""}
                onChange={e => setField("celular_contacto", e.target.value)}
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

            <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
  )
}
