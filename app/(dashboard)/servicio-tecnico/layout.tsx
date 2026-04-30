"use client"

import { type ReactNode } from "react"
import { ModuleSidebar } from "@/components/sidebars/_shared"
import { tallerSidebarConfig } from "@/components/sidebars/taller-config"

export default function ServicioTecnicoLayout({ children }: { children: ReactNode }) {
  return <ModuleSidebar config={tallerSidebarConfig}>{children}</ModuleSidebar>
}
