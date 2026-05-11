"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type TransferenciaCaja, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function TransferenciasCajaListado() {
  const [items, setItems] = useState<TransferenciaCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/transferencias-caja")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<TransferenciaCaja>
      title="Transferencias de Caja"
      moduleName="finanzas_transferencias_caja"
      monolithModule="finanzas"
      monolithView="transferencias_caja"
      monolithLabel="Nueva Transferencia"
      newHref="/finanzas/transferencias-caja/nueva"
      editHref={r => `/finanzas/transferencias-caja/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_desde_nombre ?? "").toLowerCase().includes(q) ||
        (r.caja_hasta_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "pendiente", label: "Pendiente" },
            { value: "publicado", label: "Publicado" },
            { value: "cancelado", label: "Cancelado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof TransferenciaCaja] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay transferencias de caja"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Desde", render: r => <span className="text-gray-700">{r.caja_desde_nombre ?? "—"}</span> },
        { label: "Hasta", render: r => <span className="text-gray-700">{r.caja_hasta_nombre ?? "—"}</span> },
        { label: "Valor", render: r => <span className="text-gray-600">{r.valor_nombre ?? "—"}</span> },
        { label: "Importe", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe ?? 0, "ARS")}</span>
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
