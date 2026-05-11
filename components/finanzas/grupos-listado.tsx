"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type GrupoTarjeta } from "./_shared"

export default function GruposListado() {
  const [items, setItems] = useState<GrupoTarjeta[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/grupos-tarjeta")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<GrupoTarjeta>
      title="Grupos de Tarjeta"
      moduleName="finanzas_grupos"
      monolithModule="finanzas"
      monolithView="grupos"
      monolithLabel="Nuevo Grupo"
      newHref="/finanzas/grupos/nuevo"
      editHref={r => `/finanzas/grupos/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre.toLowerCase().includes(q) || (r.banco ?? "").toLowerCase().includes(q)}
      rowKey={r => r.id}
      emptyText="No hay grupos configurados"
      columns={[
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Banco", render: r => <span className="text-gray-600">{r.banco || "—"}</span> },
        { label: "Tipo Movimiento", render: r => <span className="text-gray-600">{r.tipo_movimiento || "—"}</span> },
      ]}
    />
  )
}
