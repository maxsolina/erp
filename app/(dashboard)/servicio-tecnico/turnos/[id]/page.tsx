"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteTurno,
  fetchTurno,
  updateTurno,
  type TallerTurno,
} from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "nombre", label: "Nombre", required: true },
  { kind: "time", key: "hora_entrada", label: "Hora de entrada", required: true },
  { kind: "time", key: "hora_salida", label: "Hora de salida", required: true },
  { kind: "checkbox", key: "trabaja_sabado", label: "Trabaja sábado" },
  { kind: "checkbox", key: "trabaja_domingo", label: "Trabaja domingo" },
  { kind: "checkbox", key: "activo", label: "Activo" },
]

export default function TurnoEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerTurno | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "turnos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    fetchTurno(id)
      .then(setItem)
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  return (
    <>
      <TallerEntityForm<TallerTurno>
        title={`Editar Turno: ${item.nombre}`}
        backHref="/servicio-tecnico/turnos"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateTurno(item.id, values) }}
        onDelete={async () => { await deleteTurno(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_turno" documentoId={item.id} />
      </div>
    </>
  )
}
