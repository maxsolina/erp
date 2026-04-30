"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { finanzasSidebarConfig } from "@/components/sidebars/finanzas-config"

export default function FinanzasLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={finanzasSidebarConfig}>{children}</ModuleSidebar>
}
