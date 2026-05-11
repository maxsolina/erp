"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type Deposito, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function DepositosListado() {
  const [items, setItems] = useState<Deposito[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/depositos-bancarios")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<Deposito>
      title="Depósitos"
      moduleName="finanzas_depositos"
      monolithModule="finanzas"
      monolithView="depositos"
      monolithLabel="Nuevo Depósito"
      newHref="/finanzas/depositos/nueva"
      editHref={r => `/finanzas/depositos/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.cuenta_bancaria_nombre ?? "").toLowerCase().includes(q) ||
        (r.caja_egreso_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "deposito_pendiente", label: "Pendiente" },
            { value: "publicado", label: "Publicado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof Deposito] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay depósitos"
      columns={[
        { label: "Fecha Op.", render: r => <span className="text-xs">{r.fecha_operacion ? formatDate(r.fecha_operacion) : "—"}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Cuenta Bancaria", render: r => <span className="text-gray-700">{r.cuenta_bancaria_nombre ?? "—"}</span> },
        { label: "Caja Origen", render: r => <span className="text-gray-600">{r.caja_egreso_nombre ?? "—"}</span> },
        { label: "Tipo Op.", render: r => <span className="text-gray-500 text-xs">{r.tipo_operacion ?? "—"}</span> },
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
