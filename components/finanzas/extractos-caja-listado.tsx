"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type ExtractoCaja, formatDate, estadoBadgeClass, estadoLabel } from "./_shared"

interface SaldoEnriquecido {
  id: string
  valor_id: string
  valor_nombre: string
  moneda: string
  saldo_apertura: number
  saldo_cierre_ingresado: number | null
  saldo_estimado?: number
}

interface ExtractoConSaldos extends ExtractoCaja {
  saldos?: SaldoEnriquecido[]
}

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export default function ExtractosCajaListado() {
  const [items, setItems] = useState<ExtractoConSaldos[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/extractos-caja")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ExtractoConSaldos>
      title="Extractos de Caja"
      moduleName="finanzas_extractos_caja"
      monolithModule="finanzas"
      monolithView="extractos_caja"
      monolithLabel="Nuevo Extracto"
      newHref="/finanzas/extractos-caja/nuevo"
      editHref={r => `/finanzas/extractos-caja/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero.toLowerCase().includes(q) ||
        (r.caja_nombre ?? "").toLowerCase().includes(q) ||
        (r.responsable_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "abierto", label: "Abierto" },
            { value: "cerrado", label: "Cerrado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof ExtractoConSaldos] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay extractos de caja"
      columns={[
        { label: "Apertura", render: r => <span className="text-xs">{formatDate(r.fecha_apertura)}</span> },
        { label: "Cierre", render: r => (
          <span className="text-xs text-gray-500">{r.fecha_cierre ? formatDate(r.fecha_cierre) : "—"}</span>
        ) },
        { label: "N°", render: r => <span className="font-mono text-indigo-700">{r.numero}</span> },
        { label: "Caja", render: r => <span className="text-gray-700">{r.caja_nombre ?? "—"}</span> },
        { label: "Sucursal", render: r => <span className="text-gray-500 text-xs">{r.sucursal ?? "—"}</span> },
        { label: "Responsable", render: r => <span className="text-gray-600">{r.responsable_nombre ?? "—"}</span> },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadgeClass(r.estado)}`}>
            {estadoLabel(r.estado)}
          </span>
        ) },
        {
          label: "Saldo Estimado",
          render: r => {
            const saldos = r.saldos ?? []
            if (saldos.length === 0) return <span className="text-xs text-gray-400">—</span>
            return (
              <div className="flex flex-col gap-0.5">
                {saldos.map(s => {
                  const monto = r.estado === "cerrado"
                    ? Number(s.saldo_cierre_ingresado ?? s.saldo_estimado ?? s.saldo_apertura ?? 0)
                    : Number(s.saldo_estimado ?? s.saldo_apertura ?? 0)
                  return (
                    <span key={s.id} className="text-xs font-mono whitespace-nowrap">
                      <span className="text-gray-500">{s.valor_nombre}:</span>{" "}
                      <span className={monto < 0 ? "text-red-600 font-semibold" : "text-gray-900"}>
                        {s.moneda !== "ARS" ? `${s.moneda} ` : "$"}{formatMonto(monto)}
                      </span>
                    </span>
                  )
                })}
              </div>
            )
          },
        },
      ]}
    />
  )
}
