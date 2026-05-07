"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchMotivosCierre, type TallerMotivoCierre } from "@/lib/taller-actions"

export default function MotivosCierrePage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerMotivoCierre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "motivos_cierre")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchMotivosCierre()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerMotivoCierre>
      title="Motivos de Cierre"
      rows={data}
      loading={loading}
      moduleName="taller_motivos_cierre"
      newHref="/servicio-tecnico/motivos-cierre/nuevo"
      newLabel="Nuevo Motivo"
      rowHrefBase="/servicio-tecnico/motivos-cierre"
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "activo",
          label: "Activo",
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
      filterableFields={["activo"]}
      groupByFields={["activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay motivos de cierre registrados"
    />
  )
}
