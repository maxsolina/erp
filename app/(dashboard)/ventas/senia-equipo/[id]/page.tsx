"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import SeniaFicha from "@/components/ventas/senia-ficha"

export default function SeniaFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "senia_equipo")) router.replace("/")
  }, [canSee, router])

  const seniaId = parseInt(id, 10)
  if (Number.isNaN(seniaId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/senia-equipo" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <SeniaFicha seniaId={seniaId} />
}
