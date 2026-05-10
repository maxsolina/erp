"use client"

import { useERP } from "@/contexts/erp-context"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react"
import { Building2, Check, ChevronDown, Menu, Ticket, X } from "lucide-react"
import UserMenu from "@/components/user-menu"
import ModuloTickets from "@/components/modulo-tickets"

// Mapeo del id del topbar a la sub-vista del catálogo de permisos.
// null = siempre visible.
const TOPBAR_TO_VISTA: Record<string, string | null> = {
  home: null,
  taller: "servicio_tecnico",
  ventas: "ventas",
  compras: "compras",
  finanzas: "finanzas",
  contabilidad: "contabilidad",
  deposito: "stock",
  informes: "reportes",
  // Mensajes: visible para todos los usuarios autenticados (no necesita permiso especial).
  mensajes: null,
  config: "configuracion",
}

// URL para cada pestaña del topbar.
// Módulos migrados a rutas top-level → su ruta. El resto usa /?module=X que page.tsx interpreta.
// Para Ventas/Compras/Finanzas/Contabilidad apuntamos a una sub-vista por defecto que
// monta el sidebar nuevo (vs el monolito que tiene su propio sidebar con links viejos).
function tabHref(mod: string): string {
  if (mod === "home") return "/"
  if (mod === "taller") return "/servicio-tecnico"
  if (mod === "deposito") return "/stock"
  if (mod === "informes") return "/informes"
  if (mod === "ventas") return "/ventas/clientes"
  if (mod === "compras") return "/compras/oc"
  if (mod === "finanzas") return "/finanzas/cajas"
  if (mod === "contabilidad") return "/contabilidad/asientos-automaticos"
  if (mod === "mensajes") return "/mensajes"
  return `/?module=${mod}`
}

// Cuál pestaña está activa según la URL actual.
function activeTabFromUrl(pathname: string, search: URLSearchParams): string {
  if (pathname.startsWith("/servicio-tecnico")) return "taller"
  if (pathname.startsWith("/stock") || pathname.startsWith("/productos")) return "deposito"
  if (pathname.startsWith("/ventas") || pathname.startsWith("/listas-precios") || pathname.startsWith("/toma-equipo")) return "ventas"
  if (pathname.startsWith("/compras") || pathname.startsWith("/proveedores")) return "compras"
  if (pathname.startsWith("/finanzas")) return "finanzas"
  if (pathname.startsWith("/contabilidad")) return "contabilidad"
  if (pathname.startsWith("/informes")) return "informes"
  if (pathname.startsWith("/mensajes")) return "mensajes"
  if (pathname.startsWith("/sucursales") || pathname.startsWith("/usuarios")) return "config"
  if (pathname === "/") return search.get("module") || "home"
  return ""
}

// ─── Selector de sucursal activa ────────────────────────────────────────────

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
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Sucursal activa
          </p>
          {sucursales.filter(s => s.activa).map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSucursalActiva(s)
                setOpen(false)
              }}
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

// ─── Shell con auth gate + topbar global ───────────────────────────────────

function DashboardShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, restaurandoSesion, canSee } = useERP()
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParamsObj = useSearchParams()
  const [showTickets, setShowTickets] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Sólo redirigir si ya intentamos restaurar la sesión (evita kick-out en F5).
    if (!restaurandoSesion && !isAuthenticated) router.replace("/login")
  }, [isAuthenticated, restaurandoSesion, router])

  if (restaurandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        Cargando…
      </div>
    )
  }
  if (!isAuthenticated) return null

  // Modo "Tickets" — atajo del topbar (puede sobrevivir hasta que migremos Tickets a su propia ruta)
  if (showTickets) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="fixed top-0 left-0 right-0 h-11 bg-gray-900 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTickets(false)}
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

  const search = searchParamsObj ?? new URLSearchParams()
  const activeTab = activeTabFromUrl(pathname, search)

  const tabs = ["home", "taller", "ventas", "compras", "finanzas", "contabilidad", "deposito", "informes", "mensajes", "config"]
    .filter(mod => {
      const v = TOPBAR_TO_VISTA[mod]
      return v === null || canSee(v)
    })

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Topbar global */}
      <nav className="fixed top-0 left-0 right-0 h-11 bg-indigo-900 flex items-center px-4 z-50 shadow-md">
        {/* Brand */}
        <Link href="/" className="text-white font-semibold flex items-center gap-2 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm">Cell Home ERP</span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex ml-6 gap-1 overflow-x-auto">
          {tabs.map(mod => (
            <Link
              key={mod}
              href={tabHref(mod)}
              className={`px-3 py-2 text-sm rounded transition-colors whitespace-nowrap ${
                activeTab === mod
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="md:hidden ml-auto p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          aria-label="Menú"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Right widgets — desktop */}
        <div className="hidden md:flex ml-auto items-center gap-1">
          <SucursalSelector />
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            onClick={() => setShowTickets(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors text-sm"
            title="Tickets de Soporte"
          >
            <Ticket className="w-4 h-4" />
          </button>
          <UserMenu />
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed top-11 left-0 right-0 bg-indigo-900 z-40 shadow-xl pb-3">
            {tabs.map(mod => (
              <Link
                key={mod}
                href={tabHref(mod)}
                onClick={() => setMobileMenuOpen(false)}
                className={`block w-full text-left px-5 py-3 text-sm border-b border-white/10 transition-colors ${
                  activeTab === mod
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {mod.charAt(0).toUpperCase() + mod.slice(1)}
              </Link>
            ))}
            <div className="px-5 py-3 border-t border-white/20 flex items-center gap-3">
              <SucursalSelector />
              <button
                onClick={() => {
                  setShowTickets(true)
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-1.5 text-white/80 hover:text-white"
                title="Tickets"
              >
                <Ticket className="w-4 h-4" />
              </button>
              <UserMenu />
            </div>
          </div>
        </>
      )}

      {/* Page content (desplazado para no quedar bajo el topbar fijo) */}
      <div className="pt-11 h-screen flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // useSearchParams() requiere un Suspense boundary durante prerender.
  return (
    <Suspense fallback={null}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}
