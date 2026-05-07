"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteArea,
  fetchArea,
  updateArea,
  type TallerArea,
} from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "codigo", label: "Código", required: true },
  { kind: "text", key: "nombre", label: "Nombre", required: true },
  { kind: "textarea", key: "descripcion", label: "Descripción" },
  { kind: "number", key: "orden", label: "Orden", min: 0 },
  {
    kind: "checkbox",
    key: "control_inicial_obligatorio",
    label: "Control inicial obligatorio",
    helper: "Si está tildado, la OT no puede pasar de Borrador a Sin Asignar sin completar el checklist de recepción.",
  },
  { kind: "checkbox", key: "activo", label: "Activa" },
]

export default function AreaEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerArea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "areas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    fetchArea(id)
      .then(setItem)
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  return (
    <>
      <TallerEntityForm<TallerArea>
        title={`Editar Área: ${item.nombre}`}
        backHref="/servicio-tecnico/areas"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateArea(item.id, values) }}
        onDelete={async () => { await deleteArea(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_area" documentoId={item.id} />
      </div>
    </>
  )
}
