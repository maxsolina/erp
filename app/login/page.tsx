"use client"

import LoginPage from "@/components/login-page"
import { useERP } from "@/contexts/erp-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginRoute() {
  const { isAuthenticated } = useERP()
  const router = useRouter()

  // Si ya hay sesión, no tiene sentido mostrar /login → mandar al home
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, router])

  return <LoginPage />
}
