"use client"

import { useEffect, useMemo, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { useERP } from "@/contexts/erp-context"
import { type RegistroCaja, formatCurrency, formatDate, estadoBadgeClass, estadoLabel, useCajasIdsPermitidasParaUsuario } from "./_shared"

export default function RegistrosCajaListado() {
  const { currentUser } = useERP()
  const cajasPermitidas = useCajasIdsPermitidasParaUsuario(currentUser)
  const [items, setItems] = useState<RegistroCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/registros-caja")
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
    <ContabilidadConfigList<RegistroCaja>
      title="Registros de Caja"
      moduleName="finanzas_registros_caja"
      monolithModule="finanzas"
      monolithView="registros_caja"
      monolithLabel="Nuevo Registro"
      newHref="/finanzas/registros-caja/nuevo"
      editHref={r => `/finanzas/registros-caja/${r.id}/editar`}
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
            { value: "confirmado", label: "Confirmado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof RegistroCaja] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay registros de caja"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha)}</span> },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
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
