"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "@/components/contabilidad/config-list-shell"
import { type RecargoTarjeta, type Tarjeta, type GrupoTarjeta } from "./_shared"

interface RecargoEnriquecido extends RecargoTarjeta {
  tarjeta_nombre?: string
  grupo_nombre?: string
}

export default function RecargosListado() {
  const [items, setItems] = useState<RecargoEnriquecido[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/recargos-tarjeta").then(r => r.json()),
      fetch("/api/tarjetas").then(r => r.json()),
      fetch("/api/grupos-tarjeta").then(r => r.json()),
    ])
      .then(([rec, tar, gru]: [RecargoTarjeta[], Tarjeta[], GrupoTarjeta[]]) => {
        const tarjetaMap = new Map(tar.map(t => [t.id, t.nombre]))
        const grupoMap = new Map(gru.map(g => [g.id, g.nombre]))
        setItems((rec ?? []).map(r => ({
          ...r,
          tarjeta_nombre: tarjetaMap.get(r.tarjeta_id) ?? "—",
          grupo_nombre: grupoMap.get(r.grupo_id) ?? "—",
        })))
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<RecargoEnriquecido>
      title="Recargos de Tarjeta"
      moduleName="finanzas_recargos"
      monolithModule="finanzas"
      monolithView="recargos"
      monolithLabel="Nuevo Recargo"
      newHref="/finanzas/recargos/nuevo"
      editHref={r => `/finanzas/recargos/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        (r.tarjeta_nombre ?? "").toLowerCase().includes(q) ||
        (r.grupo_nombre ?? "").toLowerCase().includes(q)
      }
      rowKey={r => r.id}
      emptyText="No hay recargos configurados"
      columns={[
        { label: "Tarjeta", render: r => <span className="font-medium text-amber-900">{r.tarjeta_nombre}</span> },
        { label: "Grupo", render: r => <span className="text-gray-600">{r.grupo_nombre}</span> },
        { label: "Desde Cuota", align: "center", render: r => r.desde_cuota },
        { label: "Hasta Cuota", align: "center", render: r => r.hasta_cuota },
        { label: "Recargo %", align: "right", render: r => (
          <span className="font-mono text-indigo-700">{(r.recargo_pct ?? 0).toFixed(2)}%</span>
        ) },
        { label: "Sucursal", render: r => <span className="text-gray-500 text-xs">{r.sucursal ?? "Todas"}</span> },
      ]}
    />
  )
}
