"use client"

// Extraído de components/ventas-module.tsx → renderDetalleListaPrecios (~13781-14091),
// modo lectura. La parte de edición se movió a `formulario.tsx`.
//
// El componente original combinaba lectura + edición + creación con flags
// (selectedListaPrecios, modoEdicionListaPrecios, creandoListaPrecios). Acá esto se
// resuelve con rutas: la ficha es solo lectura, "Editar" navega a /editar y "Nueva"
// navega a /nueva. El comportamiento de campos visibles y de la tabla de versiones
// se mantiene tal cual.
//
// Modal "Crear versión basada en otra" se preserva con su lógica intacta
// (POST /api/listas-precios/versiones), incluyendo el flag copiar_lineas.

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Plus, Edit, AlertCircle, CheckCircle, X, Copy } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import { useERP } from "@/contexts/erp-context"
import SeguimientoPanel from "./seguimiento-panel"
import {
  normalizarLista,
  type ListaPrecios,
  type VersionListaPrecios,
  type UsuarioVendedor,
} from "./_shared"

type TabId = "versiones" | "filtros" | "usuarios_admin" | "usuarios_habilitados"

export default function ListaPreciosFicha({ listaId }: { listaId: number }) {
  const router = useRouter()
  const { currentUser } = useERP()

  const [lista, setLista] = useState<ListaPrecios | null>(null)
  const [todasLasListas, setTodasLasListas] = useState<ListaPrecios[]>([])
  const [versiones, setVersiones] = useState<VersionListaPrecios[]>([])
  const [vendedores, setVendedores] = useState<UsuarioVendedor[]>([])
  const [tab, setTab] = useState<TabId>("versiones")

  // Modal "Crear versión basada en otra"
  const [modalNuevaVersionBasada, setModalNuevaVersionBasada] = useState(false)
  const [versionBase, setVersionBase] = useState<VersionListaPrecios | null>(null)
  const [nuevaVersionBasadaForm, setNuevaVersionBasadaForm] = useState({
    nombre: "",
    fecha_inicial: "",
    fecha_final: "",
    copiar_lineas: true,
  })

  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapeadas = data.map(normalizarLista)
          setTodasLasListas(mapeadas)
          const found = mapeadas.find(l => l.id === listaId) ?? null
          setLista(found)
        }
      })
      .catch(() => {})
  }, [listaId])

  useEffect(() => {
    fetch(`/api/listas-precios/versiones?lista_id=${listaId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVersiones(data)
      })
      .catch(() => {})
  }, [listaId])

  // Cargar vendedores para mostrar nombres en tabs usuarios_admin / usuarios_habilitados
  useEffect(() => {
    fetch("/api/vendedores")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVendedores(data)
      })
      .catch(() => {})
  }, [])

  const versionesDeLista = versiones
  const versionesCount = versionesDeLista.length

  // Navegación prev/next por id, dentro del orden global de listas
  const { prevLista, nextLista } = useMemo(() => {
    if (!lista) return { prevLista: null, nextLista: null }
    const currentIndex = todasLasListas.findIndex(l => l.id === lista.id)
    return {
      prevLista: currentIndex > 0 ? todasLasListas[currentIndex - 1] : null,
      nextLista:
        currentIndex >= 0 && currentIndex < todasLasListas.length - 1 ? todasLasListas[currentIndex + 1] : null,
    }
  }, [lista, todasLasListas])

  if (!lista) {
    return <div className="p-6 text-gray-500 text-sm">Cargando lista de precios...</div>
  }

  const crearVersionBasadaEnOtra = async (vBase: VersionListaPrecios) => {
    const fechaActual = new Date().toISOString()
    const usuario = (currentUser as any)?.nombre || "Sistema"
    const payload = {
      lista_precios_id: vBase.lista_precios_id,
      lista_precios_nombre: vBase.lista_precios_nombre,
      nombre: nuevaVersionBasadaForm.nombre || `Copia de ${vBase.nombre}`,
      fecha_inicial: nuevaVersionBasadaForm.fecha_inicial || new Date().toISOString().split("T")[0],
      fecha_final: nuevaVersionBasadaForm.fecha_final || null,
      activa: false,
      estado: "borrador",
      ultima_actualizacion: fechaActual,
      lineas: nuevaVersionBasadaForm.copiar_lineas ? vBase.lineas.map(l => ({ ...l, id: 0 })) : [],
      seguimiento: [
        {
          id: 1,
          fecha: fechaActual,
          usuario,
          tipo: "creacion" as const,
          descripcion: `Versión creada basada en "${vBase.nombre}"`,
        },
      ],
    }
    try {
      const res = await fetch("/api/listas-precios/versiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const nuevaVersion: VersionListaPrecios = await res.json()
        setVersiones(prev => [nuevaVersion, ...prev])
      }
    } catch (e) {
      console.error("[crearVersionBasadaEnOtra] error:", e)
    }
    setModalNuevaVersionBasada(false)
    setVersionBase(null)
    setNuevaVersionBasadaForm({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/listas-precios" className="hover:text-emerald-600">
          Listas de Precios
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{lista.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
        <BotonVolver onClick={() => router.push("/listas-precios")} />

        <div className="flex items-center gap-2">
          <Link
            href={`/listas-precios/${lista.id}/editar`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" /> Editar
          </Link>
          <button
            onClick={() => prevLista && router.push(`/listas-precios/${prevLista.id}`)}
            disabled={!prevLista}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={() => nextLista && router.push(`/listas-precios/${nextLista.id}`)}
            disabled={!nextLista}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Banner Archivada */}
      {lista.activa === false && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Esta lista está <strong>archivada</strong> y no aparece en los formularios de venta. Reactivala marcando
            "Activa" en el formulario.
          </span>
        </div>
      )}

      {/* Datos */}
      <div className="bg-white border border-gray-200 rounded p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <p className="text-gray-900 py-2 font-medium text-lg">{lista.nombre}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
            <p className="text-gray-900 py-2">{lista.moneda_base}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de Validez</label>
            <p className="text-gray-900 py-2">{lista.dias_validez} días</p>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              title="Cotización a aplicar al convertir USD↔ARS en los comprobantes que usen esta lista"
            >
              Tipo de Cotización
            </label>
            <p className="text-gray-900 py-2 capitalize">{lista.tipo_cotizacion ?? "blue"}</p>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <span className={`text-sm ${lista.activa !== false ? "text-green-600" : "text-gray-400"}`}>
              {lista.activa !== false ? "Activa" : "Archivada"}
            </span>
            {lista.no_visible && <span className="text-sm text-gray-400">(No visible)</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex gap-4">
            {[
              { id: "versiones" as const, label: `Versiones (${versionesCount})` },
              { id: "filtros" as const, label: "Filtros" },
              { id: "usuarios_admin" as const, label: "Usuarios Admin" },
              { id: "usuarios_habilitados" as const, label: "Usuarios Habilitados" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === "versiones" && (
          <div>
            <div className="flex justify-end mb-4">
              <Link
                href={`/listas-precios/${lista.id}/versiones/nueva`}
                className="flex items-center gap-2 bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800"
              >
                <Plus className="w-4 h-4" /> Nueva Versión
              </Link>
            </div>
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-3 font-medium">Nombre</th>
                    <th className="text-center py-2 px-3 font-medium">Fecha Inicial</th>
                    <th className="text-center py-2 px-3 font-medium">Fecha Final</th>
                    <th className="text-center py-2 px-3 font-medium">Líneas</th>
                    <th className="text-center py-2 px-3 font-medium">Última Actualización</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {versionesDeLista.map((version, idx) => {
                    const rowCls = `border-b border-gray-100 hover:bg-gray-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`
                    const hrefVer = `/listas-precios/${lista.id}/versiones/${version.id}`
                    return (
                      <tr key={version.id} className={rowCls}>
                        <td className="p-0">
                          <Link href={hrefVer} className="block py-2 px-3 font-medium text-gray-900">
                            {version.nombre}
                          </Link>
                        </td>
                        <td className="p-0">
                          <Link href={hrefVer} className="block py-2 px-3 text-center text-gray-600">
                            {new Date(version.fecha_inicial).toLocaleDateString("es-AR")}
                          </Link>
                        </td>
                        <td className="p-0">
                          <Link href={hrefVer} className="block py-2 px-3 text-center text-gray-600">
                            {version.fecha_final
                              ? new Date(version.fecha_final).toLocaleDateString("es-AR")
                              : "-"}
                          </Link>
                        </td>
                        <td className="p-0">
                          <Link href={hrefVer} className="block py-2 px-3 text-center text-gray-600">
                            {version.lineas.length}
                          </Link>
                        </td>
                        <td className="p-0">
                          <Link href={hrefVer} className="block py-2 px-3 text-center text-gray-500 text-xs">
                            {new Date(version.ultima_actualizacion).toLocaleString("es-AR")}
                          </Link>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setVersionBase(version)
                              setModalNuevaVersionBasada(true)
                            }}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            title="Crear versión basada en esta"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {versionesDeLista.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No hay versiones para esta lista
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "filtros" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones / Filtros</label>
            <p className="text-gray-600 bg-gray-50 p-3 rounded">{lista.observaciones_filtro || "Sin observaciones"}</p>
          </div>
        )}

        {tab === "usuarios_admin" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Usuarios con permisos de administración de esta lista.</p>
            <div className="space-y-2">
              {vendedores.map(u => (
                <label key={u.id} className="flex items-center gap-2">
                  {lista.usuarios_admin.includes(u.id) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className="text-sm text-gray-700">{u.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === "usuarios_habilitados" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Usuarios habilitados para usar esta lista en presupuestos/ventas.</p>
            <div className="space-y-2">
              {vendedores.map(u => (
                <label key={u.id} className="flex items-center gap-2">
                  {lista.usuarios_habilitados.includes(u.id) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className="text-sm text-gray-700">{u.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {lista.seguimiento && <SeguimientoPanel seguimiento={lista.seguimiento} />}
      </div>

      {/* Modal Nueva Versión Basada */}
      {modalNuevaVersionBasada && versionBase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Crear versión basada en "{versionBase.nombre}"
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la nueva versión</label>
                <input
                  type="text"
                  value={nuevaVersionBasadaForm.nombre}
                  onChange={e => setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                  placeholder={`Copia de ${versionBase.nombre}`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
                  <input
                    type="date"
                    value={nuevaVersionBasadaForm.fecha_inicial}
                    onChange={e =>
                      setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, fecha_inicial: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
                  <input
                    type="date"
                    value={nuevaVersionBasadaForm.fecha_final}
                    onChange={e =>
                      setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, fecha_final: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={nuevaVersionBasadaForm.copiar_lineas}
                  onChange={e =>
                    setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, copiar_lineas: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Copiar líneas de precios ({versionBase.lineas.length} líneas)
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setModalNuevaVersionBasada(false)
                  setVersionBase(null)
                  setNuevaVersionBasadaForm({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true })
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => crearVersionBasadaEnOtra(versionBase)}
                className="px-4 py-2 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800"
              >
                Crear Versión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
