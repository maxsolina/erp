"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ValorCajaForm from "@/components/contabilidad/valor-caja-form"

export default function EditarValorCajaPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id ?? "")
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad")) router.replace("/")
  }, [canSee, router])
  return <ValorCajaForm initialId={id} />
}
