"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Usuario {
  id: number
  username: string
  nombre: string
  email: string
  rol: "admin" | "supervisor" | "vendedor" | "comprador" | "cajero" | "deposito" | "tecnico"
  sucursal_id: number
  sucursal_nombre: string
  activo: boolean
  ultimo_acceso: string
  avatar?: string
}

export interface Sucursal {
  id: number
  codigo: string
  nombre: string
  direccion?: string
  telefono?: string
  deposito_id?: number | null
  activa: boolean
}

export interface UsuarioSucursal {
  id: number
  usuario_id: number
  sucursal_id: number
  es_principal: boolean
  ver_nv_otras_sucursales: boolean
}

export interface Cliente {
  id: number
  codigo: string
  nombre: string
  tipo_documento: "DNI" | "CUIT" | "CUIL" | "Pasaporte"
  numero_documento: string
  categoria: "publico" | "corporativo"
  tipo_cliente: "minorista" | "mayorista" | "distribuidor"
  email: string
  telefono: string
  direccion: string
  ciudad: string
  provincia: string
  codigo_postal: string
  limite_credito: number
  saldo: number
  estado: "activo" | "inactivo" | "suspendido"
  vendedor_asignado?: string
  condicion_iva: "Consumidor Final" | "Responsable Inscripto" | "Monotributista" | "Exento"
}

export interface Proveedor {
  id: number
  codigo: string
  razon_social: string
  nombre_fantasia: string
  cuit: string
  categoria: "publico" | "privado"
  tipo: "nacional" | "internacional" | "despachante"
  email: string
  telefono: string
  direccion: string
  ciudad: string
  pais: string
  condicion_pago: string
  moneda_habitual: "ARS" | "USD"
  saldo: number
  estado: "activo" | "inactivo"
}

export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion: string
  categoria: string
  marca: string
  modelo: string
  unidad_medida: string
  precio_costo: number
  precio_venta: number
  iva: number
  stock_actual: number
  stock_reservado: number
  stock_minimo: number
  estado: "activo" | "inactivo" | "discontinuado"
}

export interface MovimientoStock {
  id: number
  fecha: string
  producto_id: number
  tipo: "ingreso" | "egreso" | "reserva" | "liberacion" | "ajuste" | "transferencia"
  cantidad: number
  documento_tipo: string
  documento_numero: string
  deposito_origen?: string
  deposito_destino?: string
  usuario: string
  observaciones?: string
}

export interface MovimientoCtaCte {
  id: number
  fecha: string
  entidad_tipo: "cliente" | "proveedor"
  entidad_id: number
  tipo: "factura" | "nota_credito" | "nota_debito" | "recibo" | "orden_pago" | "ajuste"
  documento_numero: string
  concepto: string
  debe: number
  haber: number
  saldo_parcial: number
  usuario: string
}

export interface NotaVenta {
  id: number
  numero: string
  fecha: string
  cliente_id: number
  cliente_nombre: string
  vendedor: string
  sucursal: string
  estado: "borrador" | "confirmada" | "parcial" | "entregada" | "facturada" | "cancelada"
  items: { producto_id: number; sku: string; nombre: string; cantidad: number; precio: number; descuento: number }[]
  subtotal: number
  descuento: number
  iva: number
  total: number
  orden_entrega_id?: number
  factura_id?: number
}

export interface OrdenEntrega {
  id: number
  numero: string
  fecha: string
  nota_venta_id: number
  nota_venta_numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "pendiente" | "en_preparacion" | "listo" | "entregado" | "cancelado"
  remito_id?: number
  items: { producto_id: number; sku: string; nombre: string; cantidad: number }[]
}

export interface Remito {
  id: number
  numero: string
  fecha: string
  orden_entrega_id: number
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "confirmado" | "cancelado"
  items: { producto_id: number; sku: string; nombre: string; cantidad: number }[]
}

export interface Factura {
  id: number
  numero: string
  fecha: string
  fecha_vencimiento: string
  cliente_id: number
  cliente_nombre: string
  nota_venta_id?: number
  remito_id?: number
  estado: "borrador" | "publicada" | "pagada" | "vencida" | "cancelada"
  items: { producto_id: number; sku: string; nombre: string; cantidad: number; precio: number; iva: number }[]
  subtotal: number
  iva: number
  total: number
  saldo: number
  condicion_pago: string
}

export interface Recibo {
  id: number
  numero: string
  fecha: string
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "publicado" | "cancelado"
  factura_id?: number
  importe: number
  pagos: { forma_pago: string; importe: number; moneda: "ARS" | "USD" }[]
}

export interface OrdenCompra {
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "confirmada" | "parcial" | "completa"
  moneda: "ARS" | "USD"
  items: { producto_id: number; sku: string; nombre: string; cantidad: number; cantidad_recibida: number; precio: number }[]
  subtotal: number
  total: number
}

