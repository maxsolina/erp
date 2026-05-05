"use client"
import { use } from "react"
import AjusteFicha from "@/components/stock/ajuste-ficha"
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ajusteId = Number(id)
  if (!Number.isFinite(ajusteId) || ajusteId <= 0) {
    return <div className="p-12 text-center text-red-600">ID inválido</div>
  }
  return <AjusteFicha ajusteId={ajusteId} tipo="negativo" />
}
