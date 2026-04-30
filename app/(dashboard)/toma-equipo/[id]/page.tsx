"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TomaEquipoFicha from "@/components/toma-equipo/ficha"

export default function FichaTomaEquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "toma_equipo")) router.replace("/")
  }, [canSee, router])

  const tomaId = parseInt(id, 10)
  if (Number.isNaN(tomaId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/toma-equipo" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-auto p-6">
        <TomaEquipoFicha tomaId={tomaId} />
      </div>
    </div>
  )
}
