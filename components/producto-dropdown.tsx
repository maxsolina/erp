"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Search, X } from "lucide-react"

const COTIZACION_DOLAR_MOCK = 1200

interface ProductoDropdownProps {
  nvClienteId: number | null
  nvListaPreciosId: number | null
  clientes: any[]
  listasPrecios: any[]
  versionesLista: any[]
  productosConSerie: any[]
  productoSearchText: string
  anchorRef: React.RefObject<HTMLInputElement>
  onSelect: (p: any, precioUnitario: number, moneda: "ARS" | "USD", precioUSD: number, precioARS: number, iva: number) => void
}

export default function ProductoDropdown({
  nvClienteId,
  nvListaPreciosId,
  clientes,
  listasPrecios,
  versionesLista,
  productosConSerie,
  productoSearchText,
  anchorRef,
  onSelect,
}: ProductoDropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSearch, setModalSearch] = useState(productoSearchText ?? "")

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
  }, [anchorRef])

  // Sincronizar búsqueda del modal con el texto del input
  useEffect(() => { setModalSearch(productoSearchText ?? "") }, [productoSearchText])

  const clienteNV = clientes.find((c: any) => c.id === nvClienteId)
  const listaId = nvListaPreciosId ?? clienteNV?.lista_precios_id ?? null

  const versionesDeEstaLista = listaId
    ? versionesLista.filter((v: any) => v.lista_precios_id === listaId)
    : []

  const versionActiva =
    versionesDeEstaLista.find((v: any) =>
      (v.activa === true || v.estado === "activa" || v.estado === "Activa" || v.estado === "activo" || v.estado === "Activo") &&
      Array.isArray(v.lineas) && v.lineas.length > 0
    ) ??
    versionesDeEstaLista.find((v: any) =>
      (v.estado === "confirmada" || v.estado === "Confirmada") &&
      Array.isArray(v.lineas) && v.lineas.length > 0
    ) ??
    versionesDeEstaLista.find((v: any) => Array.isArray(v.lineas) && v.lineas.length > 0) ??
    versionesDeEstaLista[versionesDeEstaLista.length - 1] ??
    null

  const tieneLineas = versionActiva && Array.isArray(versionActiva.lineas) && versionActiva.lineas.length > 0

  const productosDeLista = tieneLineas
    ? productosConSerie.filter((p: any) =>
        versionActiva.lineas.some((l: any) => l.producto_id === p.id)
      )
    : productosConSerie

  const calcularPrecios = (p: any) => {
    const lineaLP = versionActiva?.lineas?.find((l: any) => l.producto_id === p.id)
    const iva: number = lineaLP?.iva ?? 21
    if (lineaLP) {
      const cotiz = lineaLP.cotizacion_dolar || COTIZACION_DOLAR_MOCK
      if (lineaLP.forzar_precio_pesos && lineaLP.precio_forzado_ars) {
        const precioARS = lineaLP.precio_forzado_ars
        return { precioUnitario: precioARS, moneda: "ARS" as const, precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS, iva }
      } else if (lineaLP.precio_venta_moneda === "USD") {
        const precioUSD = lineaLP.precio_venta
        const precioARS = parseFloat((precioUSD * cotiz).toFixed(2))
        return { precioUnitario: precioARS, moneda: "USD" as const, precioUSD, precioARS, iva }
      } else {
        const precioARS = lineaLP.precio_venta
        return { precioUnitario: precioARS, moneda: "ARS" as const, precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS, iva }
      }
    }
    const precioARS = p.precio_venta ?? p.costo_manual ?? 0
    return { precioUnitario: precioARS, moneda: (p.moneda_costo === "USD" ? "USD" : "ARS") as "ARS" | "USD", precioUSD: parseFloat((precioARS / COTIZACION_DOLAR_MOCK).toFixed(2)), precioARS, iva: 21 }
  }

  const formatPrice = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)

  const productosFiltradosModal = useMemo(() => {
    const q = modalSearch.trim().toLowerCase()
    if (!q) return productosDeLista
    return productosDeLista.filter((p: any) =>
      p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [productosDeLista, modalSearch])

  const productosFiltrados = useMemo(() => {
    const q = (productoSearchText ?? "").toLowerCase()
    if (!q) return productosDeLista
    return productosDeLista.filter((p: any) =>
      p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [productosDeLista, productoSearchText])

  const handleSelect = (p: any) => {
    const precios = calcularPrecios(p)
    onSelect(p, precios.precioUnitario, precios.moneda, precios.precioUSD, precios.precioARS, precios.iva)
    setModalOpen(false)
  }

  if (!pos) return null

  const spaceBelow = window.innerHeight - (pos.top - window.scrollY)
  const dropdownHeight = Math.min(192, productosFiltrados.slice(0, 5).length * 32 + 80)
  const showAbove = spaceBelow < dropdownHeight + 40

  const style: React.CSSProperties = {
    position: "fixed",
    left: pos.left,
    width: Math.max(pos.width, 280),
    zIndex: 9999,
    ...(showAbove
      ? { bottom: window.innerHeight - (pos.top - window.scrollY) }
      : { top: pos.top - window.scrollY + (anchorRef.current?.offsetHeight ?? 32) }),
  }

  const nombreLista = listaId
    ? listasPrecios.find((l: any) => l.id === listaId)?.nombre ?? versionActiva?.lista_precios_nombre
    : null

  return (
    <>
      {/* Dropdown inline — 5 resultados */}
      <div style={style} className="bg-white border border-gray-300 shadow-xl rounded flex flex-col">
        {versionActiva && (
          <div className="px-2 py-1 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-100 font-medium shrink-0">
            Lista: {nombreLista}
          </div>
        )}
        {productosFiltrados.slice(0, 5).map((p: any) => (
          <div key={p.id}
            onMouseDown={e => { e.preventDefault(); handleSelect(p) }}
            className="px-2 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer text-sm border-b border-gray-50 last:border-b-0">
            <span className="font-medium">[{p.sku}]</span> {p.nombre}
          </div>
        ))}
        {productosFiltrados.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-gray-500">
            {productoSearchText ? "No se encontraron productos" : "Escriba para buscar un producto"}
          </div>
        )}
        {/* Botón buscar más — siempre visible */}
        <div role="button"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); requestAnimationFrame(() => setModalOpen(true)) }}
          className="px-2 py-1.5 text-sm font-medium flex items-center gap-2 shrink-0 cursor-pointer rounded-b"
          style={{ backgroundColor: '#eef2ff', color: '#3730a3', borderTop: '2px solid #c7d2fe' }}>
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>
            {productosFiltrados.length > 5
              ? `Buscar más… (${productosFiltrados.length - 5} más)`
              : "Buscar en todos los productos..."}
          </span>
        </div>
      </div>

      {/* Modal completo */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-base font-semibold text-amber-900">Seleccionar producto</h2>
                {nombreLista && <p className="text-xs text-emerald-600 mt-0.5">Lista: {nombreLista}</p>}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Buscador */}
            <div className="px-5 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input autoFocus type="text" value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                {modalSearch && (
                  <button onClick={() => setModalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{productosFiltradosModal.length} productos</p>
            </div>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {productosFiltradosModal.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Sin resultados para "{modalSearch}"</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                      {versionActiva && <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Precio</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltradosModal.map((p: any) => {
                      const precios = calcularPrecios(p)
                      return (
                        <tr key={p.id}
                          onClick={() => handleSelect(p)}
                          className="border-b border-gray-50 hover:bg-indigo-50 cursor-pointer transition-colors">
                          <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{p.sku}</td>
                          <td className="px-3 py-2.5 text-gray-800">{p.nombre}</td>
                          {versionActiva && (
                            <td className="px-5 py-2.5 text-right">
                              <span className="font-medium text-gray-900">{formatPrice(precios.precioARS)}</span>
                              {precios.moneda === "USD" && (
                                <span className="ml-1 text-xs text-gray-400">USD {precios.precioUSD}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Footer */}
            <div className="px-5 py-3 border-t flex justify-end">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


