"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type AjusteBanco, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function AjustesBancoListado() {
  const [items, setItems] = useState<AjusteBanco[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/ajustes-banco")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<AjusteBanco>
      title="Ajustes de Banco"
      moduleName="finanzas_ajustes_banco"
      monolithModule="finanzas"
      monolithView="ajustes_banco"
      monolithLabel="Nuevo Ajuste"
      newHref="/finanzas/ajustes-banco/nuevo"
      editHref={r => r.estado === "borrador" ? `/finanzas/ajustes-banco/${r.id}/editar` : null}
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
            { value: "ajuste_pendiente", label: "Pendiente" },
            { value: "publicado", label: "Publicado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof AjusteBanco] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay ajustes de banco"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Cuenta Bancaria", render: r => <span className="text-gray-700">{r.cuenta_bancaria_nombre ?? "—"}</span> },
        { label: "Concepto", render: r => <span className="text-gray-600">{r.concepto_nombre ?? "—"}</span> },
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
