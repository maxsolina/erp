"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, rowFilterDefault } from "./config-list-shell"
import { formatDate, type AnoFiscal } from "./_shared"

const estadoColor = (estado?: string) => {
  if (estado === "abierto") return "bg-green-100 text-green-700"
  if (estado === "cerrado") return "bg-gray-100 text-gray-600"
  if (estado === "borrador") return "bg-yellow-100 text-yellow-700"
  return "bg-gray-100 text-gray-600"
}

export default function AnosFiscalesListado() {
  const [items, setItems] = useState<AnoFiscal[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/anos-fiscales")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<AnoFiscal>
      title="Años Fiscales"
      moduleName="contabilidad_anos_fiscales"
      monolithView="anos-fiscales"
      monolithLabel="Nuevo Año"
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
          { value: "borrador", label: "Borrador" },
        ]},
      ]}
      rowKey={r => r.id}
      columns={[
        { label: "Código", render: r => <span className="font-mono text-gray-500">{r.codigo ?? "—"}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Inicio", render: r => formatDate(r.fecha_inicio) },
        { label: "Fin", render: r => formatDate(r.fecha_fin) },
        { label: "Períodos", align: "center", render: r => r.contabilidad_periodos?.length ?? 0 },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor(r.estado)}`}>
            {r.estado ?? "—"}
          </span>
        ) },
      ]}
    />
  )
}
