"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type CuponTarjeta, formatCurrency, formatDate } from "./_shared"

const estadoBadge = (estado: string) => {
  const map: Record<string, string> = {
    en_cartera: "bg-amber-100 text-amber-700",
    conciliado: "bg-green-100 text-green-700",
    rechazado: "bg-red-100 text-red-700",
    cancelado: "bg-gray-100 text-gray-500",
  }
  return map[estado] ?? "bg-gray-100 text-gray-500"
}

export default function CuponesListado() {
  const [items, setItems] = useState<CuponTarjeta[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/cupones-tarjeta")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<CuponTarjeta>
      title="Cupones de Tarjeta"
      moduleName="finanzas_cupones"
      monolithModule="finanzas"
      monolithView="cupones"
      monolithLabel="Ver/Cargar"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.numero_cupon.toLowerCase().includes(q) ||
        (r.tarjeta_nombre ?? "").toLowerCase().includes(q) ||
        (r.cliente_nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "estado",
          label: "Estado",
          values: [
            { value: "en_cartera", label: "En cartera" },
            { value: "conciliado", label: "Conciliado" },
            { value: "rechazado", label: "Rechazado" },
            { value: "cancelado", label: "Cancelado" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof CuponTarjeta] ?? "") === f.value)}
      rowKey={r => r.id}
      emptyText="No hay cupones"
      columns={[
        { label: "Fecha", render: r => <span className="text-xs">{formatDate(r.fecha_ing_egr)}</span> },
        { label: "N° Cupón", render: r => <span className="font-mono text-indigo-700">{r.numero_cupon}</span> },
        { label: "Lote", render: r => <span className="font-mono text-gray-500 text-xs">{r.numero_lote ?? "—"}</span> },
        { label: "Tarjeta", render: r => <span className="text-gray-700">{r.tarjeta_nombre ?? "—"}</span> },
        { label: "Cliente", render: r => <span className="text-gray-600">{r.cliente_nombre ?? "—"}</span> },
        { label: "Importe", align: "right", render: r => (
          <span className="font-mono">{formatCurrency(r.importe, r.moneda)}</span>
        ) },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(r.estado)}`}>
            {r.estado.replace("_", " ")}
          </span>
        ) },
      ]}
    />
  )
}
