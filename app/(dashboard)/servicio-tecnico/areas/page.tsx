"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchAreas, type TallerArea } from "@/lib/taller-actions"

export default function AreasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "areas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchAreas()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerArea>
      title="Áreas de Reparación"
      rows={data}
      loading={loading}
      moduleName="taller_areas"
      newHref="/servicio-tecnico/areas/nueva"
      newLabel="Nueva Área"
      rowHrefBase="/servicio-tecnico/areas"
      columns={[
        {
          key: "codigo",
          label: "Código",
          render: r => <span className="font-mono text-gray-700">{r.codigo}</span>,
        },
        { key: "nombre", label: "Nombre" },
        { key: "descripcion", label: "Descripción" },
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
              {r.activo ? "Activa" : "Inactiva"}
            </span>
          ),
          filterValue: r => (r.activo ? "Sí" : "No"),
        },
      ]}
      filterableFields={["activo"]}
      groupByFields={["activo"]}
      searchFields={["codigo", "nombre", "descripcion"]}
      emptyMessage="No hay áreas de reparación"
    />
  )
}
