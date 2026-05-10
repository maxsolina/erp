"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TiposPrestamos from "@/components/finanzas/tipos-prestamos"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "tipos_prestamos")) router.replace("/") }, [canSee, router])
  return <TiposPrestamos />
}
