"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type RegistroBanco, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function RegistrosBancoListado() {
  const [items, setItems] = useState<RegistroBanco[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/registros-banco")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<RegistroBanco>
      title="Registros de Banco"
      moduleName="finanzas_registros_banco"
      monolithModule="finanzas"
      monolithView="registros_banco"
      monolithLabel="Nuevo Registro"
      newHref="/finanzas/registros-banco/nuevo"
      editHref={r => `/finanzas/registros-banco/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.cuenta_bancaria_nombre ?? "").toLowerCase().includes(q) ||
        (r.concepto_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "confirmado", label: "Confirmado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof RegistroBanco] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay registros de banco"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Cuenta Bancaria", render: r => <span className="text-gray-700">{r.cuenta_bancaria_nombre ?? "—"}</span> },
        { label: "Sucursal", render: r => <span className="text-gray-500 text-xs">{r.sucursal ?? "—"}</span> },
        { label: "Concepto", render: r => <span className="text-gray-600">{r.concepto_nombre ?? "—"}</span> },
        { label: "Comprobantes", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.total_comprobantes ?? 0, r.moneda)}</span>
        ) },
        { label: "Valores", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.total_valores ?? 0, r.moneda)}</span>
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
