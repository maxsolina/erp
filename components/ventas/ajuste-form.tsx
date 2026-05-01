"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"

interface ClienteOpt { id: number; codigo?: string; nombre: string }
interface NcCategoria { id: number; nombre: string; activa: boolean }

interface Linea {
  descripcion: string
  fecha_vencimiento: string
  importe: number
}

export type TipoAjuste = "ajuste" | "nota_credito" | "nota_debito"

const LABELS: Record<TipoAjuste, { titulo: string; back: string; subtitulo: string; sugerencia: string }> = {
  ajuste: {
    titulo: "Nuevo Ajuste de Cliente",
    back: "/ventas/ajustes",
    subtitulo: "Use importes negativos para crédito al cliente",
    sugerencia: "Ajuste manual del saldo del cliente",
  },
  nota_credito: {
    titulo: "Nueva Nota de Crédito",
    back: "/ventas/nc",
    subtitulo: "Devolución / bonificación al cliente (importes positivos)",
    sugerencia: "Bonificación, devolución, error en factura",
  },
  nota_debito: {
    titulo: "Nueva Nota de Débito",
    back: "/ventas/nd",
    subtitulo: "Cargo adicional al cliente (importes positivos)",
    sugerencia: "Intereses, gasto administrativo, error en factura",
  },
}

export default function AjusteForm({ tipo }: { tipo: TipoAjuste }) {
  const router = useRouter()
  const { sucursalActiva } = useERP()
  const labels = LABELS[tipo]

  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [categorias, setCategorias] = useState<NcCategoria[]>([])
  const [cargando, setCargando] = useState(true)

  const [clienteId, setClienteId] = useState<number | null>(null)
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")
  const [categoria, setCategoria] = useState<string>("")
  const [concepto, setConcepto] = useState("")
  const [lineas, setLineas] = useState<Linea[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/nc-categorias").then(r => r.json()).catch(() => []),
    ]).then(([cl, cat]) => {
      if (!activo) return
      if (Array.isArray(cl)) setClientes(cl)
      // categorias-cliente devuelve las del NC/ND también (compartidas)
      if (Array.isArray(cat)) setCategorias(cat.filter((c: any) => c.activa !== false))
      setCargando(false)
    })
    return () => { activo = false }
  }, [])

  const totalAjuste = lineas.reduce((s, l) => s + (l.importe || 0), 0)
  const cliente = clientes.find(c => c.id === clienteId)

  const guardar = async () => {
    if (!cliente) { setError("Debe seleccionar un cliente"); return }
    if (lineas.length === 0) { setError("Agregá al menos una línea"); return }
    if (!concepto.trim()) { setError("El concepto es obligatorio"); return }
    if (guardando) return
    setError(null)
    setGuardando(true)

    try {
      const res = await fetch("/api/ajustes-clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          tipo: tipo === "nota_debito" ? "nota_debito" : "nota_credito",
          estado: "publicado",
          fecha: new Date().toISOString(),
          concepto,
          moneda,
          nota_venta_numero: null,
          sucursal_id: sucursalActiva?.id ?? null,
          categoria: categoria || null,
          lineas,
          total: totalAjuste,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error al guardar (HTTP ${res.status}): ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      const id = data.id
      // Redirigir a la ficha correcta según tipo
      const fichaPath =
        tipo === "nota_credito" ? `/ventas/nc/${id}`
        : tipo === "nota_debito" ? `/ventas/nd/${id}`
        : `/ventas/ajustes/${id}`
      router.push(fichaPath)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const agregarLinea = () => {
    setLineas([...lineas, { descripcion: "", fecha_vencimiento: new Date().toISOString().split("T")[0], importe: 0 }])
  }

  const quitarLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx))

  const updateLinea = (idx: number, patch: Partial<Linea>) =>
    setLineas(lineas.map((l, i) => i === idx ? { ...l, ...patch } : l))

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(labels.back)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{labels.titulo}</h1>
            <p className="text-sm text-gray-500">{labels.subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(labels.back)}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !clienteId || lineas.length === 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              value={clienteId ?? ""}
              onChange={e => setClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar cliente…</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value as "ARS" | "USD")}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ARS">ARS — Pesos</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
          <input
            type="text"
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            placeholder={labels.sugerencia}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
            <span className="font-medium text-sm">Líneas</span>
            <button
              type="button"
              onClick={agregarLinea}
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar línea
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-3">Descripción</th>
                <th className="text-left py-2 px-3 w-40">Fecha venc.</th>
                <th className="text-right py-2 px-3 w-40">Importe</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={linea.descripcion}
                      onChange={e => updateLinea(idx, { descripcion: e.target.value })}
                      placeholder="Descripción"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="date"
                      value={linea.fecha_vencimiento}
                      onChange={e => updateLinea(idx, { fecha_vencimiento: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={linea.importe}
                      step={0.01}
                      onChange={e => updateLinea(idx, { importe: parseFloat(e.target.value) || 0 })}
                      placeholder={tipo === "ajuste" ? "Negativo para crédito" : "Importe"}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => quitarLinea(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                    Sin líneas. {tipo === "ajuste" && "Use importes negativos para créditos a favor del cliente."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className={`text-lg font-bold ${totalAjuste < 0 ? "text-red-600" : "text-emerald-700"}`}>
            Total: {formatCurrency(totalAjuste, moneda)}
          </span>
          <span className="text-sm text-gray-500">
            {totalAjuste < 0 ? "(Crédito a favor del cliente)" : "(Débito al cliente)"}
          </span>
        </div>
      </div>
    </div>
  )
}
