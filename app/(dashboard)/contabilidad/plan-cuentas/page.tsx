"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PlanCuentasListado from "@/components/contabilidad/plan-cuentas-listado"

export default function PlanCuentasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("contabilidad", "plan_cuentas")) router.replace("/")
  }, [canSee, router])

  return <PlanCuentasListado />
}
