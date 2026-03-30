// Lib actions para el módulo Depósito / Stock
// Sigue el mismo patrón de fetch → API route que productos-actions.ts

// ────────────────────────────────────────────────────────────────────────────
// DEPÓSITOS
// ────────────────────────────────────────────────────────────────────────────

export async function fetchDepositos(): Promise<any[]> {
  const res = await fetch("/api/depositos", { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearDeposito(payload: { codigo: string; nombre: string; sucursal_id?: number }): Promise<any> {
  const res = await fetch("/api/depositos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────
// UBICACIONES
// ────────────────────────────────────────────────────────────────────────────

export async function fetchUbicaciones(depositoId?: number): Promise<any[]> {
  const qs = depositoId ? `?deposito_id=${depositoId}` : ""
  const res = await fetch(`/api/ubicaciones${qs}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearUbicacion(payload: {
  deposito_id: number
  codigo: string
  nombre: string
  tipo?: string
  es_reparacion?: boolean
  es_defecto?: boolean
}): Promise<any> {
  const res = await fetch("/api/ubicaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────
// STOCK UNIDADES (productos con N° serie)
// ────────────────────────────────────────────────────────────────────────────

export async function fetchStockUnidades(params?: {
  producto_id?: number
  deposito_id?: number
  ubicacion_id?: number
  estado?: string
  nro_serie?: string
}): Promise<any[]> {
  const sp = new URLSearchParams()
  if (params?.producto_id) sp.set("producto_id", String(params.producto_id))
  if (params?.deposito_id) sp.set("deposito_id", String(params.deposito_id))
  if (params?.ubicacion_id) sp.set("ubicacion_id", String(params.ubicacion_id))
  if (params?.estado) sp.set("estado", params.estado)
  if (params?.nro_serie) sp.set("nro_serie", params.nro_serie)

  const qs = sp.toString()
  const res = await fetch(`/api/stock/unidades${qs ? `?${qs}` : ""}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function ingresarUnidadesStock(unidades: {
  producto_id: number
  ubicacion_id: number
  deposito_id: number
  nro_serie?: string
  color?: string
  bateria_pct?: number
  es_outlet?: boolean
  observaciones?: string
  estado?: string
  origen_tipo?: string
  origen_id?: number
  origen_numero?: string
}[]): Promise<any[]> {
  const res = await fetch("/api/stock/unidades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(unidades),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────
// MOVIMIENTOS DE STOCK
// ────────────────────────────────────────────────────────────────────────────

export async function fetchMovimientosStock(params?: {
  producto_id?: number
  tipo?: string
  origen_tipo?: string
  origen_id?: number
  limit?: number
}): Promise<any[]> {
  const sp = new URLSearchParams()
  if (params?.producto_id) sp.set("producto_id", String(params.producto_id))
  if (params?.tipo) sp.set("tipo", params.tipo)
  if (params?.origen_tipo) sp.set("origen_tipo", params.origen_tipo)
  if (params?.origen_id) sp.set("origen_id", String(params.origen_id))
  if (params?.limit) sp.set("limit", String(params.limit))

  const qs = sp.toString()
  const res = await fetch(`/api/stock/movimientos${qs ? `?${qs}` : ""}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function registrarMovimientosStock(movimientos: {
  tipo: string
  producto_id?: number
  producto_nombre: string
  ubicacion_origen_id?: number
  ubicacion_destino_id?: number
  deposito_origen_id?: number
  deposito_destino_id?: number
  cantidad?: number
  stock_unidad_id?: number
  nro_serie?: string
  origen_tipo?: string
  origen_id?: number
  origen_numero?: string
  usuario?: string
  observaciones?: string
}[]): Promise<any[]> {
  const res = await fetch("/api/stock/movimientos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movimientos),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Entrada por recepción (productos CON y SIN serie)
// Llamar desde el módulo Compras al confirmar una recepción
// ────────────────────────────────────────────────────────────────────────────

export async function procesarEntradaRecepcion(payload: {
  recepcion_id: number
  recepcion_numero: string
  deposito_id: number
  ubicacion_id: number
  lineas: {
    producto_id: number
    producto_nombre: string
    tiene_serie: boolean
    cantidad: number
    unidades?: {
      nro_serie?: string
      color?: string
      bateria_pct?: number
      es_outlet?: boolean
      observaciones?: string
    }[]
  }[]
}): Promise<void> {
  for (const linea of payload.lineas) {
    if (linea.tiene_serie && linea.unidades && linea.unidades.length > 0) {
      // Insertar cada unidad individualmente
      await ingresarUnidadesStock(
        linea.unidades.map((u) => ({
          producto_id: linea.producto_id,
          ubicacion_id: payload.ubicacion_id,
          deposito_id: payload.deposito_id,
          nro_serie: u.nro_serie,
          color: u.color,
          bateria_pct: u.bateria_pct,
          es_outlet: u.es_outlet ?? false,
          observaciones: u.observaciones,
          estado: "disponible",
          origen_tipo: "recepcion",
          origen_id: payload.recepcion_id,
          origen_numero: payload.recepcion_numero,
        }))
      )

      // Registrar movimiento por cada unidad
      await registrarMovimientosStock(
        linea.unidades.map((u) => ({
          tipo: "entrada_recepcion",
          producto_id: linea.producto_id,
          producto_nombre: linea.producto_nombre,
          ubicacion_destino_id: payload.ubicacion_id,
          deposito_destino_id: payload.deposito_id,
          cantidad: 1,
          nro_serie: u.nro_serie,
          origen_tipo: "recepcion",
          origen_id: payload.recepcion_id,
          origen_numero: payload.recepcion_numero,
          usuario: "Admin",
        }))
      )
    } else if (!linea.tiene_serie && linea.cantidad > 0) {
      // Producto sin serie: solo registrar el movimiento de cantidad
      await registrarMovimientosStock([{
        tipo: "entrada_recepcion",
        producto_id: linea.producto_id,
        producto_nombre: linea.producto_nombre,
        ubicacion_destino_id: payload.ubicacion_id,
        deposito_destino_id: payload.deposito_id,
        cantidad: linea.cantidad,
        origen_tipo: "recepcion",
        origen_id: payload.recepcion_id,
        origen_numero: payload.recepcion_numero,
        usuario: "Admin",
      }])
    }
  }
}
