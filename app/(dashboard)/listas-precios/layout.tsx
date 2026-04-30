"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { ventasSidebarConfig } from "@/components/sidebars/ventas-config"

export default function ListasPreciosLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={ventasSidebarConfig}>{children}</ModuleSidebar>
}
