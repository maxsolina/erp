"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ClientesListado from "@/components/ventas/clientes-listado"

export default function ClientesListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("ventas", "listado")) router.replace("/") }, [canSee, router])
  return <ClientesListado />
}
