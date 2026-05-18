"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OpFicha from "@/components/compras/op-ficha"

export default function OpFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "ordenes_pago")) router.replace("/") }, [canSee, router])
  if (!id) return <div className="p-12 text-center"><Link href="/compras/op" className="text-indigo-700 hover:underline">Volver</Link></div>
  return <OpFicha opId={id} />
}
