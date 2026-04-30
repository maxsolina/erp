"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CategoriasClienteListado from "@/components/ventas/categorias-cliente-listado"

export default function CategoriasClientePage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "categorias_cliente")) router.replace("/")
  }, [canSee, router])

  return <CategoriasClienteListado />
}
