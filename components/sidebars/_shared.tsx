"use client"

// Sidebar genérico para envolver páginas migradas con el sidebar del módulo padre.
// Cada módulo (Ventas, Compras, Stock, Config) define su propia config con secciones+items
// y usa <ModuleSidebar config={...} /> en su layout.

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { type ReactNode } from "react"
import { useERP } from "@/contexts/erp-context"

export interface SidebarItem {
  label: string
  href: string
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
  items: SidebarItem[]
}

export interface SidebarConfig {
  permModule: string // Para canSee("ventas", ...)
  title: string
  sections: SidebarSection[]
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
  const { canSee } = useERP()

  const currentView = searchParams?.get("view") ?? ""
  const currentModule = searchParams?.get("module") ?? ""

  const isActive = (item: SidebarItem) => {
    if (item.matchView) {
      // Item del monolito: activo si estamos en / con ?module=permModule y ?view=matchView
      return pathname === "/" && currentModule === config.permModule && currentView === item.matchView
    }
    // Item migrado: activo si la ruta coincide
    if (pathname === item.href) return true
    if (item.href !== "/" && pathname.startsWith(item.href + "/")) return true
    return false
  }

  const itemAllowed = (item: SidebarItem) =>
    item.permKey ? canSee(config.permModule, item.permKey) : true

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 overflow-y-auto p-4 shrink-0">
        {config.sections.map(section => {
          const visibles = section.items.filter(itemAllowed)
          if (visibles.length === 0) return null
          return (
            <div key={section.id} className="mb-6">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {section.label}
              </h3>
              {visibles.map(item => (
                <Link
                  key={item.href + (item.matchView ?? "")}
                  href={item.href}
                  className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive(item)
                      ? "bg-indigo-100 text-indigo-800 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )
        })}
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
