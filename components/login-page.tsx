"use client"

import { useState } from "react"
import { useERP } from "@/contexts/erp-context"
import { Eye, EyeOff, Smartphone, Lock, User, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const { login } = useERP()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const success = await login(username, password)
      if (!success) {
        setError("Usuario o contraseña incorrectos")
      }
    } catch {
      setError("Error de conexión. Intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-zinc-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="relative w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CellHome ERP</h1>
          <p className="text-neutral-400">Sistema de Gestión Integral</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Iniciar Sesión</h2>
            <p className="text-sm text-gray-500 mt-1">Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition-colors"
                  placeholder="Ingresá tu usuario"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition-colors"
                  placeholder="Ingresá tu contraseña"
                  required
                  autoComplete="current-password"
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black disabled:bg-neutral-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Ingresando...</span>
                </>
              ) : (
                <span>Ingresar</span>
              )}
            </button>

            {/* Link Olvidé Contraseña */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Usuarios de prueba:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => { setUsername("admin"); setPassword("admin123") }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
              >
                <span className="font-medium text-gray-700">admin</span>
                <span className="text-gray-500 block">Administrador</span>
              </button>
              <button
                onClick={() => { setUsername("solinamax"); setPassword("max123") }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
              >
                <span className="font-medium text-gray-700">solinamax</span>
                <span className="text-gray-500 block">Vendedor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-neutral-500 text-sm mt-6">
          CellHome ERP v2.0 - 2026
        </p>
      </div>
    </div>
  )
}
