"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, filtroActivoEstandar, rowFilterDefault } from "./config-list-shell"
import { type TipoCotizacion } from "./_shared"

export default function TiposCotizacionListado() {
  const [items, setItems] = useState<TipoCotizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/tipos-cotizacion?activo=false")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<TipoCotizacion>
      title="Tipos de Cotización"
      moduleName="contabilidad_tipos_cot"
      monolithView="tipos-cotizacion"
      monolithLabel="Nuevo Tipo"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre?.toLowerCase().includes(q) || (r.codigo ?? "").toLowerCase().includes(q)}
      rowFilter={rowFilterDefault}
      filterOptions={[filtroActivoEstandar]}
      rowKey={r => r.id}
      columns={[
        { label: "Código", render: r => <span className="font-mono text-gray-500">{r.codigo ?? "—"}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Descripción", render: r => r.descripcion ?? "—" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Activo" : "Inactivo"}
          </span>
        ) },
      ]}
    />
  )
}
