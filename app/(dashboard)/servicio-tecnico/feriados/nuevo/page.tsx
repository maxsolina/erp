"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createFeriado, type TallerFeriado } from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "date", key: "fecha", label: "Fecha", required: true },
  { kind: "text", key: "descripcion", label: "Descripción", placeholder: "Ej: Día del Trabajador" },
]

export default function FeriadoNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "feriados")) router.replace("/")
  }, [canSee, router])

  return (
    <TallerEntityForm<Partial<TallerFeriado>>
      title="Nuevo Feriado"
      backHref="/servicio-tecnico/feriados"
      mode="create"
      fields={FIELDS}
      initialValues={{ fecha: "", descripcion: "" }}
      onSave={async values => {
        await createFeriado(values)
      }}
    />
  )
}
