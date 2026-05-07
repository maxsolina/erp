"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchTiposOT, type TallerTipoOT } from "@/lib/taller-actions"

const TIPO_TECNICO_LABEL: Record<string, string> = {
  propio: "Propio",
  tercero: "Tercero",
  ambos: "Ambos",
}

export default function TiposOTPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTipoOT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tipos_ot")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTiposOT()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerTipoOT>
      title="Tipos de OT"
      rows={data}
      loading={loading}
      moduleName="taller_tipos_ot"
      newHref="/servicio-tecnico/tipos-ot/nuevo"
      newLabel="Nuevo Tipo"
      rowHrefBase="/servicio-tecnico/tipos-ot"
      columns={[
        { key: "codigo", label: "Código", render: r => <span className="font-mono">{r.codigo}</span> },
        { key: "nombre", label: "Nombre" },
        {
          key: "area",
          label: "Área",
          render: r => r.taller_areas_reparacion?.nombre ?? "—",
          filterValue: r => r.taller_areas_reparacion?.nombre ?? "",
        },
        {
          key: "tipo_tecnico",
          label: "Tipo Técnico",
          render: r => TIPO_TECNICO_LABEL[r.tipo_tecnico] ?? r.tipo_tecnico,
          filterValue: r => TIPO_TECNICO_LABEL[r.tipo_tecnico] ?? r.tipo_tecnico,
        },
        {
          key: "garantias",
          label: "Garantía",
          align: "center",
          render: r => {
            const flags = []
            if (r.es_garantia_compra) flags.push("Compra")
            if (r.es_garantia_reparacion) flags.push("Reparación")
            return flags.length ? flags.join(" · ") : "—"
          },
          filterValue: r => {
            const flags = []
            if (r.es_garantia_compra) flags.push("Compra")
            if (r.es_garantia_reparacion) flags.push("Reparación")
            return flags.length ? flags.join(" · ") : "Sin garantía"
          },
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
      filterableFields={["area", "tipo_tecnico", "garantias", "activo"]}
      groupByFields={["area", "tipo_tecnico", "activo"]}
      searchFields={["codigo", "nombre"]}
      emptyMessage="No hay tipos de OT"
    />
  )
}
