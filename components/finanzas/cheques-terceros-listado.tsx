"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type ChequeTercero, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function ChequesTercerosListado() {
  const [items, setItems] = useState<ChequeTercero[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/cheques-terceros")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ChequeTercero>
      title="Cheques de Terceros"
      moduleName="finanzas_cheques_terceros"
      monolithModule="finanzas"
      monolithView="cheques_terceros"
      monolithLabel="Ver en monolito"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero_cheque.toLowerCase().includes(q) ||
        (r.origen_nombre ?? "").toLowerCase().includes(q) ||
        (r.banco_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "en_cartera", label: "En cartera" },
            { value: "negociado", label: "Negociado" },
            { value: "depositado", label: "Depositado" },
            { value: "endosado", label: "Endosado" },
            { value: "rechazado", label: "Rechazado" },
            { value: "cancelado", label: "Cancelado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof ChequeTercero] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay cheques de terceros"
      columns={[
        { label: "Vencimiento", render: r => <span className="text-xs">{formatDate(r.fecha_vencimiento)}</span> },
        { label: "N° Cheque", render: r => <span className="font-mono text-indigo-700">{r.numero_cheque}</span> },
        { label: "Origen", render: r => <span className="text-gray-700">{r.origen_nombre ?? "—"}</span> },
        { label: "Banco", render: r => <span className="text-gray-600">{r.banco_nombre ?? "—"}</span> },
        { label: "Caja", render: r => <span className="text-gray-500 text-xs">{r.caja_nombre ?? "—"}</span> },
        { label: "Importe", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe ?? 0, r.moneda)}</span>
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
