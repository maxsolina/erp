"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type ConversionMoneda, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function ConversionMonedasListado() {
  const [items, setItems] = useState<ConversionMoneda[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/conversiones-moneda")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ConversionMoneda>
      title="Conversión de Monedas"
      moduleName="finanzas_conversion_monedas"
      monolithModule="finanzas"
      monolithView="conversion_monedas"
      monolithLabel="Nueva Conversión"
      newHref="/finanzas/conversion-monedas/nueva"
      editHref={r => `/finanzas/conversion-monedas/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "publicado", label: "Publicado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof ConversionMoneda] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay conversiones de moneda"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
        { label: "Origen", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe_origen ?? 0, r.moneda_origen)}</span>
        ) },
        { label: "Destino", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe_destino ?? 0, r.moneda_destino)}</span>
        ) },
        { label: "Cotización", align: "right", render: r => (
          <span className="font-mono text-xs text-gray-500">{(r.cotizacion ?? 0).toFixed(4)}</span>
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