export interface Recepcion {
  id: number
  numero: string
  fecha: string
  orden_compra_id: number
  orden_compra_numero: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "confirmada"
  legajo_id?: number
  despacho_id?: number
  items: { producto_id: number; sku: string; nombre: string; cantidad: number; precio_unitario: number }[]
  total: number
}

export interface FacturaCompra {
  id: number
  numero: string
  tipo: "A" | "B" | "C"
  fecha: string
  fecha_vencimiento: string
  proveedor_id: number
  proveedor_nombre: string
  recepcion_id?: number
  estado: "pendiente" | "pagada" | "vencida"
  subtotal: number
  iva: number
  total: number
  saldo: number
}

export interface OrdenPago {
  id: string
  numero: string
  fecha: string
  sucursal_id?: string
  sucursal_nombre?: string
  proveedor_id: number
  proveedor_nombre: string
  caja_id?: string
  caja_nombre?: string
  moneda: "ARS" | "USD" | "EUR"
  tipo_cotizacion?: string
  cotizacion?: number
  importe: number
  importe_ars?: number
  importe_a_cuenta: number
  importe_no_conciliado: number
  concepto?: string
  orden_compra_id?: number
  orden_compra_numero?: string
  estado: "borrador" | "publicado" | "cancelado"
  periodo?: string
  observaciones?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  medios_pago?: OrdenPagoMedio[]
  comprobantes?: OrdenPagoComprobante[]
}

export interface OrdenPagoMedio {
  id?: string
  op_id?: string
  nombre?: string
  forma_pago_id?: string
  forma_pago_nombre?: string
  tipo_operacion?: string
  tipo_cotizacion?: string
  cotizacion?: number
  numero_operacion?: string
  fecha_operacion?: string
  importe: number
  moneda: "ARS" | "USD" | "EUR"
  importe_comp: number
  moneda_comp?: "ARS" | "USD" | "EUR"
  observaciones?: string
}

export interface OrdenPagoComprobante {
  id?: string
  op_id?: string
  tipo: "debito" | "credito"
  factura_id?: number
  referencia: string
  fecha?: string
  vencimiento?: string
  saldo_mon?: number
  moneda_comp?: string
  tipo_cotizacion?: string
  cotizacion_original?: number
  saldo_original: number
  cotizacion?: number
  importe_en_liquidacion?: number
  saldo: number
  total: number
  importe: number
}

export interface Ticket {
  id: number
  numero: string
  fecha: string
  usuario_id: number
  usuario_nombre: string
  sucursal: string
  categoria: "soporte" | "error" | "mejora" | "consulta"
  prioridad: "baja" | "media" | "alta" | "urgente"
  estado: "abierto" | "en_progreso" | "pendiente_usuario" | "resuelto" | "cerrado"
  asunto: string
  descripcion: string
  mensajes: { fecha: string; usuario: string; mensaje: string; es_soporte: boolean }[]
  archivos?: string[]
}

// =====================================================
// CONTEXTO
// =====================================================

// Cambiar a `true` cuando el template del mail tenga {{ .Token }} configurado
// y queramos forzar segundo factor por mail en cada login.
const OTP_LOGIN_ENABLED = false

export type LoginResult =
  | { ok: true; requiresOtp: false }
  | { ok: true; requiresOtp: true; email: string }
  | { ok: false; reason: "invalid_credentials" | "otp_send_failed" | "network" }

interface ERPContextType {
  // Usuario actual
  currentUser: Usuario | null
  setCurrentUser: (user: Usuario | null) => void
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  verifyLoginOtp: (email: string, token: string) => Promise<boolean>
  resendLoginOtp: (email: string) => Promise<boolean>
  logout: () => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>

  // Permisos del usuario logueado
  isSuperuser: boolean
  vistas: Record<string, boolean>
  permisos: Record<string, Record<string, string | boolean>>
  /** ¿Puede ver este módulo? (y opcionalmente una sub-vista). Los superusuarios ven todo. */
  canSee: (modulo: string, subvista?: string) => boolean
  /** Recarga los permisos desde /api/usuarios/me — útil después de un guardado. */
  reloadPermisos: () => Promise<void>

  // Datos maestros
  sucursales: Sucursal[]
  setSucursales: React.Dispatch<React.SetStateAction<Sucursal[]>>
  sucursalActiva: Sucursal | null
  setSucursalActiva: (s: Sucursal) => void
  usuarios: Usuario[]
  clientes: Cliente[]
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>
  proveedores: Proveedor[]
  setProveedores: React.Dispatch<React.SetStateAction<Proveedor[]>>
  productos: Producto[]
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>
  recargarProductos: () => Promise<void>

  // Movimientos
  movimientosStock: MovimientoStock[]
  setMovimientosStock: React.Dispatch<React.SetStateAction<MovimientoStock[]>>
  movimientosCtaCte: MovimientoCtaCte[]
  setMovimientosCtaCte: React.Dispatch<React.SetStateAction<MovimientoCtaCte[]>>

