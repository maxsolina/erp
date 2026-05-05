"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { informesSidebarConfig } from "@/components/sidebars/informes-config"

export default function InformesLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={informesSidebarConfig}>{children}</ModuleSidebar>
}
