"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import {
  createCategoriaProveedor,
  updateCategoriaProveedor,
} from "@/lib/categorias-proveedor-actions"

interface CuentaPlanContable {
  id: string
  codigo: string
  nombre: string
}

export default function CategoriaProveedorForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [cuentas, setCuentas] = useState<CuentaPlanContable[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [nombre, setNombre] = useState("")
  const [disponibleClientes, setDisponibleClientes] = useState(true)
  const [disponibleProveedores, setDisponibleProveedores] = useState(true)
  const [tipoControl, setTipoControl] = useState("estandar")
  const [cuentaCobrarDefecto, setCuentaCobrarDefecto] = useState("")
  const [cuentaPagarDefecto, setCuentaPagarDefecto] = useState("")
  const [cuentaCobrarId, setCuentaCobrarId] = useState<string>("")
  const [cuentaPagarId, setCuentaPagarId] = useState<string>("")
  const [requiereOcParaFacturar, setRequiereOcParaFacturar] = useState(false)
  const [comprobantesConfidenciales, setComprobantesConfidenciales] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/contabilidad/cuentas").then(r => r.json()).catch(() => []),
      isEdit && initialId
        ? fetch(`/api/categorias-proveedor`).then(r => r.json()).catch(() => [])
        : Promise.resolve(null),
    ]).then(([cuentasData, catsData]) => {
      if (!activo) return
      if (Array.isArray(cuentasData)) {
        setCuentas(cuentasData.map((c: any) => ({
          id: c.id, codigo: c.codigo ?? "", nombre: c.nombre ?? "",
        })))
      }
      if (catsData && Array.isArray(catsData)) {
        const cat = catsData.find((c: any) => c.id === initialId)
        if (cat) {
          setNombre(cat.nombre ?? "")
          setDisponibleClientes(!!cat.disponible_clientes)
          setDisponibleProveedores(!!cat.disponible_proveedores)
          setTipoControl(cat.tipo_control ?? "estandar")
          setCuentaCobrarDefecto(cat.cuenta_cobrar_defecto ?? "")
          setCuentaPagarDefecto(cat.cuenta_pagar_defecto ?? "")
          setCuentaCobrarId(cat.cuenta_cobrar_id ?? "")
          setCuentaPagarId(cat.cuenta_pagar_id ?? "")
          setRequiereOcParaFacturar(!!cat.requiere_oc_para_facturar)
          setComprobantesConfidenciales(!!cat.comprobantes_confidenciales)
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
        disponible_clientes: disponibleClientes,
        disponible_proveedores: disponibleProveedores,
        tipo_control: tipoControl,
        cuenta_cobrar_defecto: cuentaCobrarDefecto,
        cuenta_pagar_defecto: cuentaPagarDefecto,
        cuenta_cobrar_id: cuentaCobrarId || null,
        cuenta_pagar_id: cuentaPagarId || null,
        requiere_oc_para_facturar: requiereOcParaFacturar,
        comprobantes_confidenciales: comprobantesConfidenciales,
      }
      if (isEdit && initialId) {
        await updateCategoriaProveedor(initialId, payload)
      } else {
        await createCategoriaProveedor(payload as any)
      }
      router.push("/compras/categorias-proveedores")
    } catch (e: any) {
      setError(`Error al guardar: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/compras/categorias-proveedores")} className="text-indigo-700 hover:underline">
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
            {isEdit ? `Editar Categoría` : "Nueva Categoría de Proveedor"}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            autoFocus
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta a pagar (contable)</label>
            <select
              value={cuentaPagarId}
              onChange={e => {
                const id = e.target.value
                setCuentaPagarId(id)
                const c = cuentas.find(x => x.id === id)
                setCuentaPagarDefecto(c ? `${c.codigo} ${c.nombre}` : "")
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin cuenta asignada</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Se asigna automáticamente a las líneas de Factura de Compra de proveedores con esta categoría.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta a cobrar (contable)</label>
            <select
              value={cuentaCobrarId}
              onChange={e => {
                const id = e.target.value
                setCuentaCobrarId(id)
                const c = cuentas.find(x => x.id === id)
                setCuentaCobrarDefecto(c ? `${c.codigo} ${c.nombre}` : "")
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin cuenta asignada</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Para categorías de cliente (si la categoría se reusa para clientes).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={requiereOcParaFacturar}
              onChange={e => setRequiereOcParaFacturar(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Requiere OC para facturar</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={comprobantesConfidenciales}
              onChange={e => setComprobantesConfidenciales(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Comprobantes confidenciales</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={disponibleProveedores}
              onChange={e => setDisponibleProveedores(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Disponible para proveedores</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={disponibleClientes}
              onChange={e => setDisponibleClientes(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Disponible para clientes</span>
          </label>
        </div>
      </div>
    </div>
  )
}
