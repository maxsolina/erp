export async function fetchProductos(params?: {
  busqueda?: string
  activo?: boolean | null
  tipo?: string
}): Promise<any[]> {
  const searchParams = new URLSearchParams()
  if (params?.busqueda) searchParams.set("busqueda", params.busqueda)
  if (params?.activo !== undefined && params.activo !== null)
    searchParams.set("activo", String(params.activo))
  if (params?.tipo) searchParams.set("tipo", params.tipo)

  const qs = searchParams.toString()
  const res = await fetch(`/api/productos${qs ? `?${qs}` : ""}`, { cache: "no-store" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Error al obtener productos")
  }
  return res.json()
}

export async function guardarProductoEnDB(
  payload: Record<string, any>,
  productoId?: number
): Promise<{ id: number }> {
  if (productoId) {
    const res = await fetch(`/api/productos/${productoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Error al actualizar producto")
    }
    const data = await res.json()
    return { id: data.id }
  } else {
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Error al crear producto")
    }
    const data = await res.json()
    return { id: data.id }
  }
}

export async function eliminarProductoEnDB(productoId: number): Promise<void> {
  const res = await fetch(`/api/productos/${productoId}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al eliminar producto")
  }
}
