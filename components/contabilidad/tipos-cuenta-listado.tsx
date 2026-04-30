"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, filtroActivoEstandar, rowFilterDefault } from "./config-list-shell"
import { type TipoCuentaConfig } from "./_shared"

export default function TiposCuentaListado() {
  const [items, setItems] = useState<TipoCuentaConfig[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/contabilidad/tipos-cuenta?activo=false")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<TipoCuentaConfig>
      title="Tipos de Cuenta"
      moduleName="contabilidad_tipos_cuenta"
      monolithView="tipos-cuenta"
      monolithLabel="Nuevo Tipo"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre?.toLowerCase().includes(q) || r.codigo?.toLowerCase().includes(q)}
      rowFilter={rowFilterDefault}
      filterOptions={[
        filtroActivoEstandar,
        { field: "es_resultado", label: "Es Resultado", values: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ]},
      ]}
      rowKey={r => r.id}
      columns={[
        { label: "Código", render: r => <span className="font-mono text-emerald-700 font-medium">{r.codigo}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Es Resultado", align: "center", render: r => r.es_resultado ? "Sí" : "No" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Activo" : "Inactivo"}
          </span>
        ) },
      ]}
    />
  )
}
