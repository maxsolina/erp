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
    const text = await res.text()
    throw new Error(text || "Error al obtener productos")
  }
  return res.json()
}

export async function guardarProductoEnDB(
  payload: Record<string, any>,
  productoId?: number
): Promise<{ id: number }> {
  const url = productoId ? `/api/productos/${productoId}` : "/api/productos"
  const method = productoId ? "PUT" : "POST"
  console.log("[v0] guardarProductoEnDB ->", method, url, Object.keys(payload))

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  console.log("[v0] respuesta status:", res.status, "body:", text.slice(0, 200))
  if (!res.ok) {
    let msg = text
    try { msg = JSON.parse(text)?.error ?? text } catch {}
    throw new Error(msg || "Error al guardar producto")
  }

  try {
    return JSON.parse(text)
  } catch {
    return { id: 0 }
  }
}

export async function eliminarProductoEnDB(productoId: number): Promise<void> {
  const res = await fetch(`/api/productos/${productoId}`, { method: "DELETE" })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try { msg = JSON.parse(text)?.error ?? text } catch {}
    throw new Error(msg || "Error al eliminar producto")
  }
}