  // Ventas
  notasVenta: NotaVenta[]
  setNotasVenta: React.Dispatch<React.SetStateAction<NotaVenta[]>>
  ordenesEntrega: OrdenEntrega[]
  setOrdenesEntrega: React.Dispatch<React.SetStateAction<OrdenEntrega[]>>
  remitos: Remito[]
  setRemitos: React.Dispatch<React.SetStateAction<Remito[]>>
  facturas: Factura[]
  setFacturas: React.Dispatch<React.SetStateAction<Factura[]>>
  recibos: Recibo[]
  setRecibos: React.Dispatch<React.SetStateAction<Recibo[]>>

  // Compras
  ordenesCompra: OrdenCompra[]
  setOrdenesCompra: React.Dispatch<React.SetStateAction<OrdenCompra[]>>
  recepciones: Recepcion[]
  setRecepciones: React.Dispatch<React.SetStateAction<Recepcion[]>>
  facturasCompra: FacturaCompra[]
  setFacturasCompra: React.Dispatch<React.SetStateAction<FacturaCompra[]>>
  ordenesPago: OrdenPago[]
  setOrdenesPago: React.Dispatch<React.SetStateAction<OrdenPago[]>>

  // Tickets
  tickets: Ticket[]
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>
  crearTicket: (ticket: Omit<Ticket, "id" | "numero" | "fecha" | "estado" | "mensajes">) => Ticket

  // Funciones de circuitos
  confirmarNotaVenta: (nvId: number) => void
  confirmarRemito: (remitoId: number) => void
  publicarFactura: (facturaId: number) => void
  cancelarFactura: (facturaId: number, motivo: string) => void
  publicarRecibo: (reciboId: number) => void
  cancelarRecibo: (reciboId: number, motivo: string) => void
  confirmarRecepcion: (recepcionId: number) => void
  registrarFacturaCompra: (factura: Omit<FacturaCompra, "id">) => void
  confirmarOrdenPago: (opId: string) => void
}

const ERPContext = createContext<ERPContextType | undefined>(undefined)

// =====================================================
// DATOS INICIALES
// =====================================================

// Sucursales se cargan desde Supabase
const sucursalesIniciales: Sucursal[] = []

const usuariosIniciales: Usuario[] = [
  { id: 1, username: "admin", nombre: "Administrador", email: "admin@cellhome.com", rol: "admin", sucursal_id: 1, sucursal_nombre: "Puerto Norte", activo: true, ultimo_acceso: "2026-03-16T10:00:00" },
  { id: 2, username: "solinamax", nombre: "Max Solina", email: "max.solina@gmail.com", rol: "vendedor", sucursal_id: 1, sucursal_nombre: "Puerto Norte", activo: true, ultimo_acceso: "2026-03-16T09:00:00" },
  { id: 3, username: "juanperez", nombre: "Juan Pérez", email: "juan@cellhome.com", rol: "cajero", sucursal_id: 2, sucursal_nombre: "Centro", activo: true, ultimo_acceso: "2026-03-15T18:00:00" },
]

