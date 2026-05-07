"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchControles, type TallerControl } from "@/lib/taller-actions"

export default function ControlesPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerControl[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "controles")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchControles()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerControl>
      title="Controles / Checklist"
      rows={data}
      loading={loading}
      moduleName="taller_controles"
      newHref="/servicio-tecnico/controles/nuevo"
      newLabel="Nuevo Control"
      rowHrefBase="/servicio-tecnico/controles"
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "area",
          label: "Área",
          render: r => r.taller_areas_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_areas_reparacion?.nombre ?? "",
        },
        {
          key: "categoria",
          label: "Categoría",
          render: r => r.taller_categorias_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_categorias_reparacion?.nombre ?? "",
        },
        {
          key: "disponible_recepcion",
          label: "Inicial",
          align: "center",
          render: r => (r.disponible_recepcion ? "✓" : "—"),
          filterValue: r => (r.disponible_recepcion ? "Sí" : "No"),
        },
        {
          key: "disponible_calidad",
          label: "Final",
          align: "center",
          render: r => (r.disponible_calidad ? "✓" : "—"),
          filterValue: r => (r.disponible_calidad ? "Sí" : "No"),
        },
        { key: "orden", label: "Orden", align: "center" },
        {
          key: "activo",
          label: "Estado",
          align: "center",
          render: r => (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                r.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
              }`}
            >
              {r.activo ? "Activo" : "Inactivo"}
            </span>
          ),
          filterValue: r => (r.activo ? "Sí" : "No"),
        },
      ]}
      filterableFields={["area", "categoria", "disponible_recepcion", "disponible_calidad", "activo"]}
      groupByFields={["area", "activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay controles cargados"
    />
  )
}
