"use client"

import { useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { FichaUsuario } from "@/components/modulo-usuarios"

export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "usuarios")) router.replace("/")
  }, [canSee, router])

  const usuarioId = parseInt(id, 10)
  if (Number.isNaN(usuarioId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/usuarios" className="text-indigo-700 hover:underline">Volver a usuarios</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <FichaUsuario
          usuarioId={usuarioId}
          onVolver={() => router.push("/usuarios")}
          onActualizado={() => { /* el refresh lo hace el listado al volver */ }}
        />
      </div>
    </div>
  )
}
