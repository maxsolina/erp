"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteFeriado,
  fetchFeriado,
  updateFeriado,
  type TallerFeriado,
} from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "date", key: "fecha", label: "Fecha", required: true },
  { kind: "text", key: "descripcion", label: "Descripción" },
]

export default function FeriadoEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerFeriado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "feriados")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    fetchFeriado(id)
      .then(setItem)
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  return (
    <>
      <TallerEntityForm<TallerFeriado>
        title={`Editar Feriado: ${item.fecha}`}
        backHref="/servicio-tecnico/feriados"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateFeriado(item.id, values) }}
        onDelete={async () => { await deleteFeriado(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_feriado" documentoId={item.id} />
      </div>
    </>
  )
}
