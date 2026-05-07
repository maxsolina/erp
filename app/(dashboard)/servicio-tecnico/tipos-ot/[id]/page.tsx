"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteTipoOT,
  fetchAreas,
  fetchTipoOT,
  updateTipoOT,
  type TallerArea,
  type TallerTipoOT,
} from "@/lib/taller-actions"

export default function TipoOTEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerTipoOT | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tipos_ot")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchTipoOT(id), fetchAreas()])
      .then(([t, ar]) => {
        setItem(t)
        setAreas(Array.isArray(ar) ? ar : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "codigo", label: "Código", required: true },
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
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
    <>
      <TallerEntityForm<TallerTipoOT>
        title={`Editar Tipo: ${item.codigo} — ${item.nombre}`}
        backHref="/servicio-tecnico/tipos-ot"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateTipoOT(item.id, values) }}
        onDelete={async () => { await deleteTipoOT(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_tipo_ot" documentoId={item.id} />
      </div>
    </>
  )
}
