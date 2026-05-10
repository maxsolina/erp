"use client"

// Página principal del módulo de Mensajes (chat interno tipo WhatsApp).
// Resolvemos el usuario logueado del lado del cliente vía la lib estándar
// del ERP y pasamos los datos mínimos al componente.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import ChatModulo from "@/components/chat/chat-modulo"

export default function MensajesPage() {
  const router = useRouter()
  const [yo, setYo] = useState<{ id: number; nombre: string; is_superuser: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login")
        return
      }
      const { data: u } = await supabase
        .from("usuarios")
        .select("id, nombre, is_superuser")
        .eq("auth_user_id", data.user.id)
        .maybeSingle()
      if (!u) {
        router.replace("/")
        return
      }
      setYo({ id: u.id, nombre: u.nombre, is_superuser: u.is_superuser })
      setLoading(false)
    })
  }, [router])

  if (loading || !yo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-44px)] text-sm text-gray-400">
        Cargando…
      </div>
    )
  }

  return (
    <ChatModulo
      yoId={yo.id}
      yoNombre={yo.nombre}
      esSuperuser={yo.is_superuser}
    />
  )
}
