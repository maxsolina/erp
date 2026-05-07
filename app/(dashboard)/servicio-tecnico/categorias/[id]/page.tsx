"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteCategoria,
  fetchAreas,
  fetchCategoria,
  updateCategoria,
  type TallerArea,
  type TallerCategoria,
} from "@/lib/taller-actions"

export default function CategoriaEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerCategoria | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "categorias_reparacion")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchCategoria(id), fetchAreas()])
      .then(([cat, ar]) => {
        setItem(cat)
        setAreas(Array.isArray(ar) ? ar : [])
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
    { kind: "number", key: "orden_asignacion", label: "Orden de asignación", min: 0 },
    { kind: "checkbox", key: "activo", label: "Activa" },
  ]

  return (
    <>
      <TallerEntityForm<TallerCategoria>
        title={`Editar Categoría: ${item.nombre}`}
        backHref="/servicio-tecnico/categorias"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateCategoria(item.id, values) }}
        onDelete={async () => { await deleteCategoria(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_categoria" documentoId={item.id} />
      </div>
    </>
  )
}
