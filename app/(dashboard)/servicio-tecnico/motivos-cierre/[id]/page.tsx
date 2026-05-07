"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteMotivoCierre,
  fetchMotivoCierre,
  updateMotivoCierre,
  type TallerMotivoCierre,
} from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "nombre", label: "Nombre", required: true },
  { kind: "checkbox", key: "activo", label: "Activo" },
]

export default function MotivoCierreEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerMotivoCierre | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "motivos_cierre")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    fetchMotivoCierre(id)
      .then(setItem)
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  return (
    <>
      <TallerEntityForm<TallerMotivoCierre>
        title={`Editar Motivo: ${item.nombre}`}
        backHref="/servicio-tecnico/motivos-cierre"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => {
          await updateMotivoCierre(item.id, values)
        }}
        onDelete={async () => {
          await deleteMotivoCierre(item.id)
        }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_motivo_cierre" documentoId={item.id} />
      </div>
    </>
  )
}
