"use client"

import { useEffect, useRef, useState } from "react"

const COTIZACION_DOLAR_MOCK = 1200

interface ProductoDropdownProps {
  nvClienteId: number | null
  clientes: any[]
  listasPrecios: any[]
  versionesLista: any[]
  productosConSerie: any[]
  productoSearchText: string
  anchorRef: React.RefObject<HTMLInputElement>
  onSelect: (p: any, precioUnitario: number, moneda: "ARS" | "USD", precioUSD: number, precioARS: number) => void
}

export default function ProductoDropdown({
  nvClienteId,
  clientes,
  listasPrecios,
  versionesLista,
  productosConSerie,
  productoSearchText,
  anchorRef,
  onSelect,
}: ProductoDropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
  }, [anchorRef])

  const clienteNV = clientes.find((c: any) => c.id === nvClienteId)
  const listaId = clienteNV?.lista_precios_id ?? null

  const versionesDeEstaLista = listaId
    ? versionesLista.filter((v: any) => v.lista_precios_id === listaId)
    : []

  const versionActiva =
    versionesDeEstaLista.find((v: any) =>
      v.activa === true ||
      v.estado === "activa" ||
      v.estado === "Activa" ||
      v.estado === "activo" ||
      v.estado === "Activo"
    ) ?? versionesDeEstaLista[versionesDeEstaLista.length - 1] ?? null

  const tieneLineas = versionActiva && Array.isArray(versionActiva.lineas) && versionActiva.lineas.length > 0

  const productosDeLista = tieneLineas
    ? productosConSerie.filter((p: any) =>
        versionActiva.lineas.some((l: any) => l.producto_id === p.id)
      )
    : productosConSerie

  const productosFiltrados = productosDeLista.filter((p: any) =>
    p.nombre.toLowerCase().includes((productoSearchText ?? "").toLowerCase()) ||
    p.sku.toLowerCase().includes((productoSearchText ?? "").toLowerCase())
  )

  const calcularPrecios = (p: any) => {
    const lineaLP = versionActiva?.lineas?.find((l: any) => l.producto_id === p.id)
    if (lineaLP) {
      const cotiz = lineaLP.cotizacion_dolar || COTIZACION_DOLAR_MOCK
      if (lineaLP.forzar_precio_pesos && lineaLP.precio_forzado_ars) {
        const precioARS = lineaLP.precio_forzado_ars
        return { precioUnitario: precioARS, moneda: "ARS" as const, precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS }
      } else if (lineaLP.precio_venta_moneda === "USD") {
        const precioUSD = lineaLP.precio_venta
        const precioARS = parseFloat((precioUSD * cotiz).toFixed(2))
        return { precioUnitario: precioARS, moneda: "USD" as const, precioUSD, precioARS }
      } else {
        const precioARS = lineaLP.precio_venta
        return { precioUnitario: precioARS, moneda: "ARS" as const, precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS }
      }
    }
    const precioARS = p.precio_venta ?? 0
    return { precioUnitario: precioARS, moneda: "ARS" as const, precioUSD: parseFloat((precioARS / COTIZACION_DOLAR_MOCK).toFixed(2)), precioARS }
  }

  if (!pos) return null

  // Calcula si hay espacio arriba o abajo
  const spaceBelow = window.innerHeight - (pos.top - window.scrollY)
  const dropdownHeight = Math.min(192, productosFiltrados.length * 32 + 32)
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

  return (
    <div
      style={style}
      className="bg-white border border-gray-300 shadow-xl max-h-48 overflow-y-auto rounded"
    >
      {versionActiva && (
        <div className="px-2 py-1 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-100 font-medium">
          Lista: {listasPrecios.find((l: any) => l.id === listaId)?.nombre ?? versionActiva.lista_precios_nombre}
        </div>
      )}
      {productosFiltrados.map((p: any) => (
        <div
          key={p.id}
          onMouseDown={(e) => {
            e.preventDefault()
            const precios = calcularPrecios(p)
            onSelect(p, precios.precioUnitario, precios.moneda, precios.precioUSD, precios.precioARS)
          }}
          className="px-2 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer text-sm"
        >
          <span className="font-medium">[{p.sku}]</span> {p.nombre}
        </div>
      ))}
      {productosFiltrados.length === 0 && (
        <div className="px-2 py-1.5 text-sm text-gray-500">
          {productoSearchText ? "No se encontraron productos" : "Escriba para buscar un producto"}
        </div>
      )}
    </div>
  )
}
