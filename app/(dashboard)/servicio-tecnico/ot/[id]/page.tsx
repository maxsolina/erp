"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OtFicha from "@/components/servicio-tecnico/ot-ficha"

export default function OtFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "ordenes_trabajo")) router.replace("/")
  }, [canSee, router])

  if (!id) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/servicio-tecnico/ot" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <OtFicha otId={id} />
}
