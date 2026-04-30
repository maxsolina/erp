"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function FinanzasRedirectStub({ view, permKey }: { view: string; permKey: string }) {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("finanzas", permKey)) {
      router.replace("/")
      return
    }
    router.replace(`/?module=finanzas&view=${view}`)
  }, [canSee, permKey, router, view])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Finanzas...</div>
}
