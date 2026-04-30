"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OtFormulario from "@/components/servicio-tecnico/ot-formulario"

export default function NuevaOtPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "ordenes_trabajo")) router.replace("/")
  }, [canSee, router])

  return (
    <OtFormulario
      onCancelar={() => router.push("/servicio-tecnico/ot")}
      onCreada={id => router.push(`/servicio-tecnico/ot/${id}`)}
    />
  )
}
