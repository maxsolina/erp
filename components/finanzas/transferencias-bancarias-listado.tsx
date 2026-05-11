"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type TransferenciaBancaria, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function TransferenciasBancariasListado() {
  const [items, setItems] = useState<TransferenciaBancaria[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/transferencias-bancarias")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<TransferenciaBancaria>
      title="Transferencias Bancarias"
      moduleName="finanzas_transferencias_bancarias"
      monolithModule="finanzas"
      monolithView="transferencias_bancarias"
      monolithLabel="Nueva Transferencia"
      newHref="/finanzas/transferencias-bancarias/nueva"
      editHref={r => `/finanzas/transferencias-bancarias/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.desde_cuenta_nombre ?? "").toLowerCase().includes(q) ||
        (r.hasta_cuenta_nombre ?? "").toLowerCase().includes(q)
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
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof TransferenciaBancaria] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay transferencias bancarias"
      columns={[
        { label: "Fecha Op.", render: r => <span className="text-xs">{r.fecha_operacion_origen ? formatDate(r.fecha_operacion_origen) : "—"}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Desde", render: r => <span className="text-gray-700">{r.desde_cuenta_nombre ?? "—"}</span> },
        { label: "Hasta", render: r => <span className="text-gray-700">{r.hasta_cuenta_nombre ?? "—"}</span> },
        { label: "Sucursal", render: r => <span className="text-gray-500 text-xs">{r.sucursal ?? "—"}</span> },
        { label: "Importe Origen", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe_origen ?? 0, "ARS")}</span>
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
