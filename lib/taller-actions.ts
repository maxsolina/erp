// ============================================================================
// Acciones del módulo Taller — fetch contra API routes
// ============================================================================

const BASE = "/api/taller"

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Error en la petición")
  }
  return res.json()
}

// ─── Áreas ──────────────────────────────────────────────────────────────────
export const fetchAreas = () => apiFetch<TallerArea[]>("/areas")
export const fetchArea = (id: string) => apiFetch<TallerArea>(`/areas/${id}`)
export const createArea = (data: Partial<TallerArea>) => apiFetch<TallerArea>("/areas", { method: "POST", body: JSON.stringify(data) })
export const updateArea = (id: string, data: Partial<TallerArea>) => apiFetch<TallerArea>(`/areas/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteArea = (id: string) => apiFetch<{ ok: boolean }>(`/areas/${id}`, { method: "DELETE" })

// ─── Categorías ─────────────────────────────────────────────────────────────
export const fetchCategorias = () => apiFetch<TallerCategoria[]>("/categorias")
export const fetchCategoria = (id: string) => apiFetch<TallerCategoria>(`/categorias/${id}`)
export const createCategoria = (data: Partial<TallerCategoria>) => apiFetch<TallerCategoria>("/categorias", { method: "POST", body: JSON.stringify(data) })
export const updateCategoria = (id: string, data: Partial<TallerCategoria>) => apiFetch<TallerCategoria>(`/categorias/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteCategoria = (id: string) => apiFetch<{ ok: boolean }>(`/categorias/${id}`, { method: "DELETE" })

// ─── Tipos de OT ────────────────────────────────────────────────────────────
export const fetchTiposOT = () => apiFetch<TallerTipoOT[]>("/tipos-ot")
export const fetchTipoOT = (id: string) => apiFetch<TallerTipoOT>(`/tipos-ot/${id}`)
export const createTipoOT = (data: Partial<TallerTipoOT>) => apiFetch<TallerTipoOT>("/tipos-ot", { method: "POST", body: JSON.stringify(data) })
export const updateTipoOT = (id: string, data: Partial<TallerTipoOT>) => apiFetch<TallerTipoOT>(`/tipos-ot/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteTipoOT = (id: string) => apiFetch<{ ok: boolean }>(`/tipos-ot/${id}`, { method: "DELETE" })

// ─── Equipos ────────────────────────────────────────────────────────────────
export const fetchEquipos = () => apiFetch<TallerEquipo[]>("/equipos")
export const fetchEquipo = (id: string) => apiFetch<TallerEquipo>(`/equipos/${id}`)
export const createEquipo = (data: Partial<TallerEquipo>) => apiFetch<TallerEquipo>("/equipos", { method: "POST", body: JSON.stringify(data) })
export const updateEquipo = (id: string, data: Partial<TallerEquipo>) => apiFetch<TallerEquipo>(`/equipos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteEquipo = (id: string) => apiFetch<{ ok: boolean }>(`/equipos/${id}`, { method: "DELETE" })

// ─── Fallas ─────────────────────────────────────────────────────────────────
export const fetchFallas = () => apiFetch<TallerFalla[]>("/fallas")
export const fetchFalla = (id: string) => apiFetch<TallerFalla>(`/fallas/${id}`)
export const createFalla = (data: Partial<TallerFalla>) => apiFetch<TallerFalla>("/fallas", { method: "POST", body: JSON.stringify(data) })
export const updateFalla = (id: string, data: Partial<TallerFalla>) => apiFetch<TallerFalla>(`/fallas/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteFalla = (id: string) => apiFetch<{ ok: boolean }>(`/fallas/${id}`, { method: "DELETE" })

// ─── Técnicos ───────────────────────────────────────────────────────────────
export const fetchTecnicos = () => apiFetch<TallerTecnico[]>("/tecnicos")
export const fetchTecnico = (id: string) => apiFetch<TallerTecnico>(`/tecnicos/${id}`)
export const createTecnico = (data: Partial<TallerTecnico>) => apiFetch<TallerTecnico>("/tecnicos", { method: "POST", body: JSON.stringify(data) })
export const updateTecnico = (id: string, data: Partial<TallerTecnico>) => apiFetch<TallerTecnico>(`/tecnicos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteTecnico = (id: string) => apiFetch<{ ok: boolean }>(`/tecnicos/${id}`, { method: "DELETE" })

// ─── Turnos ─────────────────────────────────────────────────────────────────
export const fetchTurnos = () => apiFetch<TallerTurno[]>("/turnos")
export const fetchTurno = (id: string) => apiFetch<TallerTurno>(`/turnos/${id}`)
export const createTurno = (data: Partial<TallerTurno>) => apiFetch<TallerTurno>("/turnos", { method: "POST", body: JSON.stringify(data) })
export const updateTurno = (id: string, data: Partial<TallerTurno>) => apiFetch<TallerTurno>(`/turnos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteTurno = (id: string) => apiFetch<{ ok: boolean }>(`/turnos/${id}`, { method: "DELETE" })

// ─── Feriados ───────────────────────────────────────────────────────────────
export const fetchFeriados = () => apiFetch<TallerFeriado[]>("/feriados")
export const fetchFeriado = (id: string) => apiFetch<TallerFeriado>(`/feriados/${id}`)
export const createFeriado = (data: Partial<TallerFeriado>) => apiFetch<TallerFeriado>("/feriados", { method: "POST", body: JSON.stringify(data) })
export const updateFeriado = (id: string, data: Partial<TallerFeriado>) => apiFetch<TallerFeriado>(`/feriados/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteFeriado = (id: string) => apiFetch<{ ok: boolean }>(`/feriados/${id}`, { method: "DELETE" })

// ─── Controles / Checklist ──────────────────────────────────────────────────
export const fetchControles = () => apiFetch<TallerControl[]>("/controles")
export const fetchControl = (id: string) => apiFetch<TallerControl>(`/controles/${id}`)
export const createControl = (data: Partial<TallerControl>) => apiFetch<TallerControl>("/controles", { method: "POST", body: JSON.stringify(data) })
export const updateControl = (id: string, data: Partial<TallerControl>) => apiFetch<TallerControl>(`/controles/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteControl = (id: string) => apiFetch<{ ok: boolean }>(`/controles/${id}`, { method: "DELETE" })

// ─── Motivos de Cierre ──────────────────────────────────────────────────────
export const fetchMotivosCierre = () => apiFetch<TallerMotivoCierre[]>("/motivos-cierre")
export const fetchMotivoCierre = (id: string) => apiFetch<TallerMotivoCierre>(`/motivos-cierre/${id}`)
export const createMotivoCierre = (data: Partial<TallerMotivoCierre>) => apiFetch<TallerMotivoCierre>("/motivos-cierre", { method: "POST", body: JSON.stringify(data) })
export const updateMotivoCierre = (id: string, data: Partial<TallerMotivoCierre>) => apiFetch<TallerMotivoCierre>(`/motivos-cierre/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteMotivoCierre = (id: string) => apiFetch<{ ok: boolean }>(`/motivos-cierre/${id}`, { method: "DELETE" })

// ─── Fallas por Equipo ──────────────────────────────────────────────────────
export const fetchFallasEquipo = () => apiFetch<TallerFallaEquipo[]>("/fallas-equipo")
export const fetchFallaEquipo = (id: string) => apiFetch<TallerFallaEquipo>(`/fallas-equipo/${id}`)
export const createFallaEquipo = (data: Partial<TallerFallaEquipo>) => apiFetch<TallerFallaEquipo>("/fallas-equipo", { method: "POST", body: JSON.stringify(data) })
export const updateFallaEquipo = (id: string, data: Partial<TallerFallaEquipo>) => apiFetch<TallerFallaEquipo>(`/fallas-equipo/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteFallaEquipo = (id: string) => apiFetch<{ ok: boolean }>(`/fallas-equipo/${id}`, { method: "DELETE" })

// ─── Órdenes de Trabajo ─────────────────────────────────────────────────────
export const fetchOrdenes = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : ""
  return apiFetch<TallerOrdenTrabajo[]>(`/ordenes${qs}`)
}
export const fetchOrden = (id: string) => apiFetch<TallerOrdenDetalle>(`/ordenes/${id}`)
export const createOrden = (data: Record<string, unknown>) => apiFetch<TallerOrdenTrabajo>("/ordenes", { method: "POST", body: JSON.stringify(data) })
export const updateOrden = (id: string, data: Record<string, unknown>) => apiFetch<TallerOrdenTrabajo>(`/ordenes/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteOrden = (id: string) => apiFetch<{ ok: boolean }>(`/ordenes/${id}`, { method: "DELETE" })

// ─── Transiciones de Estado ─────────────────────────────────────────────────
export const transicionarOT = (id: string, data: {
  nuevo_estado: string
  usuario: string
  nota?: string
  motivo_cierre_id?: string
  tecnico_id?: string
}) => apiFetch<{ ok: boolean; estado_anterior: string; estado_nuevo: string }>(`/ordenes/${id}/transicion`, { method: "POST", body: JSON.stringify(data) })

// ─── Repuestos de OT ────────────────────────────────────────────────────────
export const fetchRepuestosOT = (otId: string) => apiFetch<TallerOTRepuesto[]>(`/ordenes/${otId}/repuestos`)
export const addRepuestoOT = (otId: string, data: Partial<TallerOTRepuesto>) => apiFetch<TallerOTRepuesto>(`/ordenes/${otId}/repuestos`, { method: "POST", body: JSON.stringify(data) })
export const replaceRepuestosOT = (otId: string, items: Partial<TallerOTRepuesto>[]) => apiFetch<TallerOTRepuesto[]>(`/ordenes/${otId}/repuestos`, { method: "PUT", body: JSON.stringify({ items }) })
export const cargarRepuestosSugeridos = (otId: string) =>
  apiFetch<{ agregados: number; skip_duplicados: number; mensaje: string }>(
    `/ordenes/${otId}/repuestos-sugeridos`,
    { method: "POST" },
  )
export const generarNVDesdeOT = (otId: string, opts?: { force_regenerate?: boolean }) =>
  apiFetch<{ ok: boolean; nv_id: number; nv_numero: string; total: number }>(
    `/ordenes/${otId}/generar-nv`,
    { method: "POST", body: JSON.stringify(opts ?? {}) },
  )

export interface RegistrarSeniaInput {
  caja_id: string | number
  caja_nombre?: string
  valor_id: string | number
  valor_nombre?: string
  tipo_valor?: string
  importe: number
  moneda?: string
  cotizacion?: number
  observaciones?: string
  es_tarjeta?: boolean
  tarjeta_nombre?: string | null
  cantidad_cuotas?: number
}
export const registrarSeniaOT = (otId: string, data: RegistrarSeniaInput) =>
  apiFetch<{ ok: boolean; recibo_id: number; recibo_numero: string; importe: number; imputado_a_nv: string | null }>(
    `/ordenes/${otId}/registrar-senia`,
    { method: "POST", body: JSON.stringify(data) },
  )

export interface CobroPago {
  valor_id: string | number
  valor_nombre?: string
  tipo_valor?: string
  importe: number
  moneda?: string
  cotizacion?: number
  es_tarjeta?: boolean
  tarjeta_nombre?: string | null
  cantidad_cuotas?: number
}
export interface CobrarOTInput {
  caja_id: string | number
  caja_nombre?: string
  pagos: CobroPago[]
  observaciones?: string
}
export const cobrarOT = (otId: string, data: CobrarOTInput) =>
  apiFetch<{
    ok: boolean
    recibo_id: number
    recibo_numero: string
    importe: number
    saldo_nv: number
    nv_cubierta: boolean
    nv_id: number
    nv_numero: string
  }>(
    `/ordenes/${otId}/cobrar`,
    { method: "POST", body: JSON.stringify(data) },
  )

// ─── Controles de OT ────────────────────────────────────────────────────────
export const fetchControlesOT = (otId: string) => apiFetch<TallerOTControl[]>(`/ordenes/${otId}/controles`)
export const crearControlOT = (otId: string, data: { tipo: string; area_id: string; categoria_id?: string }) => apiFetch<TallerOTControl>(`/ordenes/${otId}/controles`, { method: "POST", body: JSON.stringify(data) })
export const updateControlOT = (otId: string, controlId: string, data: Record<string, unknown>) => apiFetch<TallerOTControl>(`/ordenes/${otId}/controles/${controlId}`, { method: "PATCH", body: JSON.stringify(data) })
export const deleteControlOT = (otId: string, controlId: string) => apiFetch<{ ok: boolean }>(`/ordenes/${otId}/controles/${controlId}`, { method: "DELETE" })

// ─── Asignador ──────────────────────────────────────────────────────────────
export const ejecutarAsignador = (data: {
  tecnico_ids: string[]
  tope_por_tecnico: number
  usuario: string
}) => apiFetch<{ asignadas: number; detalle: { ot_id: string; ot_numero: string; tecnico_id: string; tecnico_nombre: string }[] }>("/asignador", { method: "POST", body: JSON.stringify(data) })

// ============================================================================
// TIPOS
// ============================================================================

export interface TallerArea {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  control_inicial_obligatorio?: boolean
  created_at: string
  updated_at: string
}

export interface TallerCategoria {
  id: string
  nombre: string
  area_id: string
  orden_asignacion: number
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
}

export interface TallerTipoOT {
  id: string
  nombre: string
  codigo: string
  area_id: string
  tipo_tecnico: "propio" | "tercero" | "ambos"
  es_garantia_compra: boolean
  es_garantia_reparacion: boolean
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
}

export interface TallerEquipo {
  id: string
  nombre: string
  marca?: string
  modelo?: string
  area_id: string
  dias_garantia_compra: number
  dias_garantia_reparacion: number
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
}

export interface TallerFalla {
  id: string
  nombre: string
  area_id: string
  categoria_id: string
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
  taller_categorias_reparacion?: { nombre: string }
}

export interface TallerTecnico {
  id: string
  nombre: string
  tipo: "propio" | "tercero"
  area_id: string
  categoria_principal_id?: string
  complejidad_tope?: number
  turno_id: string
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
  taller_categorias_reparacion?: { nombre: string }
  taller_turnos?: { nombre: string; hora_entrada: string; hora_salida: string }
  categorias_secundarias?: { categoria_id: string; nombre: string }[]
}

export interface TallerTurno {
  id: string
  nombre: string
  hora_entrada: string
  hora_salida: string
  trabaja_sabado: boolean
  trabaja_domingo: boolean
  activo: boolean
}

export interface TallerFeriado {
  id: string
  fecha: string
  descripcion?: string
}

export interface TallerControl {
  id: string
  nombre: string
  area_id: string
  categoria_id?: string
  disponible_recepcion: boolean
  obs_recepcion_visible: boolean
  obs_recepcion_requerida: boolean
  disponible_calidad: boolean
  obs_calidad_visible: boolean
  obs_calidad_requerida: boolean
  orden: number
  activo: boolean
  taller_areas_reparacion?: { nombre: string }
  taller_categorias_reparacion?: { nombre: string }
}

export interface TallerMotivoCierre {
  id: string
  nombre: string
  activo: boolean
}

export interface TallerFallaEquipo {
  id: string
  equipo_id: string
  falla_id: string
  categoria_id?: string
  complejidad_principal: number
  complejidad_secundaria: number
  tiempo_reparacion_principal: number
  tiempo_reparacion_secundaria: number
  puntaje_base: number
  taller_equipos?: { nombre: string; marca?: string; modelo?: string }
  taller_fallas?: { nombre: string }
  taller_categorias_reparacion?: { nombre: string }
  repuestos?: { producto_id: string; cantidad: number }[]
}

export interface TallerOrdenTrabajo {
  id: string
  numero: string
  sucursal_id?: string
  area_id: string
  tipo_ot_id: string
  tipo_tecnico?: string
  cliente_id: string
  categoria_cliente?: string
  celular_contacto: string
  factura_origen_id?: string
  ot_origen_id?: string
  equipo_id: string
  falla_principal_id: string
  categoria_reparacion_id?: string
  tecnico_id?: string
  estado: string
  fecha_creacion: string
  fecha_asignacion?: string
  fecha_inicio_proceso?: string
  fecha_control_calidad?: string
  fecha_facturado?: string
  fecha_entregado?: string
  imei?: string
  serial_number?: string
  codigo_desbloqueo?: string
  ingresa_apagado: boolean
  ingresa_mojado: boolean
  deja_cargador: boolean
  requerido_mkt: boolean
  retrabajo: boolean
  presupuesto_estimado?: number
  descripcion?: string
  dias_garantia_reparacion?: number
  tiempo_reparacion_teorico?: number
  tiempo_reparacion_real?: number
  puntaje?: number
  motivo_cierre_id?: string
  taller_areas_reparacion?: { nombre: string }
  taller_tipos_ot?: { nombre: string; codigo: string }
  taller_equipos?: { nombre: string; marca?: string; modelo?: string }
  taller_fallas?: { nombre: string }
  taller_categorias_reparacion?: { nombre: string }
  taller_tecnicos?: { nombre: string; tipo: string }
  taller_motivos_cierre?: { nombre: string }
}

export interface TallerOrdenDetalle extends TallerOrdenTrabajo {
  cliente?: { id: number; codigo?: string; nombre: string; telefono?: string } | null
  cliente_nombre?: string | null
  fallas_secundarias: { falla_id: string; nombre: string }[]
  repuestos: TallerOTRepuesto[]
  controles: TallerOTControl[]
  historial: TallerOTHistorial[]
  comprobantes: {
    notas_venta: { id: string; numero: string; estado: string; total: number }[]
    facturas: { id: string; numero: string; estado: string; total: number }[]
    recibos: { id: string; numero: string; estado: string; importe_total: number }[]
    remitos: { id: string; numero: string; estado: string }[]
    ordenes_compra: { id: string; numero: string; estado: string; total: number }[]
  }
}

export interface TallerOTRepuesto {
  id: string
  ot_id: string
  producto_id: string | number
  producto_nombre?: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento_pct: number
  subtotal: number
  total: number
  // Enriquecidos por el GET de la OT (no están en la tabla, se joinean con productos)
  stock_real?: number
  tipo_producto?: string
  stock_suficiente?: boolean
  faltante?: number
}

// Preview de repuestos sugeridos antes de crear la OT
export interface RepuestoSugeridoPreview {
  producto_id: number
  producto_nombre: string
  cantidad_sugerida: number
  stock_real: number
  tipo: string
  stock_suficiente: boolean
  faltante: number
  precio_unitario: number
  precio_origen: "lista" | "costo_contable" | "costo_manual" | "ninguno"
  subtotal: number
}
export interface PreviewListaPrecios {
  id: number
  nombre: string
  version_id: number
  version_nombre: string
}
export const previewRepuestosSugeridos = (params: {
  equipo_id: string
  falla_principal_id: string
  fallas_sec?: string[]
  lista_precios_id?: number | null
}) => {
  const qs = new URLSearchParams({
    equipo_id: params.equipo_id,
    falla_principal_id: params.falla_principal_id,
    fallas_sec: (params.fallas_sec ?? []).join(","),
  })
  if (params.lista_precios_id) qs.set("lista_precios_id", String(params.lista_precios_id))
  return apiFetch<{
    repuestos: RepuestoSugeridoPreview[]
    hay_faltantes: boolean
    total: number
    lista_precios?: PreviewListaPrecios | null
  }>(`/repuestos-sugeridos-preview?${qs.toString()}`)
}

export interface TallerOTControl {
  id: string
  ot_id: string
  tipo: "inicial" | "final"
  historico: boolean
  completado: boolean
  observaciones_generales?: string
  created_at: string
  taller_ot_control_items?: TallerOTControlItem[]
}

export interface TallerOTControlItem {
  id: string
  control_id: string
  control_maestro_id?: string
  nombre: string
  obs_inicial?: string
  check_inicial: boolean
  obs_final?: string
  check_final: boolean
}

export interface TallerOTHistorial {
  id: string
  ot_id: string
  fecha: string
  usuario?: string
  estado_anterior?: string
  estado_nuevo?: string
  campo_modificado?: string
  valor_anterior?: string
  valor_nuevo?: string
  nota?: string
}
