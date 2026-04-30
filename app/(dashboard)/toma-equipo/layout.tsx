"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { ventasSidebarConfig } from "@/components/sidebars/ventas-config"

export default function TomaEquipoLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={ventasSidebarConfig}>{children}</ModuleSidebar>
}
