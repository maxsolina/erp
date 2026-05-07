"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchFallas, type TallerFalla } from "@/lib/taller-actions"

export default function FallasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFalla[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFallas()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerFalla>
      title="Fallas"
      rows={data}
      loading={loading}
      moduleName="taller_fallas"
      newHref="/servicio-tecnico/fallas/nueva"
      newLabel="Nueva Falla"
      rowHrefBase="/servicio-tecnico/fallas"
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
          key: "activo",
          label: "Estado",
          align: "center",
          render: r => (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                r.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
              }`}
            >
              {r.activo ? "Activa" : "Inactiva"}
            </span>
          ),
          filterValue: r => (r.activo ? "Sí" : "No"),
        },
      ]}
      filterableFields={["area", "categoria", "activo"]}
      groupByFields={["area", "categoria", "activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay fallas cargadas"
    />
  )
}
