"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type Tarjeta } from "./_shared"

export default function TarjetasListado() {
  const [items, setItems] = useState<Tarjeta[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/tarjetas")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<Tarjeta>
      title="Tarjetas"
      moduleName="finanzas_tarjetas"
      monolithModule="finanzas"
      monolithView="tarjetas"
      monolithLabel="Nueva Tarjeta"
      newHref="/finanzas/tarjetas/nueva"
      editHref={r => `/finanzas/tarjetas/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => r.nombre.toLowerCase().includes(q)}
      filterOptions={[
        {
          field: "tipo",
          label: "Tipo",
          values: [
            { value: "credito", label: "Crédito" },
            { value: "debito", label: "Débito" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof Tarjeta] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay tarjetas configuradas"
      columns={[
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Tipo", align: "center", render: r => (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">{r.tipo}</span>
        ) },
        { label: "Días Presentación", align: "center", render: r => r.dias_presentacion ?? "—" },
        { label: "Días Pago", align: "center", render: r => r.dias_pago ?? "—" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activa ? "Activa" : "Inactiva"}
          </span>
        ) },
      ]}
    />
  )
}
