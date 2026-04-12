"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

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
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "emitida" | "pagada"
  facturas: number[]
  monto: number
  forma_pago: string
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

interface ERPContextType {
  // Usuario actual
  currentUser: Usuario | null
  setCurrentUser: (user: Usuario | null) => void
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>

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
  confirmarOrdenPago: (opId: number) => void
}

const ERPContext = createContext<ERPContextType | undefined>(undefined)

// =====================================================
// DATOS INICIALES
// =====================================================

// Sucursales se cargan desde Supabase
const sucursalesIniciales: Sucursal[] = []

const usuariosIniciales: Usuario[] = [
  { id: 1, username: "admin", nombre: "Administrador", email: "admin@cellhome.com", rol: "admin", sucursal_id: 1, sucursal_nombre: "Puerto Norte", activo: true, ultimo_acceso: "2026-03-16T10:00:00" },
  { id: 2, username: "solinamax", nombre: "Max Solina", email: "max@cellhome.com", rol: "vendedor", sucursal_id: 1, sucursal_nombre: "Puerto Norte", activo: true, ultimo_acceso: "2026-03-16T09:00:00" },
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

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simular autenticación (en producción sería una llamada a API)
    const user = usuarios.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (user && password.length >= 4) { // Simulación simple
      setCurrentUser({
        ...user,
        ultimo_acceso: new Date().toISOString()
      })
      return true
    }
    return false
  }

  const logout = () => {
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

  const confirmarOrdenPago = (opId: number) => {
    setOrdenesPago(prev => prev.map(op => {
      if (op.id === opId && op.estado !== "pagada") {
        // Registrar en cuenta corriente
        const movimiento: MovimientoCtaCte = {
          id: movimientosCtaCte.length + 1,
          fecha: new Date().toISOString(),
          entidad_tipo: "proveedor",
          entidad_id: op.proveedor_id,
          tipo: "orden_pago",
          documento_numero: op.numero,
          concepto: `Orden de Pago ${op.numero}`,
          debe: 0,
          haber: op.monto,
          saldo_parcial: 0,
          usuario: currentUser?.nombre || "Sistema"
        }
        setMovimientosCtaCte(prev => [...prev, movimiento])

        // Actualizar saldo del proveedor
        setProveedores(prev => prev.map(p => 
          p.id === op.proveedor_id 
            ? { ...p, saldo: p.saldo - op.monto }
            : p
        ))

        // Actualizar saldos de facturas vinculadas
        setFacturasCompra(prev => prev.map(fac => {
          if (op.facturas.includes(fac.id)) {
            const nuevoSaldo = Math.max(0, fac.saldo - op.monto)
            return { 
              ...fac, 
              saldo: nuevoSaldo,
              estado: nuevoSaldo <= 0 ? "pagada" as const : fac.estado
            }
          }
          return fac
        }))

        return { ...op, estado: "pagada" as const }
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
    logout,
    changePassword,

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
