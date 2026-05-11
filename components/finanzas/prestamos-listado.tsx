"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type Prestamo, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function PrestamosListado() {
  const [items, setItems] = useState<Prestamo[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/prestamos")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<Prestamo>
      title="Préstamos"
      moduleName="finanzas_prestamos"
      monolithModule="finanzas"
      monolithView="prestamos"
      monolithLabel="Nuevo Préstamo"
      newHref="/finanzas/prestamos/nuevo"
      editHref={r => `/finanzas/prestamos/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.entidad_nombre ?? "").toLowerCase().includes(q) ||
        (r.nro_prestamo ?? "").toLowerCase().includes(q) ||
        (r.tipo_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "pendiente", label: "Pendiente" },
            { value: "cerrado", label: "Cerrado" },
            { value: "cancelado", label: "Cancelado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof Prestamo] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay préstamos"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Entidad", render: r => <span className="text-gray-700">{r.entidad_nombre ?? "—"}</span> },
        { label: "Tipo", render: r => <span className="text-gray-600 text-xs">{r.tipo_nombre ?? "—"}</span> },
        { label: "Nro. Préstamo", render: r => <span className="font-mono text-gray-500 text-xs">{r.nro_prestamo ?? "—"}</span> },
        { label: "Cuotas", align: "center", render: r => r.cantidad_cuotas },
        { label: "Capital", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.capital ?? 0, r.moneda)}</span>
        ) },
        { label: "Saldo", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.saldo ?? 0, r.moneda)}</span>
        ) },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(r.estado)}`}>
            {estadoLabel(r.estado)}
          </span>
        ) },
      ]}
    />
  )
}
