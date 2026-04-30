"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteCategoria, fetchCategorias, type TallerCategoria } from "@/lib/taller-actions"

export default function CategoriasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerCategoria[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "categorias_reparacion")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchCategorias().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Categorías de Reparación"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "orden_asignacion", label: "Orden Asignación" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear categoría — pendiente de UI dedicada")}
      onEdit={() => alert("Editar categoría — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteCategoria(id)
        setData(await fetchCategorias())
      }}
    />
  )
}
