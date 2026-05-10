"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import Recargos from "@/components/finanzas/recargos"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "recargos")) router.replace("/") }, [canSee, router])
  return <Recargos />
}
