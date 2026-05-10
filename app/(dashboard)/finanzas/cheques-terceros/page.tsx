"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ChequesTerceros from "@/components/finanzas/cheques-terceros"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "cheques_terceros")) router.replace("/") }, [canSee, router])
  return <ChequesTerceros />
}
