"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { FichaCrearUsuario } from "@/components/modulo-usuarios"

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "usuarios")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-auto p-6">
        <FichaCrearUsuario
          onCancelar={() => router.push("/usuarios")}
          onCreado={(idNuevo) => router.push(`/usuarios/${idNuevo}`)}
        />
      </div>
    </div>
  )
}
