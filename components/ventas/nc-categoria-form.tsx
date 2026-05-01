"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"

export default function NcCategoriaForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [nombre, setNombre] = useState("")
  const [activa, setActiva] = useState(true)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch("/api/nc-categorias")
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const cat = data.find(c => c.id === initialId)
          if (cat) {
            setNombre(cat.nombre ?? "")
            setActiva(cat.activa ?? true)
          } else {
            setErrorCarga("Categoría no encontrada")
          }
        }
        setCargando(false)
      })
      .catch(() => {
        setErrorCarga("Error de red")
        setCargando(false)
      })
  }, [isEdit, initialId])

  const guardar = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit && initialId ? `/api/nc-categorias/${initialId}` : "/api/nc-categorias",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: nombre.trim(), activa }),
        }
      )
      if (!res.ok) {
        const text = await res.text()
        setError(`Error: ${text}`)
        setGuardando(false)
        return
      }
      router.push("/ventas/nc-categorias")
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
        <button onClick={() => router.push("/ventas/nc-categorias")} className="text-indigo-700 hover:underline">
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">
            {isEdit ? "Editar Categoría de NC" : "Nueva Categoría de NC"}
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
