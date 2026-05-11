"use client"

// Conciliación de Tarjetas — listado + detalle con cupones/cargos/rechazados.
//
// Esta versión es una migración directa del monolito al patrón "componente
// standalone" — sigue usando supabase desde el cliente (mismo modelo que el
// monolito). Una mejora futura sería mover la lógica a endpoints
// /api/conciliaciones-tarjetas/* pero hoy no bloquea nada.

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useERP } from "@/contexts/erp-context"
import {
  Check, Edit, Lock, Plus, Search, Trash2, X,
} from "lucide-react"
import {
  type CuponTarjeta, type ConciliacionTarjeta, type ConciliacionTarjetaCargo,
} from "./_shared"

export default function ConciliacionTarjetas() {
  const supabase = createClient()
  const { sucursales } = useERP()
  const sucActiva = sucursales.find(s => s.activa)?.nombre || ""

  const [lista, setLista] = useState<ConciliacionTarjeta[]>([])
  const [detalle, setDetalle] = useState<ConciliacionTarjeta | null>(null)
  const [form, setForm] = useState<Partial<ConciliacionTarjeta>>({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [cupones, setCupones] = useState<(CuponTarjeta & { conciliado?: boolean; rechazado?: boolean })[]>([])
  const [cargos, setCargos] = useState<ConciliacionTarjetaCargo[]>([])
  const [guardando, setGuardando] = useState(false)
  const [cuponesRechazados, setCuponesRechazados] = useState<CuponTarjeta[]>([])
  const [tabActivo, setTabActivo] = useState<"filtros" | "cupones" | "rechazados" | "cargos" | "observaciones">("cupones")
  const [busqueda, setBusqueda] = useState("")
  const [filtroSucs, setFiltroSucs] = useState<string[]>([])
  const [filtroDesde, setFiltroDesde] = useState("2000-01-01")
  const [filtroHasta, setFiltroHasta] = useState(new Date().toISOString().split("T")[0])
  const [cargoDesc, setCargoDesc] = useState("")
  const [cargoCuenta, setCargoCuenta] = useState("")
  const [cargoImporte, setCargoImporte] = useState(0)
  const [cargoImpuestos, setCargoImpuestos] = useState(0)

  useEffect(() => { cargarLista() }, [])

  const cargarLista = async () => {
    const { data } = await supabase.from("conciliaciones_tarjetas").select("*").order("created_at", { ascending: false })
    setLista(data || [])
  }

  const nuevaConciliacion = async () => {
    const { data: num } = await supabase.rpc("generar_numero_conciliacion_tarjeta", { p_sucursal: sucActiva })
    const nueva: Partial<ConciliacionTarjeta> = {
      numero: num,
      grupo_tarjeta: "",
      liquidacion: "",
      fecha: new Date().toISOString().split("T")[0],
      sucursal: sucActiva,
      estado: "borrador",
      observaciones: "",
    }
    const { data } = await supabase.from("conciliaciones_tarjetas").insert(nueva).select().single()
    if (data) {
      setDetalle(data)
      setForm(data)
      setModoEdicion(true)
      setCupones([])
      setCargos([])
      setCuponesRechazados([])
      setFiltroSucs(sucursales.filter(s => s.activa).map(s => s.nombre))
    }
  }

  const abrirDetalle = async (c: ConciliacionTarjeta) => {
    setDetalle(c)
    setForm(c)
    setModoEdicion(false)
    const { data: items } = await supabase.from("conciliacion_tarjeta_cupones").select("*, cupon:cupon_id(*)").eq("conciliacion_id", c.id)
    const cups = ((items as any[]) || []).map((it: any) => ({ ...it.cupon, conciliado: it.conciliado, rechazado: it.rechazado }))
    setCupones(cups)
    setCuponesRechazados(cups.filter((cp: any) => cp.rechazado))
    const { data: cgs } = await supabase.from("conciliacion_tarjeta_cargos").select("*").eq("conciliacion_id", c.id)
    setCargos(cgs || [])
  }

  const guardarCabecera = async () => {
    if (!detalle) return
    await supabase.from("conciliaciones_tarjetas").update({
      grupo_tarjeta: form.grupo_tarjeta,
      liquidacion: form.liquidacion,
      fecha: form.fecha,
      sucursal: form.sucursal,
      observaciones: form.observaciones,
    }).eq("id", detalle.id)
    setDetalle({ ...detalle, ...form } as ConciliacionTarjeta)
    setModoEdicion(false)
    cargarLista()
  }

  const cargarCuponesDisponibles = async () => {
    if (!detalle) return
    let query = supabase.from("cupones_tarjeta").select("*")
      .eq("estado", "en_cartera")
      .gte("fecha_ing_egr", filtroDesde)
      .lte("fecha_ing_egr", filtroHasta + "T23:59:59")
    if (filtroSucs.length > 0) query = query.in("sucursal", filtroSucs)
    const { data } = await query
    const existentes = cupones.map(c => c.id)
    const nuevos = (data || []).filter(c => !existentes.includes(c.id)).map(c => ({ ...c, conciliado: false, rechazado: false }))
    if (nuevos.length > 0 && detalle) {
      await supabase.from("conciliacion_tarjeta_cupones").insert(
        nuevos.map(c => ({ conciliacion_id: detalle.id, cupon_id: c.id, conciliado: false, rechazado: false })),
      )
    }
    setCupones([...cupones, ...nuevos])
    setTabActivo("cupones")
  }

  const toggleConciliado = async (cupon: CuponTarjeta & { conciliado?: boolean }) => {
    if (!detalle) return
    const nuevo = !cupon.conciliado
    await supabase.from("conciliacion_tarjeta_cupones").update({ conciliado: nuevo, rechazado: false }).eq("conciliacion_id", detalle.id).eq("cupon_id", cupon.id)
    await supabase.from("cupones_tarjeta").update({
      estado: nuevo ? "conciliado" : "en_cartera",
      fecha_conciliacion: nuevo ? new Date().toISOString() : null,
      conciliacion_id: nuevo ? detalle.id : null,
    }).eq("id", cupon.id)
    setCupones(cupones.map(c => c.id === cupon.id ? { ...c, conciliado: nuevo, rechazado: false, estado: nuevo ? "conciliado" : "en_cartera" } : c))
    recalcularImportes()
  }

  const toggleRechazado = async (cupon: CuponTarjeta & { rechazado?: boolean }) => {
    if (!detalle) return
    const nuevo = !cupon.rechazado
    await supabase.from("conciliacion_tarjeta_cupones").update({ rechazado: nuevo, conciliado: false }).eq("conciliacion_id", detalle.id).eq("cupon_id", cupon.id)
    await supabase.from("cupones_tarjeta").update({ estado: nuevo ? "rechazado" : "en_cartera", conciliacion_id: nuevo ? detalle.id : null }).eq("id", cupon.id)
    setCupones(cupones.map(c => c.id === cupon.id ? { ...c, rechazado: nuevo, conciliado: false, estado: nuevo ? "rechazado" : "en_cartera" } : c))
    setCuponesRechazados(nuevo ? [...cuponesRechazados, { ...cupon, rechazado: true }] : cuponesRechazados.filter(c => c.id !== cupon.id))
    recalcularImportes()
  }

  const conciliarTodos = async () => {
    if (!detalle) return
    for (const c of cupones.filter(c => !c.conciliado && !c.rechazado)) await toggleConciliado(c)
  }
  const desconciliarTodos = async () => {
    if (!detalle) return
    for (const c of cupones.filter(c => c.conciliado)) await toggleConciliado(c)
  }

  const recalcularImportes = () => {
    if (!detalle) return
    const impConc = cupones.filter(c => c.conciliado).reduce((a, c) => a + c.importe, 0)
    const impCargos = cargos.reduce((a, c) => a + c.total, 0)
    const impRech = cupones.filter(c => c.rechazado).reduce((a, c) => a + c.importe, 0)
    const updated = { ...detalle, importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech }
    setDetalle(updated)
    setForm(updated)
    supabase.from("conciliaciones_tarjetas").update({
      importe_conciliado: impConc,
      importe_cargos: impCargos,
      importe_total: impConc - impCargos,
      importe_cupones_rechazados: impRech,
    }).eq("id", detalle.id)
  }

  const agregarCargo = async () => {
    if (!detalle) return
    const total = cargoImporte + cargoImpuestos
    const { data } = await supabase.from("conciliacion_tarjeta_cargos").insert({
      conciliacion_id: detalle.id,
      descripcion: cargoDesc,
      cuenta_contable: cargoCuenta,
      importe: cargoImporte,
      impuestos: cargoImpuestos,
      total,
    }).select().single()
    if (data) {
      setCargos([...cargos, data])
      setCargoDesc("")
      setCargoCuenta("")
      setCargoImporte(0)
      setCargoImpuestos(0)
      recalcularImportes()
    }
  }

  const eliminarCargo = async (id: string) => {
    await supabase.from("conciliacion_tarjeta_cargos").delete().eq("id", id)
    setCargos(cargos.filter(c => c.id !== id))
    recalcularImportes()
  }

  const confirmarConciliacion = async () => {
    if (!detalle || guardando) return
    setGuardando(true)
    try {
      const impConc = cupones.filter(c => c.conciliado).reduce((a, c) => a + c.importe, 0)
      const impCargos = cargos.reduce((a, c) => a + c.total, 0)
      const impRech = cupones.filter(c => c.rechazado).reduce((a, c) => a + c.importe, 0)
      await supabase.from("conciliaciones_tarjetas").update({
        importe_conciliado: impConc,
        importe_cargos: impCargos,
        importe_total: impConc - impCargos,
        importe_cupones_rechazados: impRech,
        estado: "confirmado",
      }).eq("id", detalle.id)
      const updated = { ...detalle, importe_conciliado: impConc, importe_cargos: impCargos, importe_total: impConc - impCargos, importe_cupones_rechazados: impRech, estado: "confirmado" as const }
      setDetalle(updated)
      setForm(updated)
      cargarLista()
    } finally {
      setGuardando(false)
    }
  }

  // ── Detalle ──
  if (detalle) {
    const cuponesFiltered = busqueda
      ? cupones.filter(c =>
          (c.tarjeta_nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
          (c.numero_cupon || "").toLowerCase().includes(busqueda.toLowerCase()) ||
          (c.cliente_nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
      : cupones

    return (
      <div>
        <button onClick={() => { setDetalle(null); cargarLista() }} className="text-sm text-indigo-600 hover:underline mb-4 flex items-center gap-1">
          <X className="w-3 h-3" />Volver al listado
        </button>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-amber-900">{detalle.numero}</h2>
          <div className="flex gap-2">
            {detalle.estado === "borrador" && (
              <>
                <button onClick={conciliarTodos} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><Check className="w-4 h-4" />Conciliar Todos</button>
                <button onClick={desconciliarTodos} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1"><X className="w-4 h-4" />Desconciliar Todos</button>
                <button onClick={confirmarConciliacion} disabled={guardando} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1 disabled:opacity-50">
                  <Lock className="w-4 h-4" />{guardando ? "Procesando…" : "Confirmar"}
                </button>
              </>
            )}
            {!modoEdicion && detalle.estado === "borrador" && (
              <button onClick={() => setModoEdicion(true)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 flex items-center gap-1">
                <Edit className="w-4 h-4" />Editar
              </button>
            )}
            {modoEdicion && (
              <button onClick={guardarCabecera} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1">
                <Check className="w-4 h-4" />Guardar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4 bg-white border rounded-lg p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block">Grupo</label>
              {modoEdicion
                ? <input value={form.grupo_tarjeta || ""} onChange={e => setForm(f => ({ ...f, grupo_tarjeta: e.target.value }))} className="w-full border rounded px-3 py-1.5 text-sm" placeholder="Payway, Viumi, Nave, Getnet" />
                : <p className="text-sm font-medium">{detalle.grupo_tarjeta || "—"}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block">Liquidación</label>
              {modoEdicion
                ? <input value={form.liquidacion || ""} onChange={e => setForm(f => ({ ...f, liquidacion: e.target.value }))} className="w-full border rounded px-3 py-1.5 text-sm" />
                : <p className="text-sm font-medium">{detalle.liquidacion || "—"}</p>}
            </div>
            <div><label className="text-xs text-gray-500">Importe Conciliado</label><p className="text-sm font-medium">${detalle.importe_conciliado?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
            <div><label className="text-xs text-gray-500">Importe Cargos</label><p className="text-sm font-medium text-red-600">${detalle.importe_cargos?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
            <div><label className="text-xs text-gray-500">Importe Total</label><p className="text-sm font-bold">${detalle.importe_total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
            <div><label className="text-xs text-gray-500">Cupones Rechazados</label><p className="text-sm font-medium text-red-600">${detalle.importe_cupones_rechazados?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block">Fecha</label>
              {modoEdicion
                ? <input type="date" value={form.fecha || ""} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="w-full border rounded px-3 py-1.5 text-sm" />
                : <p className="text-sm font-medium">{detalle.fecha}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block">Sucursal</label>
              {modoEdicion
                ? <select value={form.sucursal || ""} onChange={e => setForm(f => ({ ...f, sucursal: e.target.value }))} className="w-full border rounded px-3 py-1.5 text-sm">
                    {sucursales.filter(s => s.activa).map(s => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                : <p className="text-sm font-medium">{detalle.sucursal}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500">Estado</label>
              <p className="text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detalle.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {detalle.estado === "confirmado" ? "Confirmado" : "Borrador"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b mb-4">
          {(["filtros", "cupones", "rechazados", "cargos", "observaciones"] as const).map(t => (
            <button key={t} onClick={() => setTabActivo(t)}
              className={`pb-2 text-sm font-medium capitalize ${tabActivo === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>
              {t === "rechazados" ? "Cupones Rechazados" : t}
            </button>
          ))}
        </div>

        {tabActivo === "filtros" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sucursales</h3>
              <div className="border rounded p-3 space-y-1">
                {filtroSucs.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={s} onChange={e => { const ns = [...filtroSucs]; ns[i] = e.target.value; setFiltroSucs(ns) }} className="flex-1 border rounded px-2 py-1 text-sm" />
                    <button onClick={() => setFiltroSucs(filtroSucs.filter((_, j) => j !== i))} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setFiltroSucs([...filtroSucs, ""])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" />Añadir
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500 block mb-1">Fecha Desde</label><input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
              <div><label className="text-sm text-gray-500 block mb-1">Fecha Hasta</label><input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={cargarCuponesDisponibles} className="px-4 py-2 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800">
              Aplicar filtros
            </button>
          </div>
        )}

        {tabActivo === "cupones" && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input placeholder="Buscar por tarjeta, cupón, cliente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-8 h-9 border rounded text-sm" />
            </div>
            {cuponesFiltered.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No hay cupones. Usá el tab Filtros para cargar cupones disponibles.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                      <th className="py-2 px-2">Tarjeta</th>
                      <th className="px-2">N° Cupón</th>
                      <th className="px-2">Fecha</th>
                      <th className="px-2">Cliente</th>
                      <th className="px-2">Forma de Pago</th>
                      <th className="px-2">Sucursal</th>
                      <th className="px-2 text-right">Importe</th>
                      <th className="px-2 text-center">Conc.</th>
                      <th className="px-2 text-center">Rech.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuponesFiltered.map(c => (
                      <tr key={c.id} className={`border-b ${c.conciliado ? "bg-green-50" : c.rechazado ? "bg-red-50" : ""}`}>
                        <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                        <td className="px-2">{c.numero_cupon || "—"}</td>
                        <td className="px-2">{c.fecha_ing_egr ? new Date(c.fecha_ing_egr).toLocaleDateString() : "—"}</td>
                        <td className="px-2">{c.cliente_nombre}</td>
                        <td className="px-2">{c.forma_pago_nombre}</td>
                        <td className="px-2">{c.sucursal}</td>
                        <td className="px-2 text-right font-medium">${c.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 text-center"><input type="checkbox" checked={!!c.conciliado} onChange={() => toggleConciliado(c)} disabled={detalle.estado === "confirmado"} className="rounded" /></td>
                        <td className="px-2 text-center"><input type="checkbox" checked={!!c.rechazado} onChange={() => toggleRechazado(c)} disabled={detalle.estado === "confirmado"} className="rounded" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tabActivo === "rechazados" && (
          cuponesRechazados.length === 0 ? <p className="text-center py-8 text-gray-400">No hay cupones rechazados</p> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                    <th className="py-2 px-2">Tarjeta</th>
                    <th className="px-2">N° Cupón</th>
                    <th className="px-2">Cliente</th>
                    <th className="px-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {cuponesRechazados.map(c => (
                    <tr key={c.id} className="border-b bg-red-50">
                      <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                      <td className="px-2">{c.numero_cupon || "—"}</td>
                      <td className="px-2">{c.cliente_nombre}</td>
                      <td className="px-2 text-right font-medium text-red-600">${c.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tabActivo === "cargos" && (
          <div>
            {detalle.estado === "borrador" && (
              <div className="flex gap-2 mb-3 items-end">
                <div className="flex-1"><label className="text-xs text-gray-500">Descripción</label><input value={cargoDesc} onChange={e => setCargoDesc(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-40"><label className="text-xs text-gray-500">Cuenta Contable</label><input value={cargoCuenta} onChange={e => setCargoCuenta(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-28"><label className="text-xs text-gray-500">Importe</label><input type="number" value={cargoImporte} onChange={e => setCargoImporte(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="w-28"><label className="text-xs text-gray-500">Impuestos</label><input type="number" value={cargoImpuestos} onChange={e => setCargoImpuestos(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <button onClick={agregarCargo} className="px-3 py-1.5 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" />Añadir</button>
              </div>
            )}
            {cargos.length === 0 ? <p className="text-center py-8 text-gray-400">No hay cargos registrados</p> : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                      <th className="py-2 px-2">Descripción</th>
                      <th className="px-2">Cuenta Contable</th>
                      <th className="px-2 text-right">Importe</th>
                      <th className="px-2 text-right">Impuestos</th>
                      <th className="px-2 text-right">Total</th>
                      {detalle.estado === "borrador" && <th className="px-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cargos.map(c => (
                      <tr key={c.id} className="border-b">
                        <td className="py-1.5 px-2">{c.descripcion}</td>
                        <td className="px-2">{c.cuenta_contable}</td>
                        <td className="px-2 text-right">${c.importe?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 text-right">${c.impuestos?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 text-right font-medium">${c.total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        {detalle.estado === "borrador" && (
                          <td className="px-2">
                            <button onClick={() => eliminarCargo(c.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tabActivo === "observaciones" && (
          <textarea
            value={form.observaciones || ""}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            onBlur={() => { if (detalle) supabase.from("conciliaciones_tarjetas").update({ observaciones: form.observaciones }).eq("id", detalle.id) }}
            className="w-full border rounded p-3 text-sm min-h-[120px]"
            placeholder="Observaciones..."
            disabled={detalle.estado === "confirmado"}
          />
        )}
      </div>
    )
  }

  // ── Lista ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-900">Conciliación de Tarjetas</h2>
        <button onClick={nuevaConciliacion} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2">
          <Plus className="w-4 h-4" />Nueva Conciliación
        </button>
      </div>
      {lista.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No hay conciliaciones de tarjetas registradas</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
                <th className="py-2 px-3">N°</th>
                <th className="px-3">Grupo</th>
                <th className="px-3">Liquidación</th>
                <th className="px-3">Fecha</th>
                <th className="px-3">Sucursal</th>
                <th className="px-3 text-right">Conciliado</th>
                <th className="px-3 text-right">Cargos</th>
                <th className="px-3 text-right">Total</th>
                <th className="px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => abrirDetalle(c)}>
                  <td className="py-2 px-3 font-medium text-indigo-600">{c.numero}</td>
                  <td className="px-3">{c.grupo_tarjeta || "—"}</td>
                  <td className="px-3">{c.liquidacion || "—"}</td>
                  <td className="px-3">{c.fecha}</td>
                  <td className="px-3">{c.sucursal}</td>
                  <td className="px-3 text-right">${c.importe_conciliado?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 text-right text-red-600">${c.importe_cargos?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 text-right font-medium">${c.importe_total?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.estado === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {c.estado === "confirmado" ? "Confirmado" : "Borrador"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
