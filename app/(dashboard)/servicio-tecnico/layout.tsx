"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import { useERP } from "@/contexts/erp-context"

// Mapeo de cada ruta del sidebar al subview-permission del módulo "servicio_tecnico".
// Replica TALLER_KEY_TO_VISTA del monolito components/modulo-taller.tsx (~157-174).
const ITEMS: { href: string; label: string; permKey: string; section: "principal" | "catalogos" | "config" | "vistas" }[] = [
  { href: "/servicio-tecnico", label: "Dashboard", permKey: "dashboard", section: "principal" },
  { href: "/servicio-tecnico/ot", label: "Órdenes de Trabajo", permKey: "ordenes_trabajo", section: "principal" },
  { href: "/servicio-tecnico/tecnicos", label: "Técnicos", permKey: "tecnicos", section: "catalogos" },
  { href: "/servicio-tecnico/equipos", label: "Equipos", permKey: "equipos", section: "catalogos" },
  { href: "/servicio-tecnico/fallas", label: "Fallas", permKey: "fallas", section: "catalogos" },
  { href: "/servicio-tecnico/areas", label: "Áreas de Reparación", permKey: "areas", section: "config" },
  { href: "/servicio-tecnico/categorias", label: "Categorías Reparación", permKey: "categorias_reparacion", section: "config" },
  { href: "/servicio-tecnico/tipos-ot", label: "Tipos de OT", permKey: "tipos_ot", section: "config" },
  { href: "/servicio-tecnico/fallas-equipo", label: "Fallas por Equipos", permKey: "fallas_equipo", section: "config" },
  { href: "/servicio-tecnico/turnos", label: "Turnos de Técnicos", permKey: "turnos", section: "config" },
  { href: "/servicio-tecnico/feriados", label: "Feriados", permKey: "feriados", section: "config" },
  { href: "/servicio-tecnico/controles", label: "Controles / Checklist", permKey: "controles", section: "config" },
  { href: "/servicio-tecnico/motivos-cierre", label: "Motivos de Cierre", permKey: "motivos_cierre", section: "config" },
  { href: "/servicio-tecnico/kanban", label: "Kanban Técnicos", permKey: "kanban", section: "vistas" },
]

const SECTION_LABELS = {
  principal: "Principal",
  catalogos: "Catálogos",
  config: "Configuración",
  vistas: "Vistas Técnico",
} as const

export default function ServicioTecnicoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { canSee } = useERP()

  const items = ITEMS.filter(it => canSee("servicio_tecnico", it.permKey))

  // Activo: la ruta actual coincide exactamente, o es una sub-ruta (/ot/[id], /ot/nueva → resaltan /ot)
  const isActive = (href: string) => {
    if (pathname === href) return true
    // /servicio-tecnico/ot/<algo> → activa "/servicio-tecnico/ot"
    if (href !== "/servicio-tecnico" && pathname.startsWith(href + "/")) return true
    return false
  }

  const groups: { key: keyof typeof SECTION_LABELS; items: typeof ITEMS }[] = [
    { key: "principal", items: items.filter(i => i.section === "principal") },
    { key: "catalogos", items: items.filter(i => i.section === "catalogos") },
    { key: "config", items: items.filter(i => i.section === "config") },
    { key: "vistas", items: items.filter(i => i.section === "vistas") },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Servicio Técnico</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 overflow-y-auto p-4 shrink-0">
          {groups.map(g =>
            g.items.length > 0 ? (
              <div key={g.key} className="mb-6">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {SECTION_LABELS[g.key]}
                </h3>
                {g.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive(item.href)
                        ? "bg-indigo-100 text-indigo-800 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null,
          )}
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
