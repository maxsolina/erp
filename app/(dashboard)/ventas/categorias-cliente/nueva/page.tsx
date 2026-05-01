"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CategoriaClienteForm from "@/components/ventas/categoria-cliente-form"

export default function CategoriaClienteNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "categorias_cliente")) router.replace("/")
  }, [canSee, router])
  return <CategoriaClienteForm />
}
