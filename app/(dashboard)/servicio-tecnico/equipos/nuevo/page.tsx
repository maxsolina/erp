"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createEquipo, fetchAreas, type TallerArea, type TallerEquipo } from "@/lib/taller-actions"

export default function EquipoNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "equipos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchAreas()
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingAreas(false))
  }, [])

  if (loadingAreas) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: iPhone 13" },
    { kind: "text", key: "marca", label: "Marca", placeholder: "Ej: Apple" },
    { kind: "text", key: "modelo", label: "Modelo", placeholder: "Ej: A2633" },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.filter(a => a.activo).map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    { kind: "number", key: "dias_garantia_compra", label: "Días de garantía de compra", min: 0 },
    { kind: "number", key: "dias_garantia_reparacion", label: "Días de garantía de reparación", min: 0 },
    { kind: "checkbox", key: "activo", label: "Activo" },
  ]

  return (
    <TallerEntityForm<Partial<TallerEquipo>>
      title="Nuevo Equipo"
      backHref="/servicio-tecnico/equipos"
      mode="create"
      fields={FIELDS}
      initialValues={{
        nombre: "",
        marca: "",
        modelo: "",
        area_id: "",
        dias_garantia_compra: 0,
        dias_garantia_reparacion: 30,
        activo: true,
      }}
      onSave={async values => { await createEquipo(values) }}
    />
  )
}
