"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { contabilidadSidebarConfig } from "@/components/sidebars/contabilidad-config"

export default function ContabilidadLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={contabilidadSidebarConfig}>{children}</ModuleSidebar>
}
