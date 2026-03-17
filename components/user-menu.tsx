"use client"

import { useState, useRef, useEffect } from "react"
import { useERP } from "@/contexts/erp-context"
import { ChevronDown, Settings, Ticket, Monitor, Info, LogOut, X, Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react"

export default function UserMenu() {
  const { currentUser, logout, changePassword } = useERP()
  const [isOpen, setIsOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTickets, setShowTickets] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!currentUser) return null

  const sucursalCode = currentUser.sucursal_nombre.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)

  return (
    <>
      {/* User Menu Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {currentUser.nombre.charAt(0).toUpperCase()}
          </div>
          <span className="text-white text-sm font-medium">
            {currentUser.username} ({sucursalCode})
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-900">{currentUser.nombre}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
              <p className="text-xs text-gray-400 mt-1">Rol: {currentUser.rol} | {currentUser.sucursal_nombre}</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => { setShowPreferences(true); setIsOpen(false) }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Preferencias
              </button>
              <button
                onClick={() => { setShowTickets(true); setIsOpen(false) }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Ticket className="w-4 h-4 text-gray-400" />
                Tickets
              </button>
              <button
                onClick={() => window.open('https://anydesk.com', '_blank')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Monitor className="w-4 h-4 text-gray-400" />
                Asistencia Remota
              </button>
              <button
                onClick={() => { setShowInfo(true); setIsOpen(false) }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Info className="w-4 h-4 text-gray-400" />
                Información
              </button>
            </div>

            <div className="border-t py-1">
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Preferencias */}
      {showPreferences && (
        <PreferencesModal 
          onClose={() => setShowPreferences(false)} 
          onChangePassword={() => { setShowPreferences(false); setShowChangePassword(true) }}
        />
      )}

      {/* Modal Cambiar Contraseña */}
      {showChangePassword && (
        <ChangePasswordModal 
          onClose={() => setShowChangePassword(false)}
          changePassword={changePassword}
        />
      )}

      {/* Modal Tickets */}
      {showTickets && (
        <TicketsModal onClose={() => setShowTickets(false)} />
      )}

      {/* Modal Info */}
      {showInfo && (
        <InfoModal onClose={() => setShowInfo(false)} />
      )}
    </>
  )
}

// =====================================================
// MODAL PREFERENCIAS
// =====================================================

function PreferencesModal({ onClose, onChangePassword }: { onClose: () => void; onChangePassword: () => void }) {
  const { currentUser } = useERP()
  const [tema, setTema] = useState("claro")
  const [notificaciones, setNotificaciones] = useState(true)
  const [sonidos, setSonidos] = useState(true)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Preferencias</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Perfil */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Perfil</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-medium">
                {currentUser?.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentUser?.nombre}</p>
                <p className="text-sm text-gray-500">{currentUser?.email}</p>
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1">
                  Cambiar avatar
                </button>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Seguridad</h3>
            <button
              onClick={onChangePassword}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <Lock className="w-4 h-4 text-gray-400" />
              Cambiar contraseña
            </button>
          </div>

          {/* Apariencia */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Apariencia</h3>
            <select
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="claro">Tema Claro</option>
              <option value="oscuro">Tema Oscuro</option>
              <option value="sistema">Seguir sistema</option>
            </select>
          </div>

          {/* Notificaciones */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notificaciones</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Notificaciones push</span>
                <input
                  type="checkbox"
                  checked={notificaciones}
                  onChange={(e) => setNotificaciones(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sonidos</span>
                <input
                  type="checkbox"
                  checked={sonidos}
                  onChange={(e) => setSonidos(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL CAMBIAR CONTRASEÑA
// =====================================================

function ChangePasswordModal({ onClose, changePassword }: { onClose: () => void; changePassword: (old: string, newPass: string) => Promise<boolean> }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result) {
        setSuccess(true)
        setTimeout(onClose, 2000)
      } else {
        setError("Contraseña actual incorrecta")
      }
    } catch {
      setError("Error al cambiar contraseña")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contraseña actualizada</h2>
          <p className="text-gray-500">Tu contraseña fue cambiada exitosamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400"
            >
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// MODAL TICKETS (Vista resumida, redirige a módulo completo)
// =====================================================

function TicketsModal({ onClose }: { onClose: () => void }) {
  const { tickets, currentUser } = useERP()
  const misTickets = tickets.filter(t => t.usuario_id === currentUser?.id)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Mis Tickets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {misTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tenés tickets abiertos</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {misTickets.slice(0, 5).map(ticket => (
                <div key={ticket.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ticket.asunto}</p>
                      <p className="text-xs text-gray-500 mt-1">{ticket.numero} - {new Date(ticket.fecha).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ticket.estado === 'abierto' ? 'bg-blue-100 text-blue-700' :
                      ticket.estado === 'en_progreso' ? 'bg-amber-100 text-amber-700' :
                      ticket.estado === 'resuelto' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            + Crear nuevo ticket
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL INFO
// =====================================================

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Información del Sistema</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Info className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">CellHome ERP</h3>
            <p className="text-sm text-gray-500">Sistema de Gestión Integral</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Versión</span>
              <span className="font-medium text-gray-900">2.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Build</span>
              <span className="font-medium text-gray-900">2026.03.16</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Ambiente</span>
              <span className="font-medium text-gray-900">Producción</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Soporte</span>
              <a href="mailto:soporte@cellhome.com" className="font-medium text-emerald-600">soporte@cellhome.com</a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-400 text-center">
              2026 CellHome. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
