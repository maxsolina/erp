"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchTecnicos, type TallerTecnico } from "@/lib/taller-actions"

export default function TecnicosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTecnico[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tecnicos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTecnicos()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerTecnico>
      title="Técnicos"
      rows={data}
      loading={loading}
      moduleName="taller_tecnicos"
      newHref="/servicio-tecnico/tecnicos/nuevo"
      newLabel="Nuevo Técnico"
      rowHrefBase="/servicio-tecnico/tecnicos"
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "tipo",
          label: "Tipo",
          align: "center",
          render: r => (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                r.tipo === "propio" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {r.tipo === "propio" ? "Propio" : "Tercero"}
            </span>
          ),
          filterValue: r => (r.tipo === "propio" ? "Propio" : "Tercero"),
        },
        {
          key: "area",
          label: "Área",
          render: r => r.taller_areas_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_areas_reparacion?.nombre ?? "",
        },
        {
          key: "cat_principal",
          label: "Cat. Principal",
          render: r => r.taller_categorias_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_categorias_reparacion?.nombre ?? "",
        },
        {
          key: "complejidad_tope",
          label: "Compl. Tope",
          align: "center",
          render: r => (r.complejidad_tope ?? "—") as React.ReactNode,
        },
        {
          key: "turno",
          label: "Turno",
          render: r => r.taller_turnos?.nombre ?? "—",
          filterValue: r => r.taller_turnos?.nombre ?? "",
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
              {r.activo ? "Activo" : "Inactivo"}
            </span>
          ),
          filterValue: r => (r.activo ? "Sí" : "No"),
        },
      ]}
      filterableFields={["tipo", "area", "cat_principal", "turno", "activo"]}
      groupByFields={["tipo", "area", "turno", "activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay técnicos cargados"
    />
  )
}
