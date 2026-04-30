"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { stockSidebarConfig } from "@/components/sidebars/stock-config"

export default function ProductosLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={stockSidebarConfig}>{children}</ModuleSidebar>
}
