"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"

interface Cuenta { id: string; codigo: string; nombre: string }
interface ListaPrecios { id: number; nombre: string; activa?: boolean }

export default function CategoriaClienteForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [listas, setListas] = useState<ListaPrecios[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [listaPreciosDefectoId, setListaPreciosDefectoId] = useState<number | null>(null)
  const [cuentaCobrarId, setCuentaCobrarId] = useState<string>("")
  const [activa, setActiva] = useState(true)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/contabilidad/cuentas").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios").then(r => r.json()).catch(() => []),
      isEdit && initialId
        ? fetch("/api/categorias-cliente").then(r => r.json()).catch(() => [])
        : Promise.resolve(null),
    ]).then(([cuentasData, listasData, cats]) => {
      if (!activo) return
      if (Array.isArray(cuentasData)) {
        setCuentas(cuentasData.map((c: any) => ({ id: c.id, codigo: c.codigo ?? "", nombre: c.nombre ?? "" })))
      }
      if (Array.isArray(listasData)) setListas(listasData)
      if (cats && Array.isArray(cats)) {
        const cat = cats.find((c: any) => c.id === initialId)
        if (cat) {
          setNombre(cat.nombre ?? "")
          setDescripcion(cat.descripcion ?? "")
          setListaPreciosDefectoId(cat.lista_precios_defecto_id ?? null)
          setCuentaCobrarId(cat.cuenta_cobrar_id ?? "")
          setActiva(cat.activa ?? true)
        } else if (isEdit) {
          setErrorCarga("Categoría no encontrada")
        }
      }
      setCargando(false)
    })
    return () => { activo = false }
  }, [isEdit, initialId])

  const guardar = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        lista_precios_defecto_id: listaPreciosDefectoId,
        cuenta_cobrar_id: cuentaCobrarId || null,
        activa,
      }
      const res = await fetch(
        isEdit && initialId ? `/api/categorias-cliente/${initialId}` : "/api/categorias-cliente",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const text = await res.text()
        setError(`Error: ${text}`)
        setGuardando(false)
        return
      }
      router.push("/ventas/categorias-cliente")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/ventas/categorias-cliente")} className="text-indigo-700 hover:underline">
          Volver
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">
            {isEdit ? "Editar Categoría de Cliente" : "Nueva Categoría de Cliente"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !nombre.trim()}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
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

      <div className="bg-white rounded-lg border p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            autoFocus
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <input
            type="text"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lista de precios por defecto</label>
            <select
              value={listaPreciosDefectoId ?? ""}
              onChange={e => setListaPreciosDefectoId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin lista asignada</option>
              {listas.filter(l => l.activa !== false).map(l => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta a cobrar (contable)</label>
            <select
              value={cuentaCobrarId}
              onChange={e => setCuentaCobrarId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin cuenta asignada</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={activa}
            onChange={e => setActiva(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Activa</span>
        </label>
      </div>
    </div>
  )
}
