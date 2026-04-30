"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { comprasSidebarConfig } from "@/components/sidebars/compras-config"

export default function ProveedoresLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={comprasSidebarConfig}>{children}</ModuleSidebar>
}
