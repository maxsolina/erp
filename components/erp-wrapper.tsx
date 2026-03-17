"use client"

import { ERPProvider, useERP } from "@/contexts/erp-context"
import LoginPage from "@/components/login-page"
import UserMenu from "@/components/user-menu"
import ModuloTickets from "@/components/modulo-tickets"
import { ReactNode, useState } from "react"
import { Ticket } from "lucide-react"

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
      {/* Inyectar el user menu en el top bar existente */}
      <div className="fixed top-0 right-4 h-11 flex items-center z-[60] gap-2">
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
