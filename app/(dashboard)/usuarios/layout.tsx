"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { configSidebarConfig } from "@/components/sidebars/config-config"

export default function UsuariosLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={configSidebarConfig}>{children}</ModuleSidebar>
}
