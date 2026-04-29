"use client"

import { useERP } from "@/contexts/erp-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Building2, ChevronDown, Check, Ticket } from "lucide-react"
import UserMenu from "@/components/user-menu"
import ModuloTickets from "@/components/modulo-tickets"

// ─── Selector de sucursal activa (idéntico al que estaba en erp-wrapper.tsx) ─

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

// ─── AuthGate: si no hay sesión, redirige a /login ───────────────────────────

function DashboardShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useERP()
  const router = useRouter()
  const [showTicketsModule, setShowTicketsModule] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  // Mientras el redirect está en vuelo no renderizamos nada para evitar el flash del shell
  if (!isAuthenticated) return null

  // Modo "Tickets" — atajo del topbar (puede sobrevivir hasta que migremos Tickets a su propia ruta)
  if (showTicketsModule) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  return (
    <div className="relative">
      {/* Widgets inyectados sobre el topbar existente del monolito */}
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // ERPProvider vive en app/layout.tsx (root) — acá solo agregamos el shell con auth gate
  return <DashboardShell>{children}</DashboardShell>
}
