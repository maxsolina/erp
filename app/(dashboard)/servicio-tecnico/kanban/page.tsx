"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ServicioTecnicoKanban from "@/components/servicio-tecnico/kanban"

export default function KanbanPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "kanban")) router.replace("/")
  }, [canSee, router])

  return <ServicioTecnicoKanban />
}
