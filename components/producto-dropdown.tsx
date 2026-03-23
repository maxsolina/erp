"use client"

const COTIZACION_DOLAR_MOCK = 1200

interface ProductoDropdownProps {
  nvClienteId: number | null
  clientes: any[]
  listasPrecios: any[]
  versionesLista: any[]
  productosConSerie: any[]
  productoSearchText: string
  onSelect: (p: any, precioUnitario: number, moneda: "ARS" | "USD", precioUSD: number, precioARS: number) => void
}

export default function ProductoDropdown({
  nvClienteId,
  clientes,
  listasPrecios,
  versionesLista,
  productosConSerie,
  productoSearchText,
  onSelect,
}: ProductoDropdownProps) {
  const clienteNV = clientes.find((c: any) => c.id === nvClienteId)
  const listaId = clienteNV?.lista_precios_id ?? null

  // Busca cualquier versión de la lista del cliente (activa, borrador, etc.)
  // Prioriza activa, pero si no hay activa usa la más reciente
  const versionesDeEstaLista = listaId
    ? versionesLista.filter((v: any) => v.lista_precios_id === listaId)
    : []

  const versionActiva = versionesDeEstaLista.find((v: any) =>
    v.activa === true ||
    v.estado === "activa" ||
    v.estado === "Activa" ||
    v.estado === "activo" ||
    v.estado === "Activo"
  ) ?? versionesDeEstaLista[versionesDeEstaLista.length - 1] ?? null

  // Si hay versión con lineas, filtra productos. Si no, muestra todos.
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

  const calcularPrecios = (p: any): { precioUnitario: number; moneda: "ARS" | "USD"; precioUSD: number; precioARS: number } => {
    const lineaLP = versionActiva?.lineas?.find((l: any) => l.producto_id === p.id)
    if (lineaLP) {
      const cotiz = lineaLP.cotizacion_dolar || COTIZACION_DOLAR_MOCK
      if (lineaLP.forzar_precio_pesos && lineaLP.precio_forzado_ars) {
        const precioARS = lineaLP.precio_forzado_ars
        return { precioUnitario: precioARS, moneda: "ARS", precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS }
      } else if (lineaLP.precio_venta_moneda === "USD") {
        const precioUSD = lineaLP.precio_venta
        const precioARS = parseFloat((precioUSD * cotiz).toFixed(2))
        return { precioUnitario: precioARS, moneda: "USD", precioUSD, precioARS }
      } else {
        const precioARS = lineaLP.precio_venta
        return { precioUnitario: precioARS, moneda: "ARS", precioUSD: parseFloat((precioARS / cotiz).toFixed(2)), precioARS }
      }
    }
    const precioARS = p.precio_venta ?? 0
    return { precioUnitario: precioARS, moneda: "ARS", precioUSD: parseFloat((precioARS / COTIZACION_DOLAR_MOCK).toFixed(2)), precioARS }
  }

  return (
    <div className="absolute left-0 top-full z-50 min-w-[280px] w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto rounded">
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
            const { precioUnitario, moneda, precioUSD, precioARS } = calcularPrecios(p)
            onSelect(p, precioUnitario, moneda, precioUSD, precioARS)
          }}
          className="px-2 py-1 hover:bg-blue-600 hover:text-white cursor-pointer text-sm"
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
