"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createArea, type TallerArea } from "@/lib/taller-actions"

const FIELDS: FieldDef[] = [
  { kind: "text", key: "codigo", label: "Código", required: true, placeholder: "Ej: REP-CEL", helper: "Identificador corto único" },
  { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Reparación Celulares" },
  { kind: "textarea", key: "descripcion", label: "Descripción" },
  { kind: "number", key: "orden", label: "Orden de visualización", min: 0, helper: "Define la posición en listas (0 = primero)" },
  {
    kind: "checkbox",
    key: "control_inicial_obligatorio",
    label: "Control inicial obligatorio",
    helper: "Si está tildado, la OT no puede pasar de Borrador a Sin Asignar sin completar el checklist de recepción. Si está destildado, el operador puede saltearlo (útil para reparaciones simples).",
  },
  { kind: "checkbox", key: "activo", label: "Activa" },
]

export default function AreaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "areas")) router.replace("/")
  }, [canSee, router])

  return (
    <TallerEntityForm<Partial<TallerArea>>
      title="Nueva Área de Reparación"
      backHref="/servicio-tecnico/areas"
      mode="create"
      fields={FIELDS}
      initialValues={{
        codigo: "",
        nombre: "",
        descripcion: "",
        orden: 0,
        control_inicial_obligatorio: false,
        activo: true,
      }}
      onSave={async values => { await createArea(values) }}
    />
  )
}
