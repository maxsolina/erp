"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, filtroActivoEstandar, rowFilterDefault } from "./config-list-shell"
import { type Diario } from "./_shared"

export default function DiariosListado() {
  const [items, setItems] = useState<Diario[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/diarios")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<Diario>
      title="Diarios"
      moduleName="contabilidad_diarios"
      monolithView="diarios"
      monolithLabel="Nuevo Diario"
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
        { label: "Nombre", render: r => <span className="font-medium">{r.nombre}</span> },
        { label: "Tipo", render: r => r.tipo ?? "—" },
        { label: "Moneda", render: r => r.moneda ?? "—" },
        { label: "Sucursal", render: r => r.sucursal?.nombre ?? "—" },
        { label: "Cuenta Debe", render: r => r.cuenta_debito ? <span><span className="font-mono text-xs text-gray-500">{r.cuenta_debito.codigo}</span> {r.cuenta_debito.nombre}</span> : "—" },
        { label: "Auto.", align: "center", render: r => r.es_automatico ? "Sí" : "No" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Activo" : "Inactivo"}
          </span>
        ) },
      ]}
    />
  )
}
