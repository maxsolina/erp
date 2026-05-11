"use client"

import { useEffect, useState } from "react"
import { ContabilidadConfigList, filtroActivoEstandar, rowFilterDefault } from "@/components/contabilidad/config-list-shell"
import { type ConceptoRegistroCaja } from "./_shared"

const check = (val: boolean) =>
  val ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>

export default function ConceptosListado() {
  const [items, setItems] = useState<ConceptoRegistroCaja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/conceptos-registro-caja?incluir_inactivos=1")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  return (
    <ContabilidadConfigList<ConceptoRegistroCaja>
      title="Conceptos"
      eyebrow="Configuración"
      moduleName="finanzas_conceptos"
      monolithModule="finanzas"
      monolithView="conceptos"
      monolithLabel="Nuevo Concepto"
      newHref="/finanzas/conceptos/nueva"
      editHref={r => `/finanzas/conceptos/${r.id}/editar`}
      data={items}
      cargando={cargando}
      searchTerm={search}
      onSearchChange={setSearch}
      searchFilter={(r, q) => (r.codigo ?? "").toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q)}
      rowFilter={rowFilterDefault}
      filterOptions={[filtroActivoEstandar]}
      rowKey={r => r.id}
      emptyText="No hay conceptos configurados"
      columns={[
        { label: "Código", render: r => <span className="font-mono text-gray-500">{r.codigo}</span> },
        { label: "Nombre", render: r => <span className="font-medium text-amber-900">{r.nombre}</span> },
        { label: "Aj. Caja", align: "center", render: r => check(r.visible_en_ajuste_cajas) },
        { label: "Aj. Banco", align: "center", render: r => check(r.visible_en_ajuste_banco) },
        { label: "Reg. Caja", align: "center", render: r => check(r.visible_en_caja) },
        { label: "Reg. Banco", align: "center", render: r => check(r.visible_en_banco) },
        { label: "Transf.", align: "center", render: r => check(r.visible_en_transferencias) },
        { label: "Req. Obs.", align: "center", render: r => check(r.requiere_observacion) },
        { label: "Estado", align: "center", render: r => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {r.activo ? "Activo" : "Inactivo"}
          </span>
        ) },
      ]}
    />
  )
}
