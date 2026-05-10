"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import Tarjetas from "@/components/finanzas/tarjetas"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "tarjetas")) router.replace("/") }, [canSee, router])
  return <Tarjetas />
}
