"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import RepuestosEditor, { type RepuestoLinea } from "@/components/servicio-tecnico/repuestos-editor"
import {
  createFallaEquipo,
  fetchCategorias,
  fetchEquipos,
  fetchFallas,
  type TallerCategoria,
  type TallerEquipo,
  type TallerFalla,
  type TallerFallaEquipo,
} from "@/lib/taller-actions"

type FormValues = Partial<TallerFallaEquipo> & { repuestos?: RepuestoLinea[] }

export default function FallaEquipoNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [equipos, setEquipos] = useState<TallerEquipo[]>([])
  const [fallas, setFallas] = useState<TallerFalla[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas_equipo")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    Promise.all([fetchEquipos(), fetchFallas(), fetchCategorias()])
      .then(([eq, fa, cat]) => {
        setEquipos(Array.isArray(eq) ? eq : [])
        setFallas(Array.isArray(fa) ? fa : [])
        setCategorias(Array.isArray(cat) ? cat : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  const FIELDS: FieldDef[] = [
    {
      kind: "selectFrom",
      key: "equipo_id",
      label: "Equipo",
      required: true,
      optionsFrom: equipos.filter(e => e.activo).map(e => ({
        value: e.id,
        label: [e.nombre, e.marca, e.modelo].filter(Boolean).join(" · "),
      })),
    },
    {
      kind: "selectFrom",
      key: "falla_id",
      label: "Falla",
      required: true,
      optionsFrom: fallas.filter(f => f.activo).map(f => ({ value: f.id, label: f.nombre })),
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
    {
      kind: "number",
      key: "complejidad_principal",
      label: "Complejidad Principal",
      min: 1,
      max: 10,
      helper: "1 (más simple) a 10 (más compleja)",
    },
    {
      kind: "number",
      key: "complejidad_secundaria",
      label: "Complejidad Secundaria",
      min: 1,
      max: 10,
    },
    {
      kind: "number",
      key: "tiempo_reparacion_principal",
      label: "Tiempo Principal (minutos)",
      min: 0,
    },
    {
      kind: "number",
      key: "tiempo_reparacion_secundaria",
      label: "Tiempo Secundaria (minutos)",
      min: 0,
    },
    {
      kind: "number",
      key: "puntaje_base",
      label: "Puntaje Base",
      min: 0,
      helper: "Puntaje que gana el técnico al reparar esta falla",
    },
  ]

  return (
    <TallerEntityForm<FormValues>
      title="Nueva Falla por Equipo"
      backHref="/servicio-tecnico/fallas-equipo"
      mode="create"
      fields={FIELDS}
      initialValues={{
        equipo_id: "",
        falla_id: "",
        categoria_id: undefined,
        complejidad_principal: 1,
        complejidad_secundaria: 1,
        tiempo_reparacion_principal: 0,
        tiempo_reparacion_secundaria: 0,
        puntaje_base: 50,
        repuestos: [],
      }}
      renderExtra={({ values, setField }) => (
        <RepuestosEditor
          value={values.repuestos ?? []}
          onChange={next => setField("repuestos", next)}
        />
      )}
      onSave={async values => { await createFallaEquipo(values) }}
    />
  )
}
