"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import Cupones from "@/components/finanzas/cupones"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("finanzas", "cupones")) router.replace("/") }, [canSee, router])
  return <Cupones />
}
