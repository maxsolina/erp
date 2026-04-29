"use client"

import { useState } from "react"
import { useERP } from "@/contexts/erp-context"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Smartphone, Lock, User, AlertCircle, Mail, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react"

type Mode = "login" | "forgot" | "otp"

export default function LoginPage() {
  const { login, verifyLoginOtp, resendLoginOtp } = useERP()
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Estado para el flujo de recuperación de contraseña
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)

  // Estado para el flujo de OTP (segundo factor por mail)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpResent, setOtpResent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login(username, password)
      if (result.ok && result.requiresOtp) {
        // OTP activo: pasamos a la pantalla de código de 6 dígitos.
        setOtpEmail(result.email)
        setOtpCode("")
        setOtpResent(false)
        setMode("otp")
      } else if (result.ok) {
        // OTP apagado: el contexto ya seteó el usuario, el wrapper cambia de pantalla solo.
      } else {
        if (result.reason === "invalid_credentials") {
          setError("Usuario o contraseña incorrectos")
        } else if (result.reason === "otp_send_failed") {
          setError("No se pudo enviar el código por mail. Probá de nuevo en un minuto.")
        } else {
          setError("Error de conexión. Intentá nuevamente.")
        }
      }
    } catch {
      setError("Error de conexión. Intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (otpCode.trim().length !== 6) {
      setError("El código tiene que ser de 6 dígitos.")
      return
    }
    setLoading(true)
    try {
      const ok = await verifyLoginOtp(otpEmail, otpCode.trim())
      if (!ok) {
        setError("Código incorrecto o vencido. Pedí uno nuevo si hace falta.")
      }
      // Si ok === true, el contexto setea currentUser y el wrapper cambia de pantalla.
    } catch {
      setError("Error de conexión. Intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError("")
    setOtpResent(false)
    setLoading(true)
    try {
      const ok = await resendLoginOtp(otpEmail)
      if (ok) {
        setOtpResent(true)
      } else {
        setError("No se pudo reenviar el código. Esperá un minuto y volvé a probar.")
      }
    } finally {
      setLoading(false)
    }
  }

  const goBackToLoginFromOtp = () => {
    setMode("login")
    setOtpEmail("")
    setOtpCode("")
    setOtpResent(false)
    setPassword("")
    setError("")
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo })
      if (resetError) {
        setError("No se pudo enviar el mail. Verificá la dirección e intentá nuevamente.")
      } else {
        setForgotSent(true)
      }
    } catch {
      setError("Error de conexión. Intentá nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const goBackToLogin = () => {
    setMode("login")
    setForgotEmail("")
    setForgotSent(false)
    setError("")
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-gray-900 bg-cover bg-center"
      style={{ backgroundImage: "url(/login-bg.jpg)" }}
    >
      {/* Overlay oscuro para que la tarjeta siga siendo legible */}
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CellHome ERP</h1>
          <p className="text-green-200/80">Sistema de Gestión Integral</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === "otp" ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-3">
                  <ShieldCheck className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Verificá tu identidad</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Te mandamos un código de 6 dígitos a <span className="font-medium">{otpEmail}</span>
                </p>
              </div>
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-center text-2xl tracking-widest font-mono"
                    placeholder="······"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {otpResent && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Código reenviado. Revisá tu mail.</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Verificar</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={goBackToLoginFromOtp}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                  >
                    Reenviar código
                  </button>
                </div>
              </form>
            </>
          ) : mode === "forgot" ? (
            forgotSent ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Revisá tu mail</h2>
                <p className="text-sm text-gray-600">
                  Te mandamos un mail a <span className="font-medium">{forgotEmail}</span> con un link para crear una contraseña nueva.
                </p>
                <p className="text-xs text-gray-500">
                  Si no llega en unos minutos, revisá la carpeta de spam o intentá de nuevo.
                </p>
                <button
                  type="button"
                  onClick={goBackToLogin}
                  className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Volver al login
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h2>
                  <p className="text-sm text-gray-500 mt-1">Te mandamos un mail con un link para crear una nueva</p>
                </div>
                <form onSubmit={handleForgotSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="tu@email.com"
                        required
                        autoComplete="email"
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
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar mail</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={goBackToLogin}
                    className="w-full flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login
                  </button>
                </form>
              </>
            )
          ) : (
          <>
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Ingresá tu usuario"
                  required
                  autoComplete="off"
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
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Ingresá tu contraseña"
                  required
                  autoComplete="off"
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
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
                onClick={() => { setMode("forgot"); setError("") }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
          </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200/60 text-sm mt-6">
          CellHome ERP v2.0 - 2026
        </p>
      </div>
    </div>
  )
}
