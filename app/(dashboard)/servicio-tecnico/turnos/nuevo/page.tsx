"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createTurno, type TallerTurno } from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Mañana" },
  { kind: "time", key: "hora_entrada", label: "Hora de entrada", required: true },
  { kind: "time", key: "hora_salida", label: "Hora de salida", required: true },
  { kind: "checkbox", key: "trabaja_sabado", label: "Trabaja sábado" },
  { kind: "checkbox", key: "trabaja_domingo", label: "Trabaja domingo" },
  { kind: "checkbox", key: "activo", label: "Activo" },
]

export default function TurnoNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "turnos")) router.replace("/")
  }, [canSee, router])

  return (
    <TallerEntityForm<Partial<TallerTurno>>
      title="Nuevo Turno"
      backHref="/servicio-tecnico/turnos"
      mode="create"
      fields={FIELDS}
      initialValues={{
        nombre: "",
        hora_entrada: "09:00",
        hora_salida: "18:00",
        trabaja_sabado: false,
        trabaja_domingo: false,
        activo: true,
      }}
      onSave={async values => { await createTurno(values) }}
    />
  )
}
