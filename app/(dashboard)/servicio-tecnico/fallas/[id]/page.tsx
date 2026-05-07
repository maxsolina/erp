"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteFalla,
  fetchAreas,
  fetchCategorias,
  fetchFalla,
  updateFalla,
  type TallerArea,
  type TallerCategoria,
  type TallerFalla,
} from "@/lib/taller-actions"

export default function FallaEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerFalla | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchFalla(id), fetchAreas(), fetchCategorias()])
      .then(([f, ar, cat]) => {
        setItem(f)
        setAreas(Array.isArray(ar) ? ar : [])
        setCategorias(Array.isArray(cat) ? cat : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrada"}</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "selectFrom",
      key: "categoria_id",
      label: "Categoría",
      required: true,
      optionsFrom: categorias.map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    { kind: "checkbox", key: "activo", label: "Activa" },
  ]

  return (
    <>
      <TallerEntityForm<TallerFalla>
        title={`Editar Falla: ${item.nombre}`}
        backHref="/servicio-tecnico/fallas"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateFalla(item.id, values) }}
        onDelete={async () => { await deleteFalla(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_falla" documentoId={item.id} />
      </div>
    </>
  )
}
