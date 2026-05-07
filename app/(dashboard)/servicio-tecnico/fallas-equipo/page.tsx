"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchFallasEquipo, type TallerFallaEquipo } from "@/lib/taller-actions"

export default function FallasEquipoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFallaEquipo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas_equipo")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFallasEquipo()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerFallaEquipo>
      title="Fallas por Equipo"
      rows={data}
      loading={loading}
      moduleName="taller_fallas_equipo"
      newHref="/servicio-tecnico/fallas-equipo/nueva"
      newLabel="Nueva Falla por Equipo"
      rowHrefBase="/servicio-tecnico/fallas-equipo"
      columns={[
        {
          key: "equipo",
          label: "Equipo",
          render: r => {
            const e = r.taller_equipos
            if (!e) return "—"
            const partes = [e.nombre, e.marca, e.modelo].filter(Boolean)
            return partes.join(" · ") || "—"
          },
          filterValue: r => r.taller_equipos?.nombre ?? "",
        },
        {
          key: "falla",
          label: "Falla",
          render: r => r.taller_fallas?.nombre ?? "—",
          filterValue: r => r.taller_fallas?.nombre ?? "",
        },
        {
          key: "categoria",
          label: "Categoría",
          render: r => r.taller_categorias_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_categorias_reparacion?.nombre ?? "",
        },
        { key: "complejidad_principal", label: "Compl. Pr.", align: "center" },
        { key: "complejidad_secundaria", label: "Compl. Sec.", align: "center" },
        { key: "tiempo_reparacion_principal", label: "Tiempo Pr. (min)", align: "center" },
        { key: "puntaje_base", label: "Puntaje", align: "center" },
        {
          key: "repuestos_count",
          label: "Repuestos",
          align: "center",
          render: r => r.repuestos?.length ?? 0,
          filterValue: r => String(r.repuestos?.length ?? 0),
        },
      ]}
      filterableFields={["equipo", "falla", "categoria"]}
      groupByFields={["equipo", "categoria"]}
      searchFields={["equipo", "falla"]}
      emptyMessage="No hay fallas por equipo cargadas"
    />
  )
}
