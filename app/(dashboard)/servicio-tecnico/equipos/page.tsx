"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchEquipos, type TallerEquipo } from "@/lib/taller-actions"

export default function EquiposPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerEquipo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "equipos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchEquipos()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerEquipo>
      title="Equipos"
      rows={data}
      loading={loading}
      moduleName="taller_equipos"
      newHref="/servicio-tecnico/equipos/nuevo"
      newLabel="Nuevo Equipo"
      rowHrefBase="/servicio-tecnico/equipos"
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "marca", label: "Marca" },
        { key: "modelo", label: "Modelo" },
        {
          key: "area",
          label: "Área",
          render: r => r.taller_areas_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_areas_reparacion?.nombre ?? "",
        },
        { key: "dias_garantia_compra", label: "Gar. Compra (días)", align: "center" },
        { key: "dias_garantia_reparacion", label: "Gar. Rep. (días)", align: "center" },
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
      filterableFields={["area", "marca", "activo"]}
      groupByFields={["area", "marca", "activo"]}
      searchFields={["nombre", "marca", "modelo"]}
      emptyMessage="No hay equipos cargados"
    />
  )
}
