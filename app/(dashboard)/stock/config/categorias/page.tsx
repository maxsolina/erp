"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConfigCategoriasListado from "@/components/stock/config-categorias-listado"

export default function ConfigCategoriasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_categorias")) router.replace("/")
  }, [canSee, router])

  return <ConfigCategoriasListado />
}
