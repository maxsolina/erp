"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function ContabilidadRedirectStub({ view }: { view: string }) {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad")) {
      router.replace("/")
      return
    }
    router.replace(`/?module=contabilidad&view=${view}`)
  }, [canSee, router, view])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Contabilidad...</div>
}
