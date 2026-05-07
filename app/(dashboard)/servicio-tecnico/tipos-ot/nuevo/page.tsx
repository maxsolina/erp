"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import { createTipoOT, fetchAreas, type TallerArea, type TallerTipoOT } from "@/lib/taller-actions"

export default function TipoOTNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tipos_ot")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchAreas()
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingAreas(false))
  }, [])

  if (loadingAreas) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "codigo", label: "Código", required: true, placeholder: "Ej: REP-PANT" },
    { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Reparación de pantalla" },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.filter(a => a.activo).map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "select",
      key: "tipo_tecnico",
      label: "Tipo de Técnico",
      required: true,
      options: [
        { value: "propio", label: "Propio" },
        { value: "tercero", label: "Tercero" },
        { value: "ambos", label: "Ambos" },
      ],
    },
    { kind: "checkbox", key: "es_garantia_compra", label: "Garantía de compra" },
    { kind: "checkbox", key: "es_garantia_reparacion", label: "Garantía de reparación" },
    { kind: "checkbox", key: "activo", label: "Activo" },
  ]

  return (
    <TallerEntityForm<Partial<TallerTipoOT>>
      title="Nuevo Tipo de OT"
      backHref="/servicio-tecnico/tipos-ot"
      mode="create"
      fields={FIELDS}
      initialValues={{
        codigo: "",
        nombre: "",
        area_id: "",
        tipo_tecnico: "ambos",
        es_garantia_compra: false,
        es_garantia_reparacion: false,
        activo: true,
      }}
      onSave={async values => { await createTipoOT(values) }}
    />
  )
}
