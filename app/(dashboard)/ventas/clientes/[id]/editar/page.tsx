"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ClienteForm from "@/components/ventas/cliente-form"

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "listado")) router.replace("/")
  }, [canSee, router])

  const clienteId = parseInt(id, 10)
  if (Number.isNaN(clienteId)) {
    return (
      <div className="p-12 text-center">
        <Link href="/ventas/clientes" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return <ClienteForm initialId={clienteId} />
}
