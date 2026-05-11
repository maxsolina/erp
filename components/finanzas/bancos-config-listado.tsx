"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { type Banco, type CuentaBancaria, type TipoMovimientoBancario } from "./_shared"

type SubVista = "cuentas" | "bancos" | "tipos"

const editarEnMonolitoHref = "/?module=finanzas&view=bancos_config"

const HREF_BANCOS_NUEVO = "/finanzas/bancos-config/bancos/nuevo"
const hrefBancoEditar = (id: string) => `/finanzas/bancos-config/bancos/${id}/editar`
const HREF_CUENTAS_NUEVA = "/finanzas/bancos-config/cuentas/nueva"
const hrefCuentaEditar = (id: string) => `/finanzas/bancos-config/cuentas/${id}/editar`
const HREF_TIPOS_MOV_NUEVO = "/finanzas/bancos-config/tipos-mov/nuevo"
const hrefTipoMovEditar = (id: string) => `/finanzas/bancos-config/tipos-mov/${id}/editar`

const checkIcon = (val: boolean) =>
  val ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>

export default function BancosConfigListado() {
  const [subVista, setSubVista] = useState<SubVista>("cuentas")

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
        <h1 className="text-2xl font-bold text-amber-900">Bancos</h1>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 mb-6 w-fit">
        {([
          { id: "cuentas" as const, label: "Cuentas Bancarias" },
          { id: "bancos" as const, label: "Bancos" },
          { id: "tipos" as const, label: "Tipos de Movimiento" },
        ]).map(item => (
          <button
            key={item.id}
            onClick={() => setSubVista(item.id)}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              subVista === item.id ? "bg-indigo-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {subVista === "cuentas" && <CuentasBancariasTabla />}
      {subVista === "bancos" && <BancosTabla />}
      {subVista === "tipos" && <TiposMovimientoTabla />}
    </div>
  )
}

function CuentasBancariasTabla() {
  const [items, setItems] = useState<CuentaBancaria[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/cuentas-bancarias?incluir_inactivos=1")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.numero_cuenta.toLowerCase().includes(q) ||
          (c.banco_nombre ?? "").toLowerCase().includes(q) ||
          (c.propietario ?? "").toLowerCase().includes(q) ||
          (c.cbu ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(c => String(c[f.field as keyof CuentaBancaria] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const monedas = [...new Set(items.map(c => c.moneda).filter(Boolean))]
    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activa" },
          { value: "false", label: "Inactiva" },
        ],
      },
      {
        field: "moneda",
        label: "Moneda",
        values: monedas.map(m => ({ value: m, label: m })),
      },
      {
        field: "tipo_cuenta",
        label: "Tipo",
        values: [
          { value: "cuenta_corriente", label: "Cuenta Corriente" },
          { value: "caja_ahorro", label: "Caja de Ahorro" },
        ],
      },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={HREF_CUENTAS_NUEVA}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Cuenta Bancaria
        </Link>
      </div>

      <OdooFilterBar
        moduleName="finanzas_cuentas_bancarias"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "banco_nombre", label: "Banco", field: "banco_nombre" },
          { id: "moneda", label: "Moneda", field: "moneda" },
        ]}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">N° Cuenta</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Banco</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Propietario</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-0">
                  <Link href={hrefCuentaEditar(c.id)} className="block py-3 px-4 font-mono text-sm text-indigo-900 font-medium">
                    {c.numero_cuenta}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm">
                    {c.banco_nombre || "—"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-semibold">{c.moneda}</span>
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm text-gray-600">
                    {c.tipo_cuenta === "cuenta_corriente" ? "Cuenta Corriente" : "Caja de Ahorro"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm text-gray-600">
                    {c.propietario || "—"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No hay cuentas bancarias</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BancosTabla() {
  const [items, setItems] = useState<Banco[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/bancos?incluir_inactivos=1")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        b =>
          b.nombre.toLowerCase().includes(q) ||
          b.codigo.toLowerCase().includes(q) ||
          (b.email ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(b => String(b[f.field as keyof Banco] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activo" },
          { value: "false", label: "Inactivo" },
        ],
      },
    ]
  }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={HREF_BANCOS_NUEVO}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Banco
        </Link>
      </div>

      <OdooFilterBar
        moduleName="finanzas_bancos"
        filterOptions={filterOptions}
        groupByOptions={[]}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Dirección</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(b => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 font-mono text-sm text-gray-500">
                    {b.codigo}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 font-medium text-sm text-amber-900">
                    {b.nombre}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm text-gray-600">
                    {b.direccion || "—"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm text-gray-600">
                    {b.telefono || "—"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-sm text-gray-600">
                    {b.email || "—"}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {b.activo ? "Activo" : "Inactivo"}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No hay bancos configurados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TiposMovimientoTabla() {
  const [items, setItems] = useState<TipoMovimientoBancario[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/tipos-movimiento-bancario?incluir_inactivos=1")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        t =>
          t.nombre.toLowerCase().includes(q) ||
          t.codigo_causal.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(t => String(t[f.field as keyof TipoMovimientoBancario] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activo" },
          { value: "false", label: "Inactivo" },
        ],
      },
      {
        field: "disponible_en_pagos",
        label: "Disponible en Pagos",
        values: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
      {
        field: "disponible_en_cobros",
        label: "Disponible en Cobros",
        values: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
    ]
  }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link
          href={HREF_TIPOS_MOV_NUEVO}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Tipo
        </Link>
      </div>

      <OdooFilterBar
        moduleName="finanzas_tipos_mov_bancario"
        filterOptions={filterOptions}
        groupByOptions={[]}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Chq. Dif.</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Chq. Corr.</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Pagos</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Cobros</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Finanzas</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 font-medium text-sm text-amber-900">
                    {t.nombre}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 font-mono text-sm text-gray-500">
                    {t.codigo_causal}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-3 text-center">
                    {checkIcon(t.emite_cheques_diferidos)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-3 text-center">
                    {checkIcon(t.emite_cheques_corrientes)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-3 text-center">
                    {checkIcon(t.disponible_en_pagos)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-3 text-center">
                    {checkIcon(t.disponible_en_cobros)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-3 text-center">
                    {checkIcon(t.disponible_en_finanzas)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={editarEnMonolitoHref} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400 text-sm">No hay tipos de movimiento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
