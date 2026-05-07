"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteEquipo,
  fetchAreas,
  fetchEquipo,
  updateEquipo,
  type TallerArea,
  type TallerEquipo,
} from "@/lib/taller-actions"

export default function EquipoEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerEquipo | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "equipos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchEquipo(id), fetchAreas()])
      .then(([eq, ar]) => {
        setItem(eq)
        setAreas(Array.isArray(ar) ? ar : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    { kind: "text", key: "marca", label: "Marca" },
    { kind: "text", key: "modelo", label: "Modelo" },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    { kind: "number", key: "dias_garantia_compra", label: "Días de garantía de compra", min: 0 },
    { kind: "number", key: "dias_garantia_reparacion", label: "Días de garantía de reparación", min: 0 },
    { kind: "checkbox", key: "activo", label: "Activo" },
  ]

  return (
    <>
      <TallerEntityForm<TallerEquipo>
        title={`Editar Equipo: ${item.nombre}`}
        backHref="/servicio-tecnico/equipos"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateEquipo(item.id, values) }}
        onDelete={async () => { await deleteEquipo(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_equipo" documentoId={item.id} />
      </div>
    </>
  )
}
