"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteTecnico,
  fetchAreas,
  fetchCategorias,
  fetchTecnico,
  fetchTurnos,
  updateTecnico,
  type TallerArea,
  type TallerCategoria,
  type TallerTecnico,
  type TallerTurno,
} from "@/lib/taller-actions"

// Para el form, `categorias_secundarias` se maneja como un array de IDs
// (string[]). La API GET devuelve [{categoria_id, nombre}], así que mapeamos
// al cargar; y al guardar, el body envía solo los IDs.
type FormValues = Omit<TallerTecnico, "categorias_secundarias"> & {
  categorias_secundarias: string[]
}

export default function TecnicoEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<FormValues | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [turnos, setTurnos] = useState<TallerTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tecnicos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchTecnico(id), fetchAreas(), fetchCategorias(), fetchTurnos()])
      .then(([t, ar, cat, tu]) => {
        // Aplastar categorias_secundarias a string[] de IDs
        const flat: FormValues = {
          ...t,
          categorias_secundarias: (t.categorias_secundarias ?? []).map(s => s.categoria_id),
        }
        setItem(flat)
        setAreas(Array.isArray(ar) ? ar : [])
        setCategorias(Array.isArray(cat) ? cat : [])
        setTurnos(Array.isArray(tu) ? tu : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "select",
      key: "tipo",
      label: "Tipo",
      required: true,
      options: [
        { value: "propio", label: "Propio" },
        { value: "tercero", label: "Tercero" },
      ],
    },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "selectFrom",
      key: "categoria_principal_id",
      label: "Categoría Principal",
      optionsFrom: categorias.map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    {
      kind: "multiSelectFrom",
      key: "categorias_secundarias",
      label: "Categorías Secundarias",
      optionsFrom: categorias.map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    { kind: "number", key: "complejidad_tope", label: "Complejidad Tope", min: 1, max: 10 },
    {
      kind: "selectFrom",
      key: "turno_id",
      label: "Turno",
      required: true,
      optionsFrom: turnos.map(t => ({
        value: t.id,
        label: `${t.nombre} (${t.hora_entrada}–${t.hora_salida})`,
      })),
    },
    { kind: "checkbox", key: "activo", label: "Activo" },
  ]

  return (
    <>
      <TallerEntityForm<FormValues>
        title={`Editar Técnico: ${item.nombre}`}
        backHref="/servicio-tecnico/tecnicos"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => {
          // El PATCH acepta `categorias_secundarias: string[]` y reemplaza
          await updateTecnico(item.id, values as unknown as Partial<TallerTecnico>)
        }}
        onDelete={async () => { await deleteTecnico(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_tecnico" documentoId={item.id} />
      </div>
    </>
  )
}
