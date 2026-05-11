"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type ExtractoCaja, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function ExtractosCajaListado() {
  const [items, setItems] = useState<ExtractoCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/extractos-caja")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ExtractoCaja>
      title="Extractos de Caja"
      moduleName="finanzas_extractos_caja"
      monolithModule="finanzas"
      monolithView="extractos_caja"
      monolithLabel="Nuevo Extracto"
      newHref="/finanzas/extractos-caja/nuevo"
      editHref={r => `/finanzas/extractos-caja/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_nombre ?? "").toLowerCase().includes(q) ||
        (r.responsable_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "abierto", label: "Abierto" },
            { value: "cerrado", label: "Cerrado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof ExtractoCaja] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay extractos de caja"
      columns={[
        { label: "Apertura", render: r => <span className="text-xs">{formatDate(r.fecha_apertura)}</span> },
        { label: "Cierre", render: r => (
          <span className="text-xs text-gray-500">{r.fecha_cierre ? formatDate(r.fecha_cierre) : "—"}</span>
        ) },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
        { label: "Sucursal", render: r => <span className="text-gray-500 text-xs">{r.sucursal ?? "—"}</span> },
        { label: "Responsable", render: r => <span className="text-gray-600">{r.responsable_nombre ?? "—"}</span> },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(r.estado)}`}>
            {estadoLabel(r.estado)}
          </span>
        ) },
      ]}
    />
  )
}
