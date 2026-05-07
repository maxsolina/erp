"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerEntityForm, { type FieldDef } from "@/components/servicio-tecnico/entity-form"
import {
  createTecnico,
  fetchAreas,
  fetchCategorias,
  fetchTurnos,
  type TallerArea,
  type TallerCategoria,
  type TallerTecnico,
  type TallerTurno,
} from "@/lib/taller-actions"

export default function TecnicoNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [turnos, setTurnos] = useState<TallerTurno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tecnicos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    Promise.all([fetchAreas(), fetchCategorias(), fetchTurnos()])
      .then(([ar, cat, tu]) => {
        setAreas(Array.isArray(ar) ? ar : [])
        setCategorias(Array.isArray(cat) ? cat : [])
        setTurnos(Array.isArray(tu) ? tu : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 py-10 text-center">Cargando…</p>

  const FIELDS: FieldDef[] = [
    { kind: "text", key: "nombre", label: "Nombre", required: true },
    {
      kind: "select",
      key: "tipo",
      label: "Tipo",
      required: true,
      options: [
        { value: "propio", label: "Propio" },
        { value: "tercero", label: "Tercero" },
      ],
    },
    {
      kind: "selectFrom",
      key: "area_id",
      label: "Área",
      required: true,
      optionsFrom: areas.filter(a => a.activo).map(a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
    },
    {
      kind: "selectFrom",
      key: "categoria_principal_id",
      label: "Categoría Principal",
      optionsFrom: categorias.filter(c => c.activo).map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    {
      kind: "multiSelectFrom",
      key: "categorias_secundarias",
      label: "Categorías Secundarias",
      optionsFrom: categorias.filter(c => c.activo).map(c => ({
        value: c.id,
        label: `${c.nombre}${c.taller_areas_reparacion?.nombre ? ` (${c.taller_areas_reparacion.nombre})` : ""}`,
      })),
    },
    {
      kind: "number",
      key: "complejidad_tope",
      label: "Complejidad Tope",
      min: 1,
      max: 10,
      helper: "Máxima complejidad de OT que el técnico puede tomar (1–10)",
    },
    {
      kind: "selectFrom",
      key: "turno_id",
      label: "Turno",
      required: true,
      optionsFrom: turnos.filter(t => t.activo).map(t => ({
        value: t.id,
        label: `${t.nombre} (${t.hora_entrada}–${t.hora_salida})`,
      })),
    },
    { kind: "checkbox", key: "activo", label: "Activo" },
  ]

  return (
    <TallerEntityForm<Partial<TallerTecnico> & { categorias_secundarias?: string[] }>
      title="Nuevo Técnico"
      backHref="/servicio-tecnico/tecnicos"
      mode="create"
      fields={FIELDS}
      initialValues={{
        nombre: "",
        tipo: "propio",
        area_id: "",
        categoria_principal_id: undefined,
        categorias_secundarias: [],
        complejidad_tope: undefined,
        turno_id: "",
        activo: true,
      }}
      onSave={async values => {
        // El POST espera un array plano de IDs en categorias_secundarias
        await createTecnico(values as Partial<TallerTecnico>)
      }}
    />
  )
}
