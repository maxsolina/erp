"use client"

import { useEffect, useMemo, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { useERP } from "@/contexts/erp-context"
import { type AjusteCaja, formatCurrency, formatDate, estadoBadgeClass, estadoLabel, useCajasIdsPermitidasParaUsuario } from "./_shared"

export default function AjustesCajaListado() {
  const { currentUser } = useERP()
  const cajasPermitidas = useCajasIdsPermitidasParaUsuario(currentUser)
  const [items, setItems] = useState<AjusteCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/ajustes-caja")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const itemsVisibles = useMemo(() => {
    if (cajasPermitidas === null) return []
    return items.filter(e => e.caja_id && cajasPermitidas.has(e.caja_id))
  }, [items, cajasPermitidas])

  return (
    <ContabilidadConfigList<AjusteCaja>
      title="Ajustes de Caja"
      moduleName="finanzas_ajustes_caja"
      monolithModule="finanzas"
      monolithView="ajustes_caja"
      monolithLabel="Nuevo Ajuste"
      newHref="/finanzas/ajustes-caja/nuevo"
      editHref={r => r.estado === "borrador" ? `/finanzas/ajustes-caja/${r.id}/editar` : null}
      data={itemsVisibles}
      cargando={cargando || cajasPermitidas === null}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_nombre ?? "").toLowerCase().includes(q) ||
        (r.concepto_nombre ?? "").toLowerCase().includes(q)
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
        {
          field: "tipo_ajuste",
          label: "Tipo",
          values: [
            { value: "ingreso", label: "Ingreso" },
            { value: "egreso", label: "Egreso" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof AjusteCaja] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay ajustes de caja"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
        { label: "Concepto", render: r => <span className="text-gray-600">{r.concepto_nombre ?? "—"}</span> },
        { label: "Tipo", align: "center", render: r => (
          r.tipo_ajuste ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${r.tipo_ajuste === "ingreso" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{r.tipo_ajuste}</span> : "—"
        ) },
        { label: "Importe", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe ?? 0, "ARS")}</span>
        ) },
        { label: "Auto", align: "center", render: r => r.es_automatico ? "✓" : "—" },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(r.estado)}`}>
            {estadoLabel(r.estado)}
          </span>
        ) },
      ]}
    />
  )
}
