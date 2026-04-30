"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TiposCuentaListado from "@/components/contabilidad/tipos-cuenta-listado"

export default function TiposCuentaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "tipos_cuenta")) router.replace("/")
  }, [canSee, router])
  return <TiposCuentaListado />
}
