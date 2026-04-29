"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Lock, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react"

type Status = "checking" | "ready" | "invalid" | "saving" | "saved"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("checking")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // El cliente del browser de Supabase detecta automáticamente el token
    // del fragmento de la URL al cargar y dispara PASSWORD_RECOVERY.
    const supabase = createClient()
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStatus("ready")
      }
    })

    // Si el link es viejo o inválido, después de un toque caemos a "invalid".
    const timeout = setTimeout(async () => {
      if (!mounted) return
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setStatus("ready")
      } else {
        setStatus("invalid")
      }
    }, 1500)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setStatus("saving")
    try {
      const supabase = createClient()
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
        setError("No se pudo guardar la contraseña nueva. Intentá de nuevo.")
        setStatus("ready")
        return
      }
      // Cerramos la sesión de recuperación para forzar un login limpio.
      await supabase.auth.signOut()
      setStatus("saved")
      setTimeout(() => router.push("/"), 2000)
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
      setStatus("ready")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CellHome ERP</h1>
          <p className="text-green-200/80">Sistema de Gestión Integral</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === "checking" && (
            <div className="text-center space-y-4 py-6">
              <svg className="animate-spin h-8 w-8 text-green-600 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-500">Verificando el link...</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Link inválido o vencido</h2>
              <p className="text-sm text-gray-600">
                Este link ya no sirve. Volvé al login y pedí uno nuevo.
              </p>
              <button
                onClick={() => router.push("/")}
                className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Volver al login
              </button>
            </div>
          )}

          {status === "saved" && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Contraseña actualizada</h2>
              <p className="text-sm text-gray-600">Te llevamos al login...</p>
            </div>
          )}

          {(status === "ready" || status === "saving") && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Nueva contraseña</h2>
                <p className="text-sm text-gray-500 mt-1">Elegí una contraseña nueva para tu cuenta</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña nueva</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Repetir contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Repetí la contraseña"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "saving"}
                  className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {status === "saving" ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar contraseña</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-sm mt-6">CellHome ERP v2.0 - 2026</p>
      </div>
    </div>
  )
}
