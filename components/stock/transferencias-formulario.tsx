"use client"

// Formulario de Transferencia Interna nueva.
// Extraído de components/modulo-stock.tsx → renderCrearTransferencia (~1824-2128)
// y transGuardarTransferencia (~1768-1821).
// Persiste en sessionStorage (mismo nivel de persistencia que el monolito original).

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import {
  addTransferencia,
  mapDeposito,
  mapProducto,
  mapUbicacion,
  type Deposito,
  type ProductoStock,
  type SeguimientoEntry,
  type TransferenciaInterna,
  type TransferenciaLinea,
  type Ubicacion,
} from "./_shared"

interface Props {
  onCancelar: () => void
  onCreada: (id: number) => void
}

interface FormLinea {
  id: number
  producto_id: number
  producto_nombre: string
  producto_codigo: string
  stock_virtual: number
  cantidad: number
  observacion: string
}

export default function TransferenciaFormulario({ onCancelar, onCreada }: Props) {
  const { sucursales } = useERP()

  // Master data
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [productos, setProductos] = useState<ProductoStock[]>([])

  // Form state
  const [depositoId, setDepositoId] = useState<number | null>(null)
  const [ubicOrigenId, setUbicOrigenId] = useState<number | null>(null)
  const [ubicDestinoId, setUbicDestinoId] = useState<number | null>(null)
  const [sucursal, setSucursal] = useState("")
  const [fechaCreacion, setFechaCreacion] = useState(new Date().toISOString())
  const [observaciones, setObservaciones] = useState("")
  const [lineas, setLineas] = useState<FormLinea[]>([])
  const [activeTab, setActiveTab] = useState<"productos" | "observaciones">("productos")

  // Búsqueda de producto
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState("")

  const numeroDocumento = useMemo(() => `TI X 10000-${String(Date.now()).slice(-8)}`, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/depositos").then(r => r.json()),
      fetch("/api/ubicaciones").then(r => r.json()),
      fetch("/api/productos").then(r => r.json()),
    ])
      .then(([deps, ubics, prods]) => {
        const depos = (Array.isArray(deps) ? deps : []).map(mapDeposito)
        setDepositos(depos)
        setUbicaciones((Array.isArray(ubics) ? ubics : []).map(mapUbicacion))
        // Excluir servicios — un servicio no puede transferirse entre depósitos.
        const prodsFiltrados = (Array.isArray(prods) ? prods : []).filter((p: any) => p.tipo !== "servicio")
        setProductos(prodsFiltrados.map(mapProducto))
        const primer = depos[0]
        if (primer) {
          setDepositoId(primer.id)
          setSucursal(primer.sucursal || "Puerto Norte")
        }
      })
      .catch(console.error)
  }, [])

  const ubicacionesDeposito = useMemo(
    () => ubicaciones.filter(u => u.deposito_id === depositoId && u.activa),
    [ubicaciones, depositoId],
  )

  const guardar = (confirmar: boolean) => {
    if (!depositoId || !ubicOrigenId || !ubicDestinoId || lineas.length === 0) {
      alert("Complete todos los campos requeridos y agregue al menos un producto")
      return
    }

    const deposito = depositos.find(d => d.id === depositoId)
    const ubicOrigen = ubicaciones.find(u => u.id === ubicOrigenId)
    const ubicDestino = ubicaciones.find(u => u.id === ubicDestinoId)

    const ahora = new Date().toISOString()
    const seguimiento: SeguimientoEntry[] = [
      { id: 1, fecha: ahora, usuario: "Usuario Actual", tipo: "creacion", descripcion: "Transferencia Interna creada" },
      { id: 2, fecha: ahora, usuario: "Usuario Actual", tipo: "cambio_estado", valor_anterior: "Vacío", valor_nuevo: "Borrador" },
    ]
    if (confirmar) {
      seguimiento.unshift({
        id: 3,
        fecha: ahora,
        usuario: "Usuario Actual",
        tipo: "cambio_estado",
        valor_anterior: "Borrador",
        valor_nuevo: "Confirmada",
      })
    }

    const transferenciaLineas: TransferenciaLinea[] = lineas.map(l => ({
      producto_id: l.producto_id,
      producto_nombre: l.producto_nombre,
      producto_codigo: l.producto_codigo,
      stock_virtual: l.stock_virtual,
      cantidad: l.cantidad,
      observacion: l.observacion,
    }))

    const nueva: TransferenciaInterna = {
      id: Date.now(),
      numero: numeroDocumento,
      deposito_id: depositoId,
      deposito_nombre: deposito?.nombre ?? "",
      ubicacion_origen_id: ubicOrigenId,
      ubicacion_origen_nombre: ubicOrigen?.codigo ?? "",
      ubicacion_destino_id: ubicDestinoId,
      ubicacion_destino_nombre: ubicDestino?.codigo ?? "",
      fecha_creacion: fechaCreacion,
      fecha_transferencia: confirmar ? ahora : null,
      estado: confirmar ? "confirmada" : "borrador",
      sucursal,
      observaciones,
      lineas: transferenciaLineas,
      seguimiento,
    }

    addTransferencia(nueva)
    onCreada(nueva.id)
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/stock/transferencias" className="hover:text-amber-700">
          Transferencias Internas
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900">Nuevo</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => guardar(false)}
          className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700"
        >
          Guardar
        </button>
        <button onClick={onCancelar} className="text-gray-600 hover:text-gray-800 text-sm">
          Descartar
        </button>
        <div className="flex-1" />
        <button
          onClick={() => guardar(true)}
          className="border border-gray-300 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-50"
        >
          Confirmar
        </button>
        <div className="flex items-center gap-1 ml-4">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-l text-xs font-medium">Borrador</span>
          <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-r text-xs font-medium">Confirmada</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Transferencia Interna <span className="text-gray-400">X</span>{" "}
          <span className="text-blue-600">{numeroDocumento.split("-")[1]}</span>
        </h2>

        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-gray-600">Depósito</label>
              <select
                value={depositoId ?? ""}
                onChange={e => {
                  setDepositoId(Number(e.target.value))
                  setUbicOrigenId(null)
                  setUbicDestinoId(null)
                }}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Seleccionar...</option>
                {depositos.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-gray-600">Ubicación Origen</label>
              <select
                value={ubicOrigenId ?? ""}
                onChange={e => setUbicOrigenId(Number(e.target.value))}
                disabled={!depositoId}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
              >
                <option value="">Seleccionar...</option>
                {ubicacionesDeposito.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-gray-600">Ubicación Destino</label>
              <select
                value={ubicDestinoId ?? ""}
                onChange={e => setUbicDestinoId(Number(e.target.value))}
                disabled={!depositoId}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
              >
                <option value="">Seleccionar...</option>
                {ubicacionesDeposito.filter(u => u.id !== ubicOrigenId).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-gray-600">Sucursal</label>
              <select
                value={sucursal}
                onChange={e => setSucursal(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {sucursales.filter(s => s.activa).map(s => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-gray-600">Fecha creación</label>
              <input
                type="date"
                value={fechaCreacion.split("T")[0]}
                onChange={e => setFechaCreacion(new Date(e.target.value).toISOString())}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("productos")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "productos"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab("observaciones")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "observaciones"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Observaciones
            </button>
          </div>
        </div>

        {activeTab === "productos" ? (
          <div>
            {lineas.length > 0 && (
              <table className="w-full mb-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Producto</th>
                    <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Stock Virtual</th>
                    <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Cantidad</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Observación Interna</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map(linea => (
                    <tr key={linea.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        <span className="text-sm">{linea.producto_nombre}</span>
                        <span className="text-xs text-gray-400 ml-2">{linea.producto_codigo}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-sm text-gray-600">{linea.stock_virtual}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={linea.cantidad}
                          onChange={e =>
                            setLineas(prev =>
                              prev.map(l => (l.id === linea.id ? { ...l, cantidad: parseInt(e.target.value) || 1 } : l)),
                            )
                          }
                          className="w-full text-center border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={linea.observacion}
                          onChange={e =>
                            setLineas(prev =>
                              prev.map(l => (l.id === linea.id ? { ...l, observacion: e.target.value } : l)),
                            )
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Observación..."
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => setLineas(prev => prev.filter(l => l.id !== linea.id))}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {showProductSearch ? (
              <div className="relative">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={e => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar producto por nombre o código..."
                  autoFocus
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {(() => {
                    const term = productSearchTerm.toLowerCase()
                    const disponibles = productos
                      .filter(p =>
                        term
                          ? p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
                          : true,
                      )
                      .filter(p => !lineas.some(l => l.producto_id === p.id))
                      .slice(0, 50)
                    if (disponibles.length === 0) {
                      return (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {term ? "Sin resultados" : "Empezá a escribir para buscar productos"}
                        </div>
                      )
                    }
                    return disponibles.map(producto => (
                      <button
                        key={producto.id}
                        onClick={() => {
                          setLineas(prev => [
                            ...prev,
                            {
                              id: Date.now(),
                              producto_id: producto.id,
                              producto_nombre: producto.nombre,
                              producto_codigo: producto.codigo,
                              stock_virtual: producto.stock_virtual,
                              cantidad: 1,
                              observacion: "",
                            },
                          ])
                          setProductSearchTerm("")
                          setShowProductSearch(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                          <div className="text-xs text-gray-500">{producto.codigo}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Stock: <span className="font-medium">{producto.stock_virtual}</span>
                        </div>
                      </button>
                    ))
                  })()}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowProductSearch(true)} className="text-blue-600 hover:text-blue-700 text-sm">
                Añadir un elemento
              </button>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Observaciones de la transferencia..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}
