"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import {
  createFalla,
  fetchAreas,
  fetchCategorias,
  type TallerArea,
  type TallerCategoria,
  type TallerFalla,
} from "@/lib/taller-actions"

export default function FallaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    Promise.all([fetchAreas(), fetchCategorias()])
      .then(([ar, cat]) => {
        setAreas(Array.isArray(ar) ? ar : [])
        setCategorias(Array.isArray(cat) ? cat : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  // La categoría incluye el área entre paréntesis para que el usuario sepa
  // a qué área pertenece (ya que mostramos todas, no filtradas).
  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Pantalla rota" },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.filter(a => a.activo).map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "selectFrom",
      key: "categoria_id",
      label: "Categoría",
      required: true,
      optionsFrom: categorias
        .filter(c => c.activo)
        .map(c => ({
          value: c.id,
          label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
        })),
    },
    { kind: "checkbox", key: "activo", label: "Activa" },
  ]

  return (
    <TallerEntityForm<Partial<TallerFalla>>
      title="Nueva Falla"
      backHref="/servicio-tecnico/fallas"
      mode="create"
      fields={FIELDS}
      initialValues={{ nombre: "", area_id: "", categoria_id: "", activo: true }}
      onSave={async values => { await createFalla(values) }}
    />
  )
}