const clientesIniciales: Cliente[] = [
  { id: 1, codigo: "CLI-001", nombre: "Alejandra Gallo", tipo_documento: "DNI", numero_documento: "32456789", categoria: "publico", tipo_cliente: "minorista", email: "agallo@email.com", telefono: "0341-4561234", direccion: "Córdoba 1234", ciudad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000", limite_credito: 500000, saldo: 125000, estado: "activo", vendedor_asignado: "Max Solina", condicion_iva: "Consumidor Final" },
  { id: 2, codigo: "CLI-002", nombre: "TechCorp SA", tipo_documento: "CUIT", numero_documento: "30-71234567-9", categoria: "corporativo", tipo_cliente: "mayorista", email: "compras@techcorp.com", telefono: "011-45678900", direccion: "Av. Corrientes 5678", ciudad: "Buenos Aires", provincia: "CABA", codigo_postal: "1043", limite_credito: 2000000, saldo: 890000, estado: "activo", condicion_iva: "Responsable Inscripto" },
  { id: 3, codigo: "CLI-003", nombre: "Roberto Sánchez", tipo_documento: "DNI", numero_documento: "28765432", categoria: "publico", tipo_cliente: "minorista", email: "rsanchez@gmail.com", telefono: "0341-155678901", direccion: "Mendoza 456", ciudad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000", limite_credito: 100000, saldo: 0, estado: "activo", condicion_iva: "Consumidor Final" },
]

// Proveedores se cargan desde Supabase en modulo-compras.tsx
const proveedoresIniciales: Proveedor[] = []

const productosIniciales: Producto[] = [
  { id: 1, sku: "IP15PM-256-BLK", nombre: "iPhone 15 Pro Max 256GB Negro", descripcion: "Apple iPhone 15 Pro Max", categoria: "Smartphones", marca: "Apple", modelo: "iPhone 15 Pro Max", unidad_medida: "UN", precio_costo: 1200000, precio_venta: 1850000, iva: 21, stock_actual: 15, stock_reservado: 3, stock_minimo: 5, estado: "activo" },
  { id: 2, sku: "SS24U-256-GRN", nombre: "Samsung S24 Ultra 256GB Verde", descripcion: "Samsung Galaxy S24 Ultra", categoria: "Smartphones", marca: "Samsung", modelo: "Galaxy S24 Ultra", unidad_medida: "UN", precio_costo: 1100000, precio_venta: 1650000, iva: 21, stock_actual: 20, stock_reservado: 5, stock_minimo: 5, estado: "activo" },
  { id: 3, sku: "AIRPODS-PRO2", nombre: "AirPods Pro 2da Gen", descripcion: "Apple AirPods Pro 2da Generación", categoria: "Accesorios", marca: "Apple", modelo: "AirPods Pro 2", unidad_medida: "UN", precio_costo: 180000, precio_venta: 350000, iva: 21, stock_actual: 50, stock_reservado: 0, stock_minimo: 10, estado: "activo" },
  { id: 4, sku: "CASE-IP15-CLR", nombre: "Funda iPhone 15 Transparente", descripcion: "Funda silicona transparente", categoria: "Accesorios", marca: "Genérico", modelo: "Clear Case", unidad_medida: "UN", precio_costo: 2500, precio_venta: 8000, iva: 21, stock_actual: 200, stock_reservado: 10, stock_minimo: 50, estado: "activo" },
]

// =====================================================
// PROVIDER
// =====================================================

export function ERPProvider({ children }: { children: ReactNode }) {
  // Usuario actual
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [usuarios] = useState<Usuario[]>(usuariosIniciales)

  // Permisos del usuario logueado (cargados desde /api/usuarios/me al loguearse)
  const [isSuperuser, setIsSuperuser] = useState(false)
  const [vistas, setVistas] = useState<Record<string, boolean>>({})
  const [permisos, setPermisos] = useState<Record<string, Record<string, string | boolean>>>({})
  // Si la consulta a /api/usuarios/me devuelve 404 (perfil ERP no cargado todavía),
  // marcamos al usuario como "sin perfil" y le permitimos ver todo (compatibilidad
  // con admin/solinamax/juanperez del array hardcodeado, hasta que se migren a DB).
  const [sinPerfilDB, setSinPerfilDB] = useState(false)

  const canSee = useCallback((modulo: string, subvista?: string): boolean => {
    if (isSuperuser || sinPerfilDB) return true
    if (!modulo) return false
    if (!vistas[modulo]) return false           // módulo apagado → todo OFF
    if (!subvista) return true                  // pregunta solo por el módulo → ON
    const fullKey = `${modulo}.${subvista}`
    return vistas[fullKey] !== false            // sub-vista visible salvo que esté explícitamente apagada
  }, [isSuperuser, sinPerfilDB, vistas])

  const reloadPermisos = async (): Promise<void> => {
    try {
      const res = await fetch("/api/usuarios/me")
      if (res.status === 404) {
        // Perfil ERP no encontrado → modo permisivo (ve todo) hasta que esté en la tabla
        setSinPerfilDB(true)
        setIsSuperuser(false)
        setVistas({})
        setPermisos({})
        return
      }
      if (!res.ok) return
      const me = await res.json()
      setSinPerfilDB(false)
      setIsSuperuser(!!me.is_superuser)
      setVistas(me.vistas ?? {})
      setPermisos(me.permisos ?? {})
    } catch {
      // ignorar
    }
  }

  // Cuando cambia el usuario logueado, recargamos sus permisos desde DB
  useEffect(() => {
    if (currentUser) {
      reloadPermisos()
    } else {
      setIsSuperuser(false)
      setVistas({})
      setPermisos({})
      setSinPerfilDB(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  // Datos maestros
  const [sucursales, setSucursales] = useState<Sucursal[]>(sucursalesIniciales)
  const [sucursalActiva, setSucursalActivaState] = useState<Sucursal | null>(null)

  // Cargar sucursales desde Supabase al iniciar
  useEffect(() => {
    fetch("/api/sucursales")
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: Sucursal[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSucursales(data)
          const guardada = localStorage.getItem("sucursal_activa_id")
          const encontrada = guardada ? data.find(s => s.id === Number(guardada)) : null
          setSucursalActivaState(encontrada ?? data[0])
        }
      })
      .catch(e => console.warn("[v0] sucursales no disponibles:", e.message))
  }, [])

  const setSucursalActiva = (s: Sucursal) => {
    setSucursalActivaState(s)
    localStorage.setItem("sucursal_activa_id", String(s.id))
  }

  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales)
  const [proveedores, setProveedores] = useState<Proveedor[]>(proveedoresIniciales)
  const [productos, setProductos] = useState<Producto[]>(productosIniciales)

  // Cargar productos desde Supabase al iniciar (para tener stock_real actualizado)
  const recargarProductos = async () => {
    try {
      const r = await fetch("/api/productos")
      if (!r.ok) return
      const data = await r.json()
      if (Array.isArray(data) && data.length > 0) setProductos(data)
    } catch { /* fallback a datos iniciales */ }
  }

  useEffect(() => { recargarProductos() }, [])

  // Movimientos
  const [movimientosStock, setMovimientosStock] = useState<MovimientoStock[]>([])
  const [movimientosCtaCte, setMovimientosCtaCte] = useState<MovimientoCtaCte[]>([])

  // Ventas
  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([])
  const [ordenesEntrega, setOrdenesEntrega] = useState<OrdenEntrega[]>([])
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>([])

  // Compras
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [facturasCompra, setFacturasCompra] = useState<FacturaCompra[]>([])
  const [ordenesPago, setOrdenesPago] = useState<OrdenPago[]>([])

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 1,
      numero: "TKT-00001",
      fecha: "2026-03-14T10:30:00",
      usuario_id: 2,
      usuario_nombre: "Max Solina",
      sucursal: "Puerto Norte",
      categoria: "error",
      prioridad: "alta",
      estado: "en_progreso",
      asunto: "Error al generar factura electrónica",
      descripcion: "Cuando intento generar una factura A, el sistema muestra error de conexión con AFIP",
      mensajes: [
        { fecha: "2026-03-14T10:30:00", usuario: "Max Solina", mensaje: "Al intentar facturar la NV-00123, aparece error de timeout con AFIP.", es_soporte: false },
        { fecha: "2026-03-14T11:00:00", usuario: "Soporte Técnico", mensaje: "Estamos revisando la conexión con los servidores de AFIP. Por favor, intentá nuevamente en 30 minutos.", es_soporte: true },
      ]
    }
  ])

  // =====================================================
  // FUNCIONES DE AUTENTICACIÓN
  // =====================================================

  // Registra una fila en `usuario_sesiones` y guarda el id en sessionStorage para poder cerrarla en logout.
  // Best-effort: si algo falla (red, RLS, perfil ERP no cargado), no bloquea el login.
  const registrarSesionEnDB = async (): Promise<void> => {
    try {
      const meRes = await fetch("/api/usuarios/me")
      if (!meRes.ok) return
      const me = await meRes.json()
      if (!me?.id) return
      const sesionRes = await fetch(`/api/usuarios/${me.id}/sesiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "" }),
      })
      if (!sesionRes.ok) return
      const data = await sesionRes.json()
      if (data?.id && typeof window !== "undefined") {
        sessionStorage.setItem("erp:current_session", JSON.stringify({ usuario_id: me.id, sesion_id: data.id }))
      }
    } catch {
      // ignorar
    }
  }

  const cerrarSesionEnDB = async (
    tipo_cierre: "logout_manual" | "expirada" | "invalida" | "forzada" = "logout_manual",
    terminada_por: "usuario" | "sistema" | "administrador" = "usuario",
  ): Promise<void> => {
    try {
      if (typeof window === "undefined") return
      const raw = sessionStorage.getItem("erp:current_session")
      if (!raw) return
      const { usuario_id, sesion_id } = JSON.parse(raw)
      sessionStorage.removeItem("erp:current_session")
      await fetch(`/api/usuarios/${usuario_id}/sesiones/${sesion_id}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_cierre, terminada_por }),
      })
    } catch {
      // ignorar
    }
  }

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const supabase = createClient()
      // Mapear username → email:
      //   1) Si lo que el usuario escribió contiene "@", lo tomamos como email directo.
      //   2) Si no, buscamos primero en el array hardcodeado (admin/solinamax/juanperez).
      //   3) Si no aparece, consultamos la tabla `usuarios` real vía /api/auth/lookup-email.
      let email = username
      if (!username.includes("@")) {
        const userRecord = usuarios.find(
          u => u.username.toLowerCase() === username.toLowerCase()
        )
        if (userRecord) {
          email = userRecord.email
        } else {
          try {
            const lookupRes = await fetch(`/api/auth/lookup-email?username=${encodeURIComponent(username)}`)
            if (lookupRes.ok) {
              const body = await lookupRes.json()
              if (body?.email) email = body.email
            }
          } catch {
            // si falla el lookup, seguimos con `email = username` y signInWithPassword va a fallar como "credenciales inválidas"
          }
        }
      }

      // Paso 1: validar contraseña
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) return { ok: false, reason: "invalid_credentials" }

      // Si el OTP está apagado, le damos acceso directo (sin segundo factor).
      if (!OTP_LOGIN_ENABLED) {
        // 1) Intentamos primero matchear contra el array hardcodeado (admin/solinamax/juanperez)
        let matchedUser = usuarios.find(
          u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
        )

        // 2) Si no aparece, lo buscamos en la tabla `usuarios` real vía /api/usuarios/me
        if (!matchedUser) {
          try {
            const meRes = await fetch("/api/usuarios/me")
            if (meRes.ok) {
              const me = await meRes.json()
              matchedUser = {
                id: me.id,
                username: me.username,
                nombre: me.nombre,
                email: me.email,
                rol: me.is_superuser ? "admin" : "vendedor",
                sucursal_id: me.sucursal_default_id ?? 0,
                sucursal_nombre: me.sucursal_default_nombre ?? "",
                activo: !!me.is_active,
                ultimo_acceso: me.last_login_at ?? new Date().toISOString(),
                avatar: me.avatar_url ?? undefined,
              }
            }
          } catch {
            // si no hay perfil ERP, dejamos matchedUser undefined y arriba va a quedar sin currentUser
          }
        }

        if (matchedUser) {
          setCurrentUser({ ...matchedUser, ultimo_acceso: new Date().toISOString() })
        }
        // Registrar la sesión en la tabla `usuario_sesiones` (best-effort, no bloquea el login)
        registrarSesionEnDB().catch(() => {})
        return { ok: true, requiresOtp: false }
      }

      // Paso 2: cerramos esa sesión — no le damos acceso al ERP hasta que verifique el OTP
      await supabase.auth.signOut()

      // Paso 3: mandamos el código de 6 dígitos al mail
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (otpError) return { ok: false, reason: "otp_send_failed" }

      return { ok: true, requiresOtp: true, email }
    } catch {
      return { ok: false, reason: "network" }
    }
  }

  const verifyLoginOtp = async (email: string, token: string): Promise<boolean> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" })
      if (error || !data.session) return false

      const matchedUser = usuarios.find(
        u => u.email.toLowerCase() === email.toLowerCase()
      )
      if (matchedUser) {
        setCurrentUser({ ...matchedUser, ultimo_acceso: new Date().toISOString() })
      }
      registrarSesionEnDB().catch(() => {})
      return true
    } catch {
      return false
    }
  }

  const resendLoginOtp = async (email: string): Promise<boolean> => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      return !error
    } catch {
      return false
    }
  }

  const logout = () => {
    cerrarSesionEnDB("logout_manual", "usuario").catch(() => {})
    const supabase = createClient()
    supabase.auth.signOut().catch(() => {})
    setCurrentUser(null)
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    // Simular cambio de contraseña
    if (oldPassword.length >= 4 && newPassword.length >= 6) {
      return true
    }
    return false
  }

  // =====================================================
  // FUNCIONES DE TICKETS
  // =====================================================

  const crearTicket = (ticketData: Omit<Ticket, "id" | "numero" | "fecha" | "estado" | "mensajes">): Ticket => {
    const nuevoTicket: Ticket = {
      ...ticketData,
      id: tickets.length + 1,
      numero: `TKT-${String(tickets.length + 1).padStart(5, "0")}`,
      fecha: new Date().toISOString(),
      estado: "abierto",
      mensajes: [{
        fecha: new Date().toISOString(),
        usuario: ticketData.usuario_nombre,
        mensaje: ticketData.descripcion,
        es_soporte: false
      }]
    }
    setTickets(prev => [...prev, nuevoTicket])
    return nuevoTicket
  }

  // =====================================================
  // FUNCIONES DE CIRCUITOS - VENTAS
  // =====================================================

  const confirmarNotaVenta = (nvId: number) => {
    setNotasVenta(prev => prev.map(nv => {
      if (nv.id === nvId && nv.estado === "borrador") {
        // Reservar stock de cada producto
        nv.items.forEach(item => {
          // Registrar movimiento de reserva
          const movimiento: MovimientoStock = {
            id: movimientosStock.length + 1,
            fecha: new Date().toISOString(),
            producto_id: item.producto_id,
            tipo: "reserva",
            cantidad: item.cantidad,
            documento_tipo: "NV",
            documento_numero: nv.numero,
            usuario: currentUser?.nombre || "Sistema",
            observaciones: `Reserva por confirmación de NV`
          }
          setMovimientosStock(prev => [...prev, movimiento])

          // Actualizar stock reservado del producto
          setProductos(prev => prev.map(p => 
            p.id === item.producto_id 
              ? { ...p, stock_reservado: p.stock_reservado + item.cantidad }
              : p
          ))
        })

        return { ...nv, estado: "confirmada" as const }
      }
      return nv
    }))
  }

  const confirmarRemito = (remitoId: number) => {
    setRemitos(prev => prev.map(rem => {
      if (rem.id === remitoId && rem.estado === "borrador") {
        // Descontar stock físico
        rem.items.forEach(item => {
          // Registrar movimiento de egreso
          const movimiento: MovimientoStock = {
            id: movimientosStock.length + 1,
            fecha: new Date().toISOString(),
            producto_id: item.producto_id,
            tipo: "egreso",
            cantidad: item.cantidad,
            documento_tipo: "REM",
            documento_numero: rem.numero,
            usuario: currentUser?.nombre || "Sistema",
            observaciones: `Entrega por remito`
          }
          setMovimientosStock(prev => [...prev, movimiento])

          // Liberar reserva y descontar stock
          setProductos(prev => prev.map(p => 
            p.id === item.producto_id 
              ? { 
                  ...p, 
                  stock_actual: p.stock_actual - item.cantidad,
                  stock_reservado: Math.max(0, p.stock_reservado - item.cantidad)
                }
              : p
          ))
        })

        return { ...rem, estado: "confirmado" as const }
      }
      return rem
    }))
  }

  const publicarFactura = (facturaId: number) => {
    setFacturas(prev => prev.map(fac => {
      if (fac.id === facturaId && fac.estado === "borrador") {
        // Registrar movimiento en cuenta corriente
        const movimiento: MovimientoCtaCte = {
          id: movimientosCtaCte.length + 1,
          fecha: new Date().toISOString(),
          entidad_tipo: "cliente",
          entidad_id: fac.cliente_id,
          tipo: "factura",
          documento_numero: fac.numero,
          concepto: `Factura ${fac.numero}`,
          debe: fac.total,
          haber: 0,
          saldo_parcial: 0,
          usuario: currentUser?.nombre || "Sistema"
        }
        setMovimientosCtaCte(prev => [...prev, movimiento])

        // Actualizar saldo del cliente
        setClientes(prev => prev.map(c => 
          c.id === fac.cliente_id 
            ? { ...c, saldo: c.saldo + fac.total }
            : c
        ))

        return { ...fac, estado: "publicada" as const, saldo: fac.total }
      }
      return fac
    }))
  }

  const cancelarFactura = (facturaId: number, motivo: string) => {
    setFacturas(prev => prev.map(fac => {
      if (fac.id === facturaId && fac.estado === "publicada") {
        // Revertir movimiento en cuenta corriente
        const movimiento: MovimientoCtaCte = {
          id: movimientosCtaCte.length + 1,
          fecha: new Date().toISOString(),
          entidad_tipo: "cliente",
          entidad_id: fac.cliente_id,
          tipo: "ajuste",
          documento_numero: fac.numero,
          concepto: `Anulación Factura: ${motivo}`,
          debe: 0,
          haber: fac.total,
          saldo_parcial: 0,
          usuario: currentUser?.nombre || "Sistema"
        }
        setMovimientosCtaCte(prev => [...prev, movimiento])

        // Revertir saldo del cliente
        setClientes(prev => prev.map(c => 
          c.id === fac.cliente_id 
            ? { ...c, saldo: c.saldo - fac.total }
            : c
        ))

        return { ...fac, estado: "cancelada" as const }
      }
      return fac
    }))
  }

  const publicarRecibo = (reciboId: number) => {
    setRecibos(prev => prev.map(rec => {
      if (rec.id === reciboId && rec.estado === "borrador") {
        // Registrar movimiento en cuenta corriente
        const movimiento: MovimientoCtaCte = {
          id: movimientosCtaCte.length + 1,
          fecha: new Date().toISOString(),
          entidad_tipo: "cliente",
          entidad_id: rec.cliente_id,
          tipo: "recibo",
          documento_numero: rec.numero,
          concepto: `Recibo ${rec.numero}`,
          debe: 0,
          haber: rec.importe,
          saldo_parcial: 0,
          usuario: currentUser?.nombre || "Sistema"
        }
        setMovimientosCtaCte(prev => [...prev, movimiento])

        // Actualizar saldo del cliente
        setClientes(prev => prev.map(c => 
          c.id === rec.cliente_id 
            ? { ...c, saldo: c.saldo - rec.importe }
            : c
        ))

        // Si tiene factura vinculada, actualizar saldo de la factura
        if (rec.factura_id) {
          setFacturas(prev => prev.map(f => 
            f.id === rec.factura_id
              ? { 
                  ...f, 
                  saldo: Math.max(0, f.saldo - rec.importe),
                  estado: f.saldo - rec.importe <= 0 ? "pagada" as const : f.estado
                }
              : f
          ))
        }

        return { ...rec, estado: "publicado" as const }
      }
      return rec
    }))
  }

  const cancelarRecibo = (reciboId: number, motivo: string) => {
    setRecibos(prev => prev.map(rec => {
      if (rec.id === reciboId && rec.estado === "publicado") {
        // Revertir movimiento en cuenta corriente
        const movimiento: MovimientoCtaCte = {
          id: movimientosCtaCte.length + 1,
          fecha: new Date().toISOString(),
          entidad_tipo: "cliente",
          entidad_id: rec.cliente_id,
          tipo: "ajuste",
          documento_numero: rec.numero,
          concepto: `Anulación Recibo: ${motivo}`,
          debe: rec.importe,
          haber: 0,
          saldo_parcial: 0,
          usuario: currentUser?.nombre || "Sistema"
        }
        setMovimientosCtaCte(prev => [...prev, movimiento])

        // Revertir saldo del cliente
        setClientes(prev => prev.map(c => 
          c.id === rec.cliente_id 
            ? { ...c, saldo: c.saldo + rec.importe }
            : c
        ))

        return { ...rec, estado: "cancelado" as const }
      }
      return rec
    }))
  }

  // =====================================================
  // FUNCIONES DE CIRCUITOS - COMPRAS
  // =====================================================

  const confirmarRecepcion = (recepcionId: number) => {
    setRecepciones(prev => prev.map(rec => {
      if (rec.id === recepcionId && rec.estado === "borrador") {
        // Ingresar stock
        rec.items.forEach(item => {
          const movimiento: MovimientoStock = {
            id: movimientosStock.length + 1,
            fecha: new Date().toISOString(),
            producto_id: item.producto_id,
            tipo: "ingreso",
            cantidad: item.cantidad,
            documento_tipo: "REC",
            documento_numero: rec.numero,
            usuario: currentUser?.nombre || "Sistema",
            observaciones: `Recepción de compra`
          }
          setMovimientosStock(prev => [...prev, movimiento])

          setProductos(prev => prev.map(p => 
            p.id === item.producto_id 
              ? { ...p, stock_actual: p.stock_actual + item.cantidad }
              : p
          ))
        })

        // Actualizar cantidades recibidas en OC
        setOrdenesCompra(prev => prev.map(oc => {
          if (oc.id === rec.orden_compra_id) {
            const nuevosItems = oc.items.map(ocItem => {
              const recItem = rec.items.find(ri => ri.producto_id === ocItem.producto_id)
              return recItem 
                ? { ...ocItem, cantidad_recibida: ocItem.cantidad_recibida + recItem.cantidad }
                : ocItem
            })
            const todoRecibido = nuevosItems.every(i => i.cantidad_recibida >= i.cantidad)
            return { 
              ...oc, 
              items: nuevosItems,
              estado: todoRecibido ? "completa" as const : "parcial" as const
            }
          }
          return oc
        }))

        return { ...rec, estado: "confirmada" as const }
      }
      return rec
    }))
  }

  const registrarFacturaCompra = (facturaData: Omit<FacturaCompra, "id">) => {
    const nuevaFactura: FacturaCompra = {
      ...facturaData,
      id: facturasCompra.length + 1
    }
    setFacturasCompra(prev => [...prev, nuevaFactura])

    // Registrar en cuenta corriente del proveedor
    const movimiento: MovimientoCtaCte = {
      id: movimientosCtaCte.length + 1,
      fecha: new Date().toISOString(),
      entidad_tipo: "proveedor",
      entidad_id: facturaData.proveedor_id,
      tipo: "factura",
      documento_numero: facturaData.numero,
      concepto: `Factura ${facturaData.tipo}-${facturaData.numero}`,
      debe: facturaData.total,
      haber: 0,
      saldo_parcial: 0,
      usuario: currentUser?.nombre || "Sistema"
    }
    setMovimientosCtaCte(prev => [...prev, movimiento])

    // Actualizar saldo del proveedor
    setProveedores(prev => prev.map(p => 
      p.id === facturaData.proveedor_id 
        ? { ...p, saldo: p.saldo + facturaData.total }
        : p
    ))
  }

  const confirmarOrdenPago = (opId: string) => {
    setOrdenesPago(prev => prev.map(op => {
      if (op.id === opId && op.estado === "borrador") {
        return { ...op, estado: "publicado" as const }
      }
      return op
    }))
  }

  // =====================================================
  // VALOR DEL CONTEXTO
  // =====================================================

  const value: ERPContextType = {
    // Usuario
    currentUser,
    setCurrentUser,
    isAuthenticated: currentUser !== null,
    login,
    verifyLoginOtp,
    resendLoginOtp,
    logout,
    changePassword,

    // Permisos
    isSuperuser,
    vistas,
    permisos,
    canSee,
    reloadPermisos,

      // Datos maestros
      sucursales,
      setSucursales,
      sucursalActiva,
      setSucursalActiva,
      usuarios,
      clientes,
    setClientes,
    proveedores,
    setProveedores,
    productos,
    setProductos,
    recargarProductos,

    // Movimientos
    movimientosStock,
    setMovimientosStock,
    movimientosCtaCte,
    setMovimientosCtaCte,

    // Ventas
    notasVenta,
    setNotasVenta,
    ordenesEntrega,
    setOrdenesEntrega,
    remitos,
    setRemitos,
    facturas,
    setFacturas,
    recibos,
    setRecibos,

    // Compras
    ordenesCompra,
    setOrdenesCompra,
    recepciones,
    setRecepciones,
    facturasCompra,
    setFacturasCompra,
    ordenesPago,
    setOrdenesPago,

    // Tickets
    tickets,
    setTickets,
    crearTicket,

    // Funciones de circuitos
    confirmarNotaVenta,
    confirmarRemito,
    publicarFactura,
    cancelarFactura,
    publicarRecibo,
    cancelarRecibo,
    confirmarRecepcion,
    registrarFacturaCompra,
    confirmarOrdenPago,
  }

  return <ERPContext.Provider value={value}>{children}</ERPContext.Provider>
}

// =====================================================
// HOOK
// =====================================================

export function useERP() {
  const context = useContext(ERPContext)
  if (context === undefined) {
    throw new Error("useERP debe usarse dentro de un ERPProvider")
  }
  return context
}
