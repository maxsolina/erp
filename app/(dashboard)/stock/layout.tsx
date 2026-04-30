"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import { useERP } from "@/contexts/erp-context"

// Sólo las sub-rutas migradas en PR 8. El resto del módulo Stock (lotes, IMEI,
// control de inventario, ajustes, configuración, informes) sigue en el monolito
// — el usuario las accede desde el ERP clásico (← Volver al ERP).
const ITEMS: { href: string; label: string; permKey?: string; section: "principal" | "operaciones" | "catalogos" }[] = [
  { href: "/stock", label: "Dashboard", section: "principal" },
  { href: "/productos", label: "Productos", permKey: "productos", section: "catalogos" },
  { href: "/stock/transferencias", label: "Transferencias Internas", permKey: "transferencias", section: "operaciones" },
  { href: "/stock/pedidos-abastecimiento", label: "Pedidos de Abastecimiento", permKey: "pedidos_abastecimiento", section: "operaciones" },
]

const SECTION_LABELS = {
  principal: "Principal",
  catalogos: "Productos",
  operaciones: "Operaciones",
} as const

export default function StockLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { canSee } = useERP()

  const items = ITEMS.filter(it => (it.permKey ? canSee("stock", it.permKey) : true))

  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== "/stock" && pathname.startsWith(href + "/")) return true
    return false
  }

  const groups: { key: keyof typeof SECTION_LABELS; items: typeof ITEMS }[] = [
    { key: "principal", items: items.filter(i => i.section === "principal") },
    { key: "catalogos", items: items.filter(i => i.section === "catalogos") },
    { key: "operaciones", items: items.filter(i => i.section === "operaciones") },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Stock / Depósito</span>
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
                        ? "bg-amber-50 text-amber-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null,
          )}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Lotes, IMEI, Control de Inventario, Ajustes, Configuración e Informes están todavía en el ERP clásico.
              Hacé click en <strong>← Volver al ERP</strong> arriba.
            </p>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
