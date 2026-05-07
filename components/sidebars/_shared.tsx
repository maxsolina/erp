"use client"

// Sidebar genérico para envolver páginas migradas con el sidebar del módulo padre.
// Replica la estética del monolito viejo:
//   - Header con cuadrado de color + icono + nombre del módulo + sucursal
//   - Secciones colapsables con chevron + icono + label uppercase
//   - Items con icono opcional
//   - Active state con el color del módulo (emerald, blue, etc.)

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useERP } from "@/contexts/erp-context"

export interface SidebarItem {
  label: string
  href: string
  icon?: LucideIcon
  // Para detectar si está activo cuando estamos en el monolito (?module=X&view=Y).
  // Si presente, el item está activo cuando ?view=matchView en /
  matchView?: string
  // Para items migrados, está activo cuando pathname = href o pathname.startsWith(href + "/")
  // Permission key del catálogo (canSee("modulo", permKey))
  permKey?: string
}

export interface SidebarSection {
  id: string
  label: string
  icon?: LucideIcon
  items: SidebarItem[]
}

export type AccentColor = "emerald" | "blue" | "indigo" | "purple" | "amber" | "rose" | "sky" | "orange"

export interface SidebarConfig {
  permModule: string // Para canSee("ventas", ...)
  title: string
  // Icono que aparece en el header del sidebar (cuadrado de color en la esquina sup. izq.).
  icon?: LucideIcon
  // Color del módulo: tiñe el icono del header y el active state de los items.
  accent?: AccentColor
  sections: SidebarSection[]
}

// Map de accent → clases Tailwind. Sólo las combinaciones que usamos.
const ACCENT: Record<AccentColor, { headerBg: string; activeBg: string; activeText: string }> = {
  emerald: { headerBg: "bg-emerald-600", activeBg: "bg-emerald-100", activeText: "text-emerald-800" },
  blue:    { headerBg: "bg-blue-600",    activeBg: "bg-blue-100",    activeText: "text-blue-800"    },
  indigo:  { headerBg: "bg-indigo-600",  activeBg: "bg-indigo-100",  activeText: "text-indigo-800"  },
  purple:  { headerBg: "bg-purple-600",  activeBg: "bg-purple-100",  activeText: "text-purple-800"  },
  amber:   { headerBg: "bg-amber-600",   activeBg: "bg-amber-100",   activeText: "text-amber-800"   },
  rose:    { headerBg: "bg-rose-600",    activeBg: "bg-rose-100",    activeText: "text-rose-800"    },
  sky:     { headerBg: "bg-sky-600",     activeBg: "bg-sky-100",     activeText: "text-sky-800"     },
  orange:  { headerBg: "bg-orange-600",  activeBg: "bg-orange-100",  activeText: "text-orange-800" },
}

export function ModuleSidebar({
  config,
  children,
}: {
  config: SidebarConfig
  children: ReactNode
}) {
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const { canSee, sucursalActiva } = useERP()

  const currentView = searchParams?.get("view") ?? ""
  const currentModule = searchParams?.get("module") ?? ""

  const accent = ACCENT[config.accent ?? "emerald"]
  const ModuloIcon = config.icon

  // Estado de secciones expandidas. Default: todas expandidas (replica el monolito).
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(config.sections.map(s => [s.id, true]))
  )
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Pre-calculamos qué items son "padres" (otro item del sidebar tiene href
  // que empieza con `item.href + "/"`). Esos solo deben activarse por match
  // EXACTO de pathname — sino se duplica el highlight (ej: Dashboard
  // "/servicio-tecnico" + Órdenes "/servicio-tecnico/ot" estando en /ot).
  const allItems = config.sections.flatMap(s => s.items)
  const itemsConHijos = new Set(
    allItems
      .filter(parent =>
        parent.href &&
        parent.href !== "/" &&
        allItems.some(child => child !== parent && child.href && child.href.startsWith(parent.href + "/"))
      )
      .map(p => p.href)
  )

  const isActive = (item: SidebarItem) => {
    if (item.matchView) {
      // Item del monolito: activo si estamos en / con ?module=permModule y ?view=matchView
      return pathname === "/" && currentModule === config.permModule && currentView === item.matchView
    }
    // Match exacto siempre activa
    if (pathname === item.href) return true
    if (item.href === "/") return false
    // Si este item tiene hijos en el sidebar, solo match exacto
    // (evita el highlight duplicado de Dashboard cuando estás en una sub-ruta).
    if (itemsConHijos.has(item.href)) return false
    // Items hoja: activan por prefijo (ej: /ventas/nv y /ventas/nv/[id])
    if (pathname.startsWith(item.href + "/")) return true
    return false
  }

  const itemAllowed = (item: SidebarItem) =>
    item.permKey ? canSee(config.permModule, item.permKey) : true

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
        {/* Header: cuadrado de color + icono + título + sucursal */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {ModuloIcon && (
              <div className={`w-8 h-8 ${accent.headerBg} rounded-lg flex items-center justify-center shrink-0`}>
                <ModuloIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{config.title}</h2>
              {sucursalActiva?.nombre && (
                <p className="text-xs text-gray-500 truncate">{sucursalActiva.nombre}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav: secciones colapsables */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {config.sections.map(section => {
            const visibles = section.items.filter(itemAllowed)
            if (visibles.length === 0) return null
            const SectIcon = section.icon
            const isExpanded = expanded[section.id] !== false
            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => toggle(section.id)}
                  className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  {SectIcon && <SectIcon className="w-3.5 h-3.5" />}
                  {section.label}
                </button>
                {isExpanded && (
                  <div className="ml-2">
                    {visibles.map(item => {
                      const ItemIcon = item.icon
                      const active = isActive(item)
                      return (
                        <Link
                          key={item.href + (item.matchView ?? "")}
                          href={item.href}
                          className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                            active
                              ? `${accent.activeBg} ${accent.activeText} font-medium`
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {ItemIcon && <ItemIcon className="w-4 h-4 shrink-0" />}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
