"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import {
  createControl,
  fetchAreas,
  fetchCategorias,
  type TallerArea,
  type TallerCategoria,
  type TallerControl,
} from "@/lib/taller-actions"

export default function ControlNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "controles")) router.replace("/")
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

  const FIELDS: FieldDef[] = [
    // ─── Datos básicos ───────────────────────────────────────
    { kind: "text", key: "nombre", label: "Nombre", required: true, placeholder: "Ej: Chequear pantalla" },
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
      label: "Categoría (opcional)",
      optionsFrom: categorias.filter(c => c.activo).map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    { kind: "number", key: "orden", label: "Orden de visualización", min: 0, helper: "Posición en el checklist (0 = primero)" },

    // ─── Inicial ────────────────────────────────────────────
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
      helper: "Permite al operador escribir una nota junto al check (ej: 'raya en la esquina')",
    },
    {
      kind: "checkbox",
      key: "obs_recepcion_requerida",
      label: "Observaciones obligatorias",
      helper: "Si está tildado, no se puede marcar el check sin escribir algo",
    },

    // ─── Final ──────────────────────────────────────────────
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

    // ─── Estado ─────────────────────────────────────────────
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
    <TallerEntityForm<Partial<TallerControl>>
      title="Nuevo Control"
      backHref="/servicio-tecnico/controles"
      mode="create"
      fields={FIELDS}
      initialValues={{
        nombre: "",
        area_id: "",
        categoria_id: undefined,
        // Por defecto el control aparece en ambos checklists (recepción +
        // calidad). Si el operador quiere uno solo, destilda lo que no
        // corresponda. Esto evita el caso típico de crear un control y que
        // no aparezca en ningún lado por olvidar tildar las flags.
        disponible_recepcion: true,
        obs_recepcion_visible: true,
        obs_recepcion_requerida: false,
        disponible_calidad: true,
        obs_calidad_visible: true,
        obs_calidad_requerida: false,
        orden: 0,
        activo: true,
      }}
      onSave={async values => { await createControl(values) }}
    />
  )
}
