// Acciones de persistencia del módulo de compras
// Todas las operaciones se hacen via API routes (compatibles con "use client")

// =====================================================
// PROVEEDORES
// =====================================================

export async function fetchProveedores(): Promise<any[]> {
  const res = await fetch("/api/compras/proveedores", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener proveedores")
  return res.json()
}

export async function guardarProveedor(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/proveedores/${id}` : "/api/compras/proveedores"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar proveedor")
  }
  return res.json()
}

export async function eliminarProveedor(id: number): Promise<void> {
  const res = await fetch(`/api/compras/proveedores/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al eliminar proveedor")
  }
}

// =====================================================
// ÓRDENES DE COMPRA
// =====================================================

export async function fetchOrdenesCompra(): Promise<any[]> {
  const res = await fetch("/api/compras/ordenes-compra", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener órdenes de compra")
  return res.json()
}

export async function guardarOrdenCompra(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/ordenes-compra/${id}` : "/api/compras/ordenes-compra"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar orden de compra")
  }
  return res.json()
}

export async function eliminarOrdenCompra(id: number): Promise<void> {
  const res = await fetch(`/api/compras/ordenes-compra/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al eliminar orden de compra")
  }
}

// =====================================================
// RECEPCIONES
// =====================================================

export async function fetchRecepciones(): Promise<any[]> {
  const res = await fetch("/api/compras/recepciones", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener recepciones")
  return res.json()
}

export async function guardarRecepcion(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/recepciones/${id}` : "/api/compras/recepciones"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar recepción")
  }
  return res.json()
}

// =====================================================
// FACTURAS DE COMPRA
// =====================================================

export async function fetchFacturasCompra(): Promise<any[]> {
  const res = await fetch("/api/compras/facturas", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener facturas de compra")
  return res.json()
}

export async function guardarFacturaCompra(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/facturas/${id}` : "/api/compras/facturas"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar factura de compra")
  }
  return res.json()
}

// =====================================================
// ÓRDENES DE PAGO
// =====================================================

export async function fetchOrdenesPago(): Promise<any[]> {
  const res = await fetch("/api/compras/ordenes-pago", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener órdenes de pago")
  return res.json()
}

export async function guardarOrdenPago(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/ordenes-pago/${id}` : "/api/compras/ordenes-pago"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar orden de pago")
  }
  return res.json()
}

// =====================================================
// NOTAS DE CRÉDITO DE COMPRA
// =====================================================

export async function fetchNotasCreditoCompra(): Promise<any[]> {
  const res = await fetch("/api/compras/notas-credito", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener notas de crédito")
  return res.json()
}

export async function guardarNotaCreditoCompra(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/notas-credito/${id}` : "/api/compras/notas-credito"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar nota de crédito")
  }
  return res.json()
}

// =====================================================
// NOTAS DE DÉBITO DE COMPRA
// =====================================================

export async function fetchNotasDebitoCompra(): Promise<any[]> {
  const res = await fetch("/api/compras/notas-debito", { cache: "no-store" })
  if (!res.ok) throw new Error("Error al obtener notas de débito")
  return res.json()
}

export async function guardarNotaDebitoCompra(payload: Record<string, any>, id?: number): Promise<any> {
  const url = id ? `/api/compras/notas-debito/${id}` : "/api/compras/notas-debito"
  const method = id ? "PUT" : "POST"
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al guardar nota de débito")
  }
  return res.json()
}
