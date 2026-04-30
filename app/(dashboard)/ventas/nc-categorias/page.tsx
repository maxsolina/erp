"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NcCategoriasListado from "@/components/ventas/nc-categorias-listado"

export default function NcCategoriasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "nc_categorias")) router.replace("/")
  }, [canSee, router])

  return <NcCategoriasListado />
}
