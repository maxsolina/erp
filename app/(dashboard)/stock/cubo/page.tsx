"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CuboStock from "@/components/stock/cubo"

export default function CuboPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "cubo_stock")) router.replace("/")
  }, [canSee, router])

  return <CuboStock />
}
