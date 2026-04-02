"use client"

import { ERPProvider, useERP } from "@/contexts/erp-context"
import LoginPage from "@/components/login-page"
import UserMenu from "@/components/user-menu"
import ModuloTickets from "@/components/modulo-tickets"
import { ReactNode, useState, useRef, useEffect } from "react"
import { Ticket, Building2, ChevronDown, Check } from "lucide-react"

// Selector de sucursal activa
function SucursalSelector() {
  const { sucursales, sucursalActiva, setSucursalActiva } = useERP()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  if (!sucursalActiva) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors text-sm font-medium"
      >
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span>{sucursalActiva.nombre}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[180px] z-[200]">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sucursal activa</p>
          {sucursales.filter(s => s.activa).map(s => (
            <button
              key={s.id}
              onClick={() => { setSucursalActiva(s); setOpen(false) }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{s.nombre}</span>
              {sucursalActiva.id === s.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Componente interno que usa el contexto
function ERPContent({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser } = useERP()
  const [showTicketsModule, setShowTicketsModule] = useState(false)

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Si está en el módulo de tickets
  if (showTicketsModule) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <nav className="fixed top-0 left-0 right-0 h-11 bg-gray-900 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTicketsModule(false)}
              className="text-white hover:text-emerald-300 text-sm"
            >
              ← Volver al ERP
            </button>
            <span className="text-white font-semibold">CellHome ERP</span>
          </div>
          <UserMenu />
        </nav>
        <main className="pt-11 p-6">
          <ModuloTickets />
        </main>
      </div>
    )
  }

  // Renderizar el ERP con el user menu inyectado
  return (
    <div className="relative">
      {/* Inyectar el selector de sucursal y user menu en el top bar existente */}
      <div className="fixed top-0 right-4 h-11 flex items-center z-[60] gap-1">
        <SucursalSelector />
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button
          onClick={() => setShowTicketsModule(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors text-sm"
          title="Tickets de Soporte"
        >
          <Ticket className="w-4 h-4" />
        </button>
        <UserMenu />
      </div>
      {children}
    </div>
  )
}

// Provider wrapper
export default function ERPWrapper({ children }: { children: ReactNode }) {
  return (
    <ERPProvider>
      <ERPContent>{children}</ERPContent>
    </ERPProvider>
  )
}
