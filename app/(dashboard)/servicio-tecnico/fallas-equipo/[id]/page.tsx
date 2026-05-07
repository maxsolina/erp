"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import RepuestosEditor, { type RepuestoLinea } from "@/components/servicio-tecnico/repuestos-editor"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteFallaEquipo,
  fetchCategorias,
  fetchEquipos,
  fetchFallaEquipo,
  fetchFallas,
  updateFallaEquipo,
  type TallerCategoria,
  type TallerEquipo,
  type TallerFalla,
  type TallerFallaEquipo,
} from "@/lib/taller-actions"

type FormValues = TallerFallaEquipo & { repuestos: RepuestoLinea[] }

export default function FallaEquipoEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<FormValues | null>(null)
  const [equipos, setEquipos] = useState<TallerEquipo[]>([])
  const [fallas, setFallas] = useState<TallerFalla[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas_equipo")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchFallaEquipo(id), fetchEquipos(), fetchFallas(), fetchCategorias()])
      .then(([fe, eq, fa, cat]) => {
        setItem({ ...fe, repuestos: fe.repuestos ?? [] })
        setEquipos(Array.isArray(eq) ? eq : [])
        setFallas(Array.isArray(fa) ? fa : [])
        setCategorias(Array.isArray(cat) ? cat : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrada"}</p>

  const equipoLabel = (e: TallerEquipo) => [e.nombre, e.marca, e.modelo].filter(Boolean).join(" · ")
  const titulo = `${equipoLabel(item.taller_equipos as unknown as TallerEquipo ?? { nombre: "—" } as TallerEquipo)} — ${item.taller_fallas?.nombre ?? "?"}`

  const FIELDS: FieldDef[] = [
    {
      kind: "selectFrom",
      key: "equipo_id",
      label: "Equipo",
      required: true,
      optionsFrom: equipos.map(e => ({ value: e.id, label: equipoLabel(e) })),
    },
    {
      kind: "selectFrom",
      key: "falla_id",
      label: "Falla",
      required: true,
      optionsFrom: fallas.map(f => ({ value: f.id, label: f.nombre })),
    },
    {
      kind: "selectFrom",
      key: "categoria_id",
      label: "Categoría (opcional)",
      optionsFrom: categorias.map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    { kind: "number", key: "complejidad_principal", label: "Complejidad Principal", min: 1, max: 10 },
    { kind: "number", key: "complejidad_secundaria", label: "Complejidad Secundaria", min: 1, max: 10 },
    { kind: "number", key: "tiempo_reparacion_principal", label: "Tiempo Principal (minutos)", min: 0 },
    { kind: "number", key: "tiempo_reparacion_secundaria", label: "Tiempo Secundaria (minutos)", min: 0 },
    { kind: "number", key: "puntaje_base", label: "Puntaje Base", min: 0 },
  ]

  return (
    <>
      <TallerEntityForm<FormValues>
        title={`Editar: ${titulo}`}
        backHref="/servicio-tecnico/fallas-equipo"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        renderExtra={({ values, setField }) => (
          <RepuestosEditor
            value={values.repuestos ?? []}
            onChange={next => setField("repuestos", next)}
          />
        )}
        onSave={async values => {
          await updateFallaEquipo(item.id, values as Partial<TallerFallaEquipo>)
        }}
        onDelete={async () => { await deleteFallaEquipo(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_falla_equipo" documentoId={item.id} />
      </div>
    </>
  )
}
