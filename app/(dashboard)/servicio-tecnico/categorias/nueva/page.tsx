"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createCategoria, fetchAreas, type TallerArea, type TallerCategoria } from "@/lib/taller-actions"

export default function CategoriaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "categorias_reparacion")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchAreas()
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingAreas(false))
  }, [])

  if (loadingAreas) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.filter(a => a.activo).map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "number",
      key: "orden_asignacion",
      label: "Orden de asignación",
      min: 0,
      helper: "Define la prioridad para asignación automática (menor número = más prioritario)",
    },
    { kind: "checkbox", key: "activo", label: "Activa" },
  ]

  return (
    <TallerEntityForm<Partial<TallerCategoria>>
      title="Nueva Categoría"
      backHref="/servicio-tecnico/categorias"
      mode="create"
      fields={FIELDS}
      initialValues={{
        nombre: "",
        area_id: "",
        orden_asignacion: 0,
        activo: true,
      }}
      onSave={async values => { await createCategoria(values) }}
    />
  )
}
