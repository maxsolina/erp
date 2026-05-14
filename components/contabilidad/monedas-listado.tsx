"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, filtroActivoEstandar, rowFilterDefault } from "./config-list-shell"
import { type Moneda } from "./_shared"

export default function MonedasListado() {
  const [items, setItems] = useState<Moneda[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/monedas?activo=false")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<Moneda>
      title="Monedas"
      moduleName="contabilidad_monedas"
      monolithView="monedas"
      monolithLabel="Nueva Moneda"
      newHref="/contabilidad/monedas/nueva"
      editHref={r => `/contabilidad/monedas/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre?.toLowerCase().includes(q) || r.codigo?.toLowerCase().includes(q)}
      rowFilter={rowFilterDefault}
      filterOptions={[filtroActivoEstandar]}
      rowKey={r => r.id}
      columns={[
        { label: "Código", render: r => <span className="font-mono text-emerald-700 font-medium">{r.codigo}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Símbolo", align: "center", render: r => r.simbolo ?? "—" },
        { label: "Decimales", align: "center", render: r => r.decimales ?? "—" },
        { label: "Base", align: "center", render: r => r.es_base ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Sí</span> : "—" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Activa" : "Inactiva"}
          </span>
        ) },
      ]}
    />
  )
}
