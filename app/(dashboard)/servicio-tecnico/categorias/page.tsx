"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchCategorias, type TallerCategoria } from "@/lib/taller-actions"

export default function CategoriasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerCategoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "categorias_reparacion")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchCategorias()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerCategoria>
      title="Categorías de Reparación"
      rows={data}
      loading={loading}
      moduleName="taller_categorias"
      newHref="/servicio-tecnico/categorias/nueva"
      newLabel="Nueva Categoría"
      rowHrefBase="/servicio-tecnico/categorias"
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "area",
          label: "Área",
          render: r => r.taller_areas_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_areas_reparacion?.nombre ?? "",
        },
        { key: "orden_asignacion", label: "Orden", align: "center" },
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
      filterableFields={["area", "activo"]}
      groupByFields={["area", "activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay categorías"
    />
  )
}
