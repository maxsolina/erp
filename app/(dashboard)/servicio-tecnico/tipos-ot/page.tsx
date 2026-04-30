"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteTipoOT, fetchTiposOT, type TallerTipoOT } from "@/lib/taller-actions"

export default function TiposOTPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTipoOT[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tipos_ot")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTiposOT().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Tipos de OT"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "codigo", label: "Código" },
        { key: "nombre", label: "Nombre" },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "tipo_tecnico", label: "Tipo Técnico" },
        { key: "es_garantia_compra", label: "Gar. Compra", render: v => (v ? "Sí" : "No") },
        { key: "es_garantia_reparacion", label: "Gar. Rep.", render: v => (v ? "Sí" : "No") },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear tipo de OT — pendiente de UI dedicada")}
      onEdit={() => alert("Editar tipo de OT — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteTipoOT(id)
        setData(await fetchTiposOT())
      }}
    />
  )
}
