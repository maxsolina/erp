"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createMotivoCierre, type TallerMotivoCierre } from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Reparado · Sin garantía" },
  { kind: "checkbox", key: "activo", label: "Activo" },
]

export default function MotivoCierreNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "motivos_cierre")) router.replace("/")
  }, [canSee, router])

  return (
    <TallerEntityForm<Partial<TallerMotivoCierre>>
      title="Nuevo Motivo de Cierre"
      backHref="/servicio-tecnico/motivos-cierre"
      mode="create"
      fields={FIELDS}
      initialValues={{ nombre: "", activo: true }}
      onSave={async values => {
        await createMotivoCierre(values)
      }}
    />
  )
}
