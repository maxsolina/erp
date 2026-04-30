"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, rowFilterDefault } from "./config-list-shell"
import { formatDate, type PeriodoContable } from "./_shared"

const estadoColor = (estado?: string) => {
  if (estado === "abierto") return "bg-green-100 text-green-700"
  if (estado === "cerrado") return "bg-gray-100 text-gray-600"
  return "bg-yellow-100 text-yellow-700"
}

export default function PeriodosListado() {
  const [items, setItems] = useState<PeriodoContable[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/periodos")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<PeriodoContable>
      title="Períodos Contables"
      moduleName="contabilidad_periodos"
      monolithView="periodos"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre?.toLowerCase().includes(q) || (r.codigo ?? "").toLowerCase().includes(q)}
      rowFilter={rowFilterDefault}
      filterOptions={[
        { field: "estado", label: "Estado", values: [
          { value: "abierto", label: "Abierto" },
          { value: "cerrado", label: "Cerrado" },
        ]},
      ]}
      rowKey={r => r.id}
      columns={[
        { label: "Código", render: r => <span className="font-mono text-gray-500">{r.codigo ?? "—"}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Año Fiscal", render: r => r.contabilidad_anos_fiscales?.nombre ?? "—" },
        { label: "Inicio", render: r => formatDate(r.fecha_inicio) },
        { label: "Fin", render: r => formatDate(r.fecha_fin) },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor(r.estado)}`}>
            {r.estado}
          </span>
        ) },
      ]}
    />
  )
}
