"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type NegociacionCheques, formatCurrency, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

export default function NegociacionChequesListado() {
  const [items, setItems] = useState<NegociacionCheques[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/negociaciones-cheques")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<NegociacionCheques>
      title="Negociación de Cheques"
      moduleName="finanzas_negociacion_cheques"
      monolithModule="finanzas"
      monolithView="negociacion_cheques"
      monolithLabel="Nueva Negociación"
      newHref="/finanzas/negociacion-cheques/nueva"
      editHref={r => `/finanzas/negociacion-cheques/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_nombre ?? "").toLowerCase().includes(q) ||
        (r.proveedor_nombre ?? "").toLowerCase().includes(q) ||
        (r.cuenta_bancaria_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "borrador", label: "Borrador" },
            { value: "en_negociacion", label: "En negociación" },
            { value: "cobranza", label: "Cobranza" },
            { value: "liquidacion", label: "Liquidación" },
            { value: "finalizada", label: "Finalizada" },
            { value: "cancelada", label: "Cancelada" },
          ],
        },
        {
          field: "destino_tipo",
          label: "Destino",
          values: [
            { value: "banco", label: "Banco" },
            { value: "proveedor", label: "Proveedor" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof NegociacionCheques] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay negociaciones de cheques"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
        { label: "Destino", render: r => (
          <span className="text-gray-600 text-sm">
            {r.destino_tipo === "banco" ? (r.cuenta_bancaria_nombre ?? "—") : (r.proveedor_nombre ?? "—")}
          </span>
        ) },
        { label: "Tipo Acred.", align: "center", render: r => (
          <span className="text-xs capitalize">{r.tipo_acreditacion}</span>
        ) },
        { label: "Negociado", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.total_negociado ?? 0, "ARS")}</span>
        ) },
        { label: "Gastos", align: "right", render: r => (
          <span className="font-mono text-red-600">{formatCurrency(r.total_gastos ?? 0, "ARS")}</span>
        ) },
        { label: "Recibido", align: "right", render: r => (
          <span className="font-mono text-green-700">{formatCurrency(r.total_recibido ?? 0, "ARS")}</span>
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
