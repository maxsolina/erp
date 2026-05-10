"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ChequesPropios from "@/components/finanzas/cheques-propios"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "cheques_propios")) router.replace("/") }, [canSee, router])
  return <ChequesPropios />
}
