"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList } from "./config-list-shell"

interface ValorCaja {
  id: string
  caja_id: string
  codigo: string | null
  nombre: string
  tipo: string
  moneda: string
  banco_permitido_id: string | null
  activo: boolean
  cajas?: { nombre: string; sucursal: string | null } | null
}

export default function ValoresCajaListado() {
  const [items, setItems] = useState<ValorCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/caja-valores")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Solo valores físicos de efectivo — bancos (banco_permitido_id) y
          // cheques no aparecen acá: tienen su propio listado en Diarios.
          setItems(data.filter((v: ValorCaja) => v.tipo === "efectivo" && !v.banco_permitido_id))
        }
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ValorCaja>
      title="Valores de Caja"
      moduleName="contabilidad_valores_caja"
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) =>
        r.nombre.toLowerCase().includes(q)
        || (r.codigo ?? "").toLowerCase().includes(q)
        || (r.cajas?.nombre ?? "").toLowerCase().includes(q)
      }
      filterOptions={[
        {
          field: "moneda",
          label: "Moneda",
          values: [
            { value: "ARS", label: "ARS" },
            { value: "USD", label: "USD" },
          ],
        },
      ]}
      rowFilter={(r, fs) => fs.every(f => String(r[f.field as keyof ValorCaja] ?? "") === f.value)}
      rowKey={r => r.id}
      editHref={r => `/contabilidad/valores-caja/${r.id}/editar`}
      emptyText="No hay valores de caja"
      columns={[
        { label: "Caja", render: r => <span className="font-medium text-amber-900">{r.cajas?.nombre ?? "—"}</span> },
        { label: "Sucursal", render: r => <span className="text-xs text-gray-500">{r.cajas?.sucursal ?? "—"}</span> },
        { label: "Código", render: r => <span className="font-mono text-indigo-700 text-xs">{r.codigo ?? "—"}</span> },
        { label: "Nombre", render: r => <span className="text-gray-700">{r.nombre}</span> },
        { label: "Moneda", align: "center", render: r => <span className="font-mono text-xs">{r.moneda}</span> },
        { label: "Activo", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Sí" : "No"}
          </span>
        ) },
      ]}
    />
  )
}
