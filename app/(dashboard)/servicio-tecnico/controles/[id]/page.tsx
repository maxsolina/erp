"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  deleteControl,
  fetchAreas,
  fetchCategorias,
  fetchControl,
  updateControl,
  type TallerArea,
  type TallerCategoria,
  type TallerControl,
} from "@/lib/taller-actions"

export default function ControlEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { canSee } = useERP()
  const [item, setItem] = useState<TallerControl | null>(null)
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "controles")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    if (!id) return
    Promise.all([fetchControl(id), fetchAreas(), fetchCategorias()])
      .then(([c, ar, cat]) => {
        setItem(c)
        setAreas(Array.isArray(ar) ? ar : [])
        setCategorias(Array.isArray(cat) ? cat : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>
  if (error || !item) return <p className="text-red-600 py-10 text-center">{error ?? "No encontrado"}</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "selectFrom",
      key: "categoria_id",
      label: "Categoría (opcional)",
      optionsFrom: categorias.map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    { kind: "number", key: "orden", label: "Orden de visualización", min: 0, helper: "Posición en el checklist (0 = primero)" },

    {
      kind: "section",
      key: "_sec_inicial",
      label: "Control Inicial — al ingresar la OT",
      description: "Checklist que se completa al crear la OT (estado Borrador → Sin Asignar). Sirve para registrar el estado del equipo antes de la reparación.",
    },
    {
      kind: "checkbox",
      key: "disponible_recepcion",
      label: "Aparece en el control inicial",
      helper: "Si está destildado, este ítem no se incluye al ingresar la OT",
    },
    {
      kind: "checkbox",
      key: "obs_recepcion_visible",
      label: "Mostrar campo de observaciones",
      helper: "Permite al operador escribir una nota junto al check",
    },
    {
      kind: "checkbox",
      key: "obs_recepcion_requerida",
      label: "Observaciones obligatorias",
      helper: "Si está tildado, no se puede marcar el check sin escribir algo",
    },

    {
      kind: "section",
      key: "_sec_final",
      label: "Control Final — antes de facturar",
      description: "Checklist que se completa cuando termina la reparación (estado Control de Calidad → Facturado). Sirve para verificar que todo quedó OK antes de entregar.",
    },
    {
      kind: "checkbox",
      key: "disponible_calidad",
      label: "Aparece en el control final",
      helper: "Si está destildado, este ítem no se incluye al cerrar la OT",
    },
    {
      kind: "checkbox",
      key: "obs_calidad_visible",
      label: "Mostrar campo de observaciones",
      helper: "Permite escribir una nota junto al check final",
    },
    {
      kind: "checkbox",
      key: "obs_calidad_requerida",
      label: "Observaciones obligatorias",
      helper: "Si está tildado, no se puede marcar el check sin escribir algo",
    },

    {
      kind: "section",
      key: "_sec_estado",
      label: "Estado",
    },
    {
      kind: "checkbox",
      key: "activo",
      label: "Activo",
      helper: "Si está destildado, este control queda pausado y no aparece en ningún checklist",
    },
  ]

  return (
    <>
      <TallerEntityForm<TallerControl>
        title={`Editar Control: ${item.nombre}`}
        backHref="/servicio-tecnico/controles"
        mode="edit"
        fields={FIELDS}
        initialValues={item}
        onSave={async values => { await updateControl(item.id, values) }}
        onDelete={async () => { await deleteControl(item.id) }}
      />
      <div className="mt-6">
        <SeguimientoPanel tipoDocumento="taller_control" documentoId={item.id} />
      </div>
    </>
  )
}
