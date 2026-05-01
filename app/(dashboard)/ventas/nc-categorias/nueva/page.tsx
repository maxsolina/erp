"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NcCategoriaForm from "@/components/ventas/nc-categoria-form"

export default function NcCategoriaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "nc_categorias")) router.replace("/")
  }, [canSee, router])
  return <NcCategoriaForm />
}
