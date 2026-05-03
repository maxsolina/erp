"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AsientoFicha from "@/components/contabilidad/asiento-ficha"

export default function AsientoFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    // Permitir ver desde automáticos o manuales — basta con ver alguno de los dos
    const ok = canSee("contabilidad", "asientos_automaticos") || canSee("contabilidad", "asientos_manuales")
    if (!ok) router.replace("/")
  }, [canSee, router])

  if (!id) {
    return (
      <div className="p-12 text-center">
        <Link href="/contabilidad/asientos-automaticos" className="text-indigo-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  return <AsientoFicha id={id} />
}
