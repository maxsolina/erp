"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasFicha from "@/components/compras/facturas-ficha"

export default function NdCompraFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "nd_compra")) router.replace("/") }, [canSee, router])
  if (!id) return <div className="p-12 text-center"><Link href="/compras/nd" className="text-indigo-700 hover:underline">Volver</Link></div>
  return <FacturasFicha apiUrl={`/api/compras/notas-debito/${id}`} backHref="/compras/nd" monolitoEditView="nd_compra" />
}
