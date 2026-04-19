"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import ModuloHome from "@/components/modulo-home"
import ModuloVentas, { type ClienteVenta } from "@/components/ventas-module"
import ModuloCompras from "@/components/modulo-compras-v2"
import ModuloStock from "@/components/modulo-stock"
import ModuloInformes from "@/components/modulo-informes"
import ModuloContabilidad from "@/components/modulo-contabilidad"
import ModuloFinanzas from "@/components/modulo-finanzas"
import ERPWrapper from "@/components/erp-wrapper"
import ModuloConfigSucursales from "@/components/modulo-config-sucursales"
import ModuloTaller from "@/components/modulo-taller"

// Types
interface Cliente {
  id: number
  nombre: string
  telefono: string
  email: string
  direccion: string
  categoria: "publico" | "mayorista"
  orden_asignacion: number
}

interface Tecnico {
  id: number
  nombre: string
  especialidad: string
  activo: boolean
  tipo: "propio" | "tercero"
  categoria_reparacion_id: number | null
  categorias_secundarias: number[]
  complejidad_tope: number
  turno: "manana" | "tarde" | "completo"
  tiempo_asignado: number // minutos de trabajo asignado actualmente
}

interface Area {
  id: number
  nombre: string
  descripcion: string
  orden_asignacion: number
}

interface TipoOT {
  id: number
  nombre: string
  area_id: number
  busca_garantia_compra: boolean
  busca_garantia_reparacion: boolean
  campos_visibles: string[] // campos que se muestran en el formulario
}

interface CategoriaReparacion {
  id: number
  nombre: string
  area_id: number
  orden_asignacion: number
}

interface Equipo {
  id: number
  codigo: string
  nombre: string
  marca: string
  modelo: string
  area_id: number
  dias_garantia_compra: number
  dias_garantia_reparacion: number
}

interface Falla {
  id: number
  nombre: string
  descripcion: string
  equipo_id: number
  categoria_reparacion_id: number
  activo: boolean
}

interface FallaEquipo {
  id: number
  equipo_id: number
  falla_id: number
  complejidad_principal: number
  complejidad_secundaria: number
  tiempo_reparacion_principal: number // minutos
  tiempo_reparacion_secundaria: number
  repuestos: { producto_id: number; cantidad: number }[]
}

interface ControlChecklist {
  id: number
  area_id: number
  categoria_reparacion_id: number | null
  detalle: string
  disponible_recepcion: boolean
  disponible_calidad: boolean
  requiere_observacion: boolean
}

interface ControlOT {
  id: number
  orden_id: number
  checklist_id: number
  estado_recepcion: "ok" | "mal" | "na" | null
  estado_calidad: "ok" | "mal" | "na" | null
  observacion_recepcion: string
  observacion_calidad: string
}

interface Producto {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  precio_venta: number
  precio_costo: number
  stock: number
  tipo: "repuesto" | "servicio" | "accesorio"
}

interface RepuestoOT {
  id: number
  orden_id: number
  producto_id: number
  producto_nombre?: string
  cantidad: number
  precio_unitario: number
  descuento: number
  total: number
}

interface OrdenTrabajo {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre?: string
  tecnico_id: number | null
  tecnico_nombre?: string
  equipo_id: number
  equipo_nombre?: string
  falla_principal_id: number
  falla_principal_nombre?: string
  fallas_secundarias: number[]
  area_id: number
  tipo_ot_id: number
  categoria_reparacion_id: number
  estado: string
  imei: string
  serial: string
  codigo_desbloqueo: string
  ingresa_apagado: boolean
  ingresa_mojado: boolean
  deja_cargador: boolean
  requerido_mkt: boolean
  tipo_tecnico: "propios" | "terceros" | "ambos"
  factura_asociada: string // para garantias de compra
  ot_anterior_id: number | null // para garantias de reparacion
  presupuesto: number
  descripcion: string
  celular_contacto: string
  tiempo_estimado: number // minutos
  tiempo_real: number // minutos
  fecha_inicio_trabajo: string | null
  puntaje_tecnico: number | null
  historial_reasignaciones: { fecha: string; tecnico_anterior_id: number | null; tecnico_nuevo_id: number; motivo: string }[]
  fecha_creacion: string
  fecha_actualizacion: string
}

interface EtapaOT {
  id: number
  orden_id: number
  estado_anterior: string
  estado_nuevo: string
  usuario: string
  fecha: string
  observacion: string
}

interface Etapa {
  fecha: string
  estado: string
  usuario: string
  observacion: string
}

// Filter System Types
interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string
}

interface FilterConfig {
  searchPlaceholder: string
  quickFilters: { id: string; label: string; field: string; operator: string; value: string | boolean }[]
  dateFilters: { id: string; label: string; field: string; range: "today" | "week" | "month" | "lastMonth" | "year" | "lastYear" }[]
  groupByOptions: { field: string; label: string }[]
  filterFields: { field: string; label: string; type: "text" | "select" | "number" | "date"; options?: { value: string; label: string }[] }[]
}

// Mock Data
const mockClientes: Cliente[] = [
  { id: 1, nombre: "Juan Pérez", telefono: "555-1234", email: "juan@email.com", direccion: "Calle 1 #100", categoria: "publico", orden_asignacion: 2 },
  { id: 2, nombre: "María García", telefono: "555-5678", email: "maria@email.com", direccion: "Av. Principal #200", categoria: "mayorista", orden_asignacion: 1 },
  { id: 3, nombre: "Carlos López", telefono: "555-9012", email: "carlos@email.com", direccion: "Zona Centro #50", categoria: "publico", orden_asignacion: 2 },
]

const mockTecnicos: Tecnico[] = [
  { id: 1, nombre: "Pedro Martínez", especialidad: "Celulares", activo: true, tipo: "propio", categoria_reparacion_id: 1, categorias_secundarias: [2], complejidad_tope: 5, turno: "manana", tiempo_asignado: 120 },
  { id: 2, nombre: "Ana Rodríguez", especialidad: "Tablets", activo: true, tipo: "propio", categoria_reparacion_id: 2, categorias_secundarias: [1], complejidad_tope: 4, turno: "tarde", tiempo_asignado: 60 },
  { id: 3, nombre: "Luis Sánchez", especialidad: "Laptops", activo: true, tipo: "tercero", categoria_reparacion_id: 3, categorias_secundarias: [], complejidad_tope: 5, turno: "completo", tiempo_asignado: 180 },
]

const mockAreas: Area[] = [
  { id: 1, nombre: "Celulares", descripcion: "Reparación de teléfonos celulares", orden_asignacion: 1 },
  { id: 2, nombre: "Tablets", descripcion: "Reparación de tablets", orden_asignacion: 2 },
  { id: 3, nombre: "Laptops", descripcion: "Reparación de laptops y computadoras", orden_asignacion: 3 },
]

const mockCategoriasReparacion: CategoriaReparacion[] = [
  { id: 1, nombre: "Cambio de piezas", area_id: 1, orden_asignacion: 1 },
  { id: 2, nombre: "Microelectrónica", area_id: 1, orden_asignacion: 2 },
  { id: 3, nombre: "Re-manufacturación", area_id: 1, orden_asignacion: 3 },
  { id: 4, nombre: "Cambio de piezas", area_id: 2, orden_asignacion: 1 },
  { id: 5, nombre: "Cambio de piezas", area_id: 3, orden_asignacion: 1 },
]

const mockTiposOT: TipoOT[] = [
  { id: 1, nombre: "Reparación", area_id: 1, busca_garantia_compra: false, busca_garantia_reparacion: false, campos_visibles: ["imei", "codigo_desbloqueo"] },
  { id: 2, nombre: "Garantía Compra", area_id: 1, busca_garantia_compra: true, busca_garantia_reparacion: false, campos_visibles: ["imei", "factura_asociada"] },
  { id: 3, nombre: "Garantía Reparación", area_id: 1, busca_garantia_compra: false, busca_garantia_reparacion: true, campos_visibles: ["imei", "ot_anterior"] },
  { id: 4, nombre: "Diagnóstico", area_id: 1, busca_garantia_compra: false, busca_garantia_reparacion: false, campos_visibles: ["imei"] },
  { id: 5, nombre: "Reparación", area_id: 2, busca_garantia_compra: false, busca_garantia_reparacion: false, campos_visibles: ["serial"] },
  { id: 6, nombre: "Reparación", area_id: 3, busca_garantia_compra: false, busca_garantia_reparacion: false, campos_visibles: ["serial"] },
]

const mockEquipos: Equipo[] = [
  { id: 1, codigo: "EQ001", nombre: "iPhone 14 Pro", marca: "Apple", modelo: "A2893", area_id: 1, dias_garantia_compra: 365, dias_garantia_reparacion: 90 },
  { id: 2, codigo: "EQ002", nombre: "Samsung Galaxy S23", marca: "Samsung", modelo: "SM-S911B", area_id: 1, dias_garantia_compra: 365, dias_garantia_reparacion: 90 },
  { id: 3, codigo: "EQ003", nombre: "iPad Pro 11", marca: "Apple", modelo: "A2301", area_id: 2, dias_garantia_compra: 365, dias_garantia_reparacion: 90 },
  { id: 4, codigo: "EQ004", nombre: "MacBook Pro 14", marca: "Apple", modelo: "M3 Pro", area_id: 3, dias_garantia_compra: 365, dias_garantia_reparacion: 90 },
]

const mockFallas: Falla[] = [
  { id: 1, nombre: "Pantalla rota", descripcion: "Pantalla dañada o agrietada", equipo_id: 1, categoria_reparacion_id: 1, activo: true },
  { id: 2, nombre: "Batería agotada", descripcion: "Batería no carga o dura poco", equipo_id: 1, categoria_reparacion_id: 1, activo: true },
  { id: 3, nombre: "No enciende", descripcion: "El equipo no enciende", equipo_id: 1, categoria_reparacion_id: 2, activo: true },
  { id: 4, nombre: "Pantalla rota", descripcion: "Pantalla dañada", equipo_id: 2, categoria_reparacion_id: 1, activo: true },
  { id: 5, nombre: "Cámara dañada", descripcion: "Cámara no funciona", equipo_id: 2, categoria_reparacion_id: 1, activo: true },
  { id: 6, nombre: "Placa dañada", descripcion: "Falla en placa madre", equipo_id: 1, categoria_reparacion_id: 2, activo: true },
]

const mockFallasEquipos: FallaEquipo[] = [
  { id: 1, equipo_id: 1, falla_id: 1, complejidad_principal: 2, complejidad_secundaria: 1, tiempo_reparacion_principal: 60, tiempo_reparacion_secundaria: 30, repuestos: [{ producto_id: 1, cantidad: 1 }] },
  { id: 2, equipo_id: 1, falla_id: 2, complejidad_principal: 2, complejidad_secundaria: 1, tiempo_reparacion_principal: 45, tiempo_reparacion_secundaria: 20, repuestos: [{ producto_id: 2, cantidad: 1 }] },
  { id: 3, equipo_id: 1, falla_id: 3, complejidad_principal: 4, complejidad_secundaria: 2, tiempo_reparacion_principal: 120, tiempo_reparacion_secundaria: 60, repuestos: [] },
  { id: 4, equipo_id: 2, falla_id: 4, complejidad_principal: 2, complejidad_secundaria: 1, tiempo_reparacion_principal: 60, tiempo_reparacion_secundaria: 30, repuestos: [{ producto_id: 3, cantidad: 1 }] },
]

const mockProductos: Producto[] = [
  { id: 1, codigo: "REP001", nombre: "Pantalla iPhone 14 Pro", descripcion: "Pantalla OLED original", precio_venta: 250, precio_costo: 150, stock: 10, tipo: "repuesto" },
  { id: 2, codigo: "REP002", nombre: "Batería iPhone 14 Pro", descripcion: "Batería original Apple", precio_venta: 80, precio_costo: 45, stock: 15, tipo: "repuesto" },
  { id: 3, codigo: "REP003", nombre: "Pantalla Samsung S23", descripcion: "Pantalla AMOLED original", precio_venta: 220, precio_costo: 130, stock: 8, tipo: "repuesto" },
  { id: 4, codigo: "SRV001", nombre: "Mano de obra básica", descripcion: "Servicio de reparación estándar", precio_venta: 30, precio_costo: 0, stock: 999, tipo: "servicio" },
  { id: 5, codigo: "SRV002", nombre: "Diagnóstico avanzado", descripcion: "Diagnóstico con microscopio", precio_venta: 50, precio_costo: 0, stock: 999, tipo: "servicio" },
]

const mockControlChecklist: ControlChecklist[] = [
  { id: 1, area_id: 1, categoria_reparacion_id: null, detalle: "Pantalla sin rayaduras", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 2, area_id: 1, categoria_reparacion_id: null, detalle: "Botones funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 3, area_id: 1, categoria_reparacion_id: null, detalle: "Cámara funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 4, area_id: 1, categoria_reparacion_id: null, detalle: "Altavoz funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 5, area_id: 1, categoria_reparacion_id: null, detalle: "Micrófono funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 6, area_id: 1, categoria_reparacion_id: null, detalle: "Touch funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 7, area_id: 1, categoria_reparacion_id: null, detalle: "Face ID / Huella funcionando", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 8, area_id: 1, categoria_reparacion_id: null, detalle: "Carga inalámbrica", disponible_recepcion: true, disponible_calidad: true, requiere_observacion: false },
  { id: 9, area_id: 1, categoria_reparacion_id: 2, detalle: "Soldaduras verificadas", disponible_recepcion: false, disponible_calidad: true, requiere_observacion: true },
]

const estadosOT = [
  { value: "borrador", label: "Borrador", color: "bg-gray-200 text-gray-700" },
  { value: "asignada_sin_resolucion", label: "Asignada sin resolución", color: "bg-orange-100 text-orange-700" },
  { value: "asignada_en_proceso", label: "Asignada en proceso", color: "bg-blue-100 text-blue-700" },
  { value: "re_presupuestacion", label: "Re-presupuestación", color: "bg-pink-100 text-pink-700" },
  { value: "falta_repuestos", label: "Falta repuestos", color: "bg-red-100 text-red-700" },
  { value: "control_calidad", label: "Control de calidad", color: "bg-purple-100 text-purple-700" },
  { value: "facturado", label: "Facturado", color: "bg-green-100 text-green-700" },
  { value: "a_entregar", label: "A entregar", color: "bg-teal-100 text-teal-700" },
  { value: "entregado", label: "Entregado", color: "bg-emerald-200 text-emerald-800" },
]

const mockOrdenes: OrdenTrabajo[] = [
  {
    id: 1,
    numero: "OT-2024-001",
    cliente_id: 1,
    cliente_nombre: "Juan Pérez",
    tecnico_id: 1,
    tecnico_nombre: "Pedro Martínez",
    equipo_id: 1,
    equipo_nombre: "iPhone 14 Pro",
    falla_principal_id: 1,
    falla_principal_nombre: "Pantalla rota",
    fallas_secundarias: [2],
    area_id: 1,
    tipo_ot_id: 1,
    categoria_reparacion_id: 1,
    estado: "asignada_en_proceso",
    imei: "123456789012345",
    serial: "",
    codigo_desbloqueo: "1234",
    ingresa_apagado: false,
    ingresa_mojado: false,
    deja_cargador: true,
    requerido_mkt: false,
    tipo_tecnico: "propios",
    factura_asociada: "",
    ot_anterior_id: null,
    presupuesto: 150.00,
    descripcion: "Pantalla con grietas en la esquina superior derecha",
    celular_contacto: "555-1234",
    tiempo_estimado: 60,
    tiempo_real: 0,
    fecha_inicio_trabajo: null,
    puntaje_tecnico: null,
    historial_reasignaciones: [],
    fecha_creacion: "2024-01-15",
    fecha_actualizacion: "2024-01-16",
  },
  {
    id: 2,
    numero: "OT-2024-002",
    cliente_id: 2,
    cliente_nombre: "María García",
    tecnico_id: null,
    tecnico_nombre: undefined,
    equipo_id: 2,
    equipo_nombre: "Samsung Galaxy S23",
    falla_principal_id: 4,
    falla_principal_nombre: "Pantalla rota",
    fallas_secundarias: [],
    area_id: 1,
    tipo_ot_id: 1,
    categoria_reparacion_id: 1,
    estado: "borrador",
    imei: "987654321098765",
    serial: "",
    codigo_desbloqueo: "",
    ingresa_apagado: true,
    ingresa_mojado: false,
    deja_cargador: false,
    requerido_mkt: true,
    tipo_tecnico: "ambos",
    factura_asociada: "",
    ot_anterior_id: null,
    presupuesto: 200.00,
    descripcion: "Equipo no enciende después de caída",
    celular_contacto: "555-5678",
    tiempo_estimado: 60,
    tiempo_real: 0,
    fecha_inicio_trabajo: null,
    puntaje_tecnico: null,
    historial_reasignaciones: [],
    fecha_creacion: "2024-01-16",
    fecha_actualizacion: "2024-01-16",
  },
  {
    id: 3,
    numero: "OT-2024-003",
    cliente_id: 3,
    cliente_nombre: "Carlos López",
    tecnico_id: 2,
    tecnico_nombre: "Ana Rodríguez",
    equipo_id: 1,
    equipo_nombre: "iPhone 14 Pro",
    falla_principal_id: 2,
    falla_principal_nombre: "Batería agotada",
    fallas_secundarias: [],
    area_id: 1,
    tipo_ot_id: 1,
    categoria_reparacion_id: 1,
    estado: "control_calidad",
    imei: "111222333444555",
    serial: "",
    codigo_desbloqueo: "0000",
    ingresa_apagado: false,
    ingresa_mojado: false,
    deja_cargador: true,
    requerido_mkt: false,
    tipo_tecnico: "propios",
    factura_asociada: "",
    ot_anterior_id: null,
    presupuesto: 80.00,
    descripcion: "Batería dura menos de 2 horas",
    celular_contacto: "555-9012",
    tiempo_estimado: 45,
    tiempo_real: 40,
    fecha_inicio_trabajo: "2024-01-12T09:00:00",
    puntaje_tecnico: 95,
    historial_reasignaciones: [],
    fecha_creacion: "2024-01-10",
    fecha_actualizacion: "2024-01-15",
  },
  {
    id: 4,
    numero: "OT-2024-004",
    cliente_id: 1,
    cliente_nombre: "Juan Pérez",
    tecnico_id: 1,
    tecnico_nombre: "Pedro Martínez",
    equipo_id: 1,
    equipo_nombre: "iPhone 14 Pro",
    falla_principal_id: 3,
    falla_principal_nombre: "No enciende",
    fallas_secundarias: [6],
    area_id: 1,
    tipo_ot_id: 1,
    categoria_reparacion_id: 2,
    estado: "re_presupuestacion",
    imei: "555666777888999",
    serial: "",
    codigo_desbloqueo: "5678",
    ingresa_apagado: true,
    ingresa_mojado: true,
    deja_cargador: false,
    requerido_mkt: false,
    tipo_tecnico: "propios",
    factura_asociada: "",
    ot_anterior_id: null,
    presupuesto: 100.00,
    descripcion: "Se detectó daño en placa, requiere re-presupuestar",
    celular_contacto: "555-1234",
    tiempo_estimado: 120,
    tiempo_real: 30,
    fecha_inicio_trabajo: "2024-01-17T10:00:00",
    puntaje_tecnico: null,
    historial_reasignaciones: [],
    fecha_creacion: "2024-01-17",
    fecha_actualizacion: "2024-01-18",
  },
  {
    id: 5,
    numero: "OT-2024-005",
    cliente_id: 2,
    cliente_nombre: "María García",
    tecnico_id: 3,
    tecnico_nombre: "Luis Sánchez",
    equipo_id: 1,
    equipo_nombre: "iPhone 14 Pro",
    falla_principal_id: 1,
    falla_principal_nombre: "Pantalla rota",
    fallas_secundarias: [],
    area_id: 1,
    tipo_ot_id: 1,
    categoria_reparacion_id: 1,
    estado: "falta_repuestos",
    imei: "999888777666555",
    serial: "",
    codigo_desbloqueo: "",
    ingresa_apagado: false,
    ingresa_mojado: false,
    deja_cargador: true,
    requerido_mkt: false,
    tipo_tecnico: "terceros",
    factura_asociada: "",
    ot_anterior_id: null,
    presupuesto: 250.00,
    descripcion: "Esperando pantalla original de Apple",
    celular_contacto: "555-5678",
    tiempo_estimado: 60,
    tiempo_real: 10,
    fecha_inicio_trabajo: "2024-01-18T14:00:00",
    puntaje_tecnico: null,
    historial_reasignaciones: [],
    fecha_creacion: "2024-01-18",
    fecha_actualizacion: "2024-01-19",
  },
]

const mockRepuestosOT: RepuestoOT[] = [
  { id: 1, orden_id: 1, producto_id: 1, producto_nombre: "Pantalla iPhone 14 Pro", cantidad: 1, precio_unitario: 250, descuento: 0, total: 250 },
  { id: 2, orden_id: 1, producto_id: 4, producto_nombre: "Mano de obra básica", cantidad: 1, precio_unitario: 30, descuento: 0, total: 30 },
  { id: 3, orden_id: 3, producto_id: 2, producto_nombre: "Batería iPhone 14 Pro", cantidad: 1, precio_unitario: 80, descuento: 0, total: 80 },
  { id: 4, orden_id: 3, producto_id: 4, producto_nombre: "Mano de obra básica", cantidad: 1, precio_unitario: 30, descuento: 0, total: 30 },
]

const mockControlOT: ControlOT[] = [
  { id: 1, orden_id: 1, checklist_id: 1, estado_recepcion: "mal", estado_calidad: null, observacion_recepcion: "Pantalla rota", observacion_calidad: "" },
  { id: 2, orden_id: 1, checklist_id: 2, estado_recepcion: "ok", estado_calidad: null, observacion_recepcion: "", observacion_calidad: "" },
  { id: 3, orden_id: 1, checklist_id: 3, estado_recepcion: "ok", estado_calidad: null, observacion_recepcion: "", observacion_calidad: "" },
  { id: 4, orden_id: 3, checklist_id: 1, estado_recepcion: "ok", estado_calidad: "ok", observacion_recepcion: "", observacion_calidad: "" },
  { id: 5, orden_id: 3, checklist_id: 2, estado_recepcion: "ok", estado_calidad: "ok", observacion_recepcion: "", observacion_calidad: "" },
]

const mockEtapasOT: EtapaOT[] = [
  { id: 1, orden_id: 1, estado_anterior: "", estado_nuevo: "borrador", usuario: "Admin", fecha: "2024-01-15T10:00:00", observacion: "OT creada" },
  { id: 2, orden_id: 1, estado_anterior: "borrador", estado_nuevo: "asignada_sin_resolucion", usuario: "Admin", fecha: "2024-01-15T10:30:00", observacion: "Asignada a Pedro Martínez" },
  { id: 3, orden_id: 1, estado_anterior: "asignada_sin_resolucion", estado_nuevo: "asignada_en_proceso", usuario: "Pedro Martínez", fecha: "2024-01-16T09:00:00", observacion: "Técnico inició trabajo" },
  { id: 4, orden_id: 3, estado_anterior: "", estado_nuevo: "borrador", usuario: "Admin", fecha: "2024-01-10T11:00:00", observacion: "OT creada" },
  { id: 5, orden_id: 3, estado_anterior: "borrador", estado_nuevo: "asignada_en_proceso", usuario: "Admin", fecha: "2024-01-12T09:00:00", observacion: "Asignada y en proceso" },
  { id: 6, orden_id: 3, estado_anterior: "asignada_en_proceso", estado_nuevo: "control_calidad", usuario: "Ana Rodríguez", fecha: "2024-01-15T14:00:00", observacion: "Reparación completada" },
]

// Main Component
function CellHomeERPContent() {
  const [activeModule, setActiveModule] = useState("home")
  const [activeView, setActiveView] = useState("dashboard")
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>(mockOrdenes)
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes)
  const [clientesVenta, setClientesVenta] = useState<ClienteVenta[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(mockTecnicos)
  const [equipos, setEquipos] = useState<Equipo[]>(mockEquipos)
  const [fallas, setFallas] = useState<Falla[]>(mockFallas)
  
  // OT navigation state
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null)

  // Nuevo cliente desde OT
  const [showNuevoClienteOT, setShowNuevoClienteOT] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  
  // Form states for Nueva OT
  const [formArea, setFormArea] = useState("")
  const [formTipo, setFormTipo] = useState("")
  const [formCliente, setFormCliente] = useState("")
  const [formEquipo, setFormEquipo] = useState("")
  const [formFalla, setFormFalla] = useState("")
  const [formCelular, setFormCelular] = useState("")
  const [formIMEI, setFormIMEI] = useState("")
  const [formSerial, setFormSerial] = useState("")
  const [formCodigo, setFormCodigo] = useState("")
  const [formApagado, setFormApagado] = useState(false)
  const [formMojado, setFormMojado] = useState(false)
  const [formCargador, setFormCargador] = useState(false)
  const [formPresupuesto, setFormPresupuesto] = useState("")
  const [formDescripcion, setFormDescripcion] = useState("")
  
  // CRUD Modal states
  
  const [showTecnicoModal, setShowTecnicoModal] = useState(false)
  const [showEquipoModal, setShowEquipoModal] = useState(false)
  const [showFallaModal, setShowFallaModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Cliente | Tecnico | Equipo | Falla | null>(null)
  
  // Config CRUD modals
  const [showAreaModal, setShowAreaModal] = useState(false)
  const [showTipoOTModal, setShowTipoOTModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [showControlModal, setShowControlModal] = useState(false)
  const [showFallaEquipoModal, setShowFallaEquipoModal] = useState(false)
  
  // Editable config data
  const [areas, setAreas] = useState<Area[]>(mockAreas)
  const [tiposOT, setTiposOT] = useState<TipoOT[]>(mockTiposOT)
  const [categoriasReparacion, setCategoriasReparacion] = useState<CategoriaReparacion[]>(mockCategoriasReparacion)
  const [controlChecklist, setControlChecklist] = useState<ControlChecklist[]>(mockControlChecklist)
  const [fallasEquipos, setFallasEquipos] = useState<FallaEquipo[]>(mockFallasEquipos)
  
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [editingTipoOT, setEditingTipoOT] = useState<TipoOT | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaReparacion | null>(null)
  const [editingControl, setEditingControl] = useState<ControlChecklist | null>(null)
  const [editingFallaEquipo, setEditingFallaEquipo] = useState<FallaEquipo | null>(null)

  // Advanced Filter System State
  const [searchQuery, setSearchQuery] = useState("")
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([])
  const [activeDateFilter, setActiveDateFilter] = useState<string>("")
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
  const [groupBy, setGroupBy] = useState<string>("")
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false)
  const [savedFilters, setSavedFilters] = useState<{ name: string; filters: FilterCondition[]; quickFilters: string[]; dateFilter: string }[]>([])

  // Filter Configurations for each view
  const filterConfigs: Record<string, FilterConfig> = useMemo(() => ({
    ordenes: {
      searchPlaceholder: "Buscar OTs por número, cliente, equipo...",
      quickFilters: [
        { id: "excluir_cerrados", label: "Excluir Cerrados", field: "estado", operator: "not_equals", value: "entregado" },
        { id: "excluir_borrador", label: "Excluir Borradores", field: "estado", operator: "not_equals", value: "borrador" },
        { id: "sin_tecnico", label: "Sin Técnico Asignado", field: "tecnico_id", operator: "is_null", value: true },
        { id: "en_proceso", label: "Solo En Proceso", field: "estado", operator: "equals", value: "asignada_en_proceso" },
      ],
      dateFilters: [
        { id: "today", label: "Hoy", field: "fecha_creacion", range: "today" },
        { id: "week", label: "Última Semana", field: "fecha_creacion", range: "week" },
        { id: "month", label: "Mes actual", field: "fecha_creacion", range: "month" },
        { id: "lastMonth", label: "Mes anterior", field: "fecha_creacion", range: "lastMonth" },
        { id: "year", label: "Año actual", field: "fecha_creacion", range: "year" },
        { id: "lastYear", label: "Año anterior", field: "fecha_creacion", range: "lastYear" },
      ],
      groupByOptions: [
        { field: "fecha_creacion", label: "Fecha" },
        { field: "cliente_nombre", label: "Cliente" },
        { field: "area_id", label: "Área Reparación" },
        { field: "estado", label: "Etapa/Estado" },
        { field: "tecnico_nombre", label: "Técnico" },
        { field: "equipo_nombre", label: "Equipo" },
      ],
      filterFields: [
        { field: "numero", label: "Número OT", type: "text" },
        { field: "cliente_nombre", label: "Cliente", type: "text" },
        { field: "equipo_nombre", label: "Equipo", type: "text" },
        { field: "estado", label: "Estado", type: "select", options: estadosOT.map(e => ({ value: e.value, label: e.label })) },
        { field: "tecnico_nombre", label: "Técnico", type: "text" },
        { field: "presupuesto", label: "Presupuesto", type: "number" },
        { field: "imei", label: "IMEI", type: "text" },
        { field: "serial", label: "Serial", type: "text" },
        { field: "celular_contacto", label: "Celular Cliente", type: "text" },
      ],
    },
    clientes: {
      searchPlaceholder: "Buscar clientes por nombre, teléfono, email...",
      quickFilters: [],
      dateFilters: [],
      groupByOptions: [
        { field: "nombre", label: "Nombre (A-Z)" },
      ],
      filterFields: [
        { field: "nombre", label: "Nombre", type: "text" },
        { field: "telefono", label: "Teléfono", type: "text" },
        { field: "email", label: "Email", type: "text" },
        { field: "direccion", label: "Dirección", type: "text" },
      ],
    },
    tecnicos: {
      searchPlaceholder: "Buscar técnicos por nombre, especialidad...",
      quickFilters: [
        { id: "solo_activos", label: "Solo Activos", field: "activo", operator: "equals", value: true },
        { id: "solo_inactivos", label: "Solo Inactivos", field: "activo", operator: "equals", value: false },
      ],
      dateFilters: [],
      groupByOptions: [
        { field: "especialidad", label: "Especialidad" },
        { field: "activo", label: "Estado" },
      ],
      filterFields: [
        { field: "nombre", label: "Nombre", type: "text" },
        { field: "especialidad", label: "Especialidad", type: "text" },
        { field: "activo", label: "Estado", type: "select", options: [{ value: "true", label: "Activo" }, { value: "false", label: "Inactivo" }] },
      ],
    },
    equipos: {
      searchPlaceholder: "Buscar equipos por nombre, marca, modelo...",
      quickFilters: [],
      dateFilters: [],
      groupByOptions: [
        { field: "marca", label: "Marca" },
        { field: "area_id", label: "Área" },
      ],
      filterFields: [
        { field: "nombre", label: "Nombre", type: "text" },
        { field: "marca", label: "Marca", type: "text" },
        { field: "modelo", label: "Modelo", type: "text" },
        { field: "area_id", label: "Área", type: "select", options: mockAreas.map(a => ({ value: String(a.id), label: a.nombre })) },
      ],
    },
    fallas: {
      searchPlaceholder: "Buscar fallas por nombre, descripción...",
      quickFilters: [
        { id: "solo_activas", label: "Solo Activas", field: "activo", operator: "equals", value: true },
      ],
      dateFilters: [],
      groupByOptions: [
        { field: "equipo_id", label: "Equipo" },
        { field: "categoria_reparacion_id", label: "Categoría" },
      ],
      filterFields: [
        { field: "nombre", label: "Nombre", type: "text" },
        { field: "descripcion", label: "Descripción", type: "text" },
        { field: "equipo_id", label: "Equipo", type: "select", options: mockEquipos.map(e => ({ value: String(e.id), label: e.nombre })) },
        { field: "categoria_reparacion_id", label: "Categoría", type: "select", options: mockCategoriasReparacion.map(c => ({ value: String(c.id), label: c.nombre })) },
        { field: "activo", label: "Estado", type: "select", options: [{ value: "true", label: "Activa" }, { value: "false", label: "Inactiva" }] },
      ],
    },
  }), [])

  // Get current filter config based on active view
  const currentFilterConfig = useMemo(() => {
    const viewName = activeView === "ordenes" ? "ordenes" : activeView
    return filterConfigs[viewName] || filterConfigs.ordenes
  }, [activeView, filterConfigs])

  // Date filter helper
  const getDateRange = useCallback((range: string): { start: Date; end: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (range) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 86400000) }
      case "week":
        const weekStart = new Date(today.getTime() - 7 * 86400000)
        return { start: weekStart, end: new Date(today.getTime() + 86400000) }
      case "month":
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
      case "lastMonth":
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }
      case "year":
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) }
      case "lastYear":
        return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31) }
      default:
        return { start: today, end: new Date(today.getTime() + 86400000) }
    }
  }, [])

  // Generic filter function that works on any array of data
  const applyFilters = useCallback(<T extends object>(
    data: T[],
    config: FilterConfig,
    search: string,
    quickFilters: string[],
    dateFilter: string,
    conditions: FilterCondition[]
  ): T[] => {
    return data.filter(item => {
      const rec = item as Record<string, unknown>
      // Search filter - check all string fields
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch = Object.values(rec).some(val => 
          String(val).toLowerCase().includes(searchLower)
        )
        if (!matchesSearch) return false
      }

      // Quick filters
      for (const qfId of quickFilters) {
        const qf = config.quickFilters.find(f => f.id === qfId)
        if (qf) {
          const fieldValue = rec[qf.field]
          if (qf.operator === "equals" && fieldValue !== qf.value) return false
          if (qf.operator === "not_equals" && fieldValue === qf.value) return false
          if (qf.operator === "is_null" && fieldValue != null && fieldValue !== "") return false
        }
      }

      // Date filter
      if (dateFilter) {
        const df = config.dateFilters.find(f => f.id === dateFilter)
        if (df) {
          const dateValue = new Date(rec[df.field] as string)
          const { start, end } = getDateRange(df.range)
          if (dateValue < start || dateValue > end) return false
        }
      }

      // Custom conditions
      for (const cond of conditions) {
        const fieldValue = String(rec[cond.field] || "").toLowerCase()
        const condValue = cond.value.toLowerCase()
        
        switch (cond.operator) {
          case "contiene":
            if (!fieldValue.includes(condValue)) return false
            break
          case "no_contiene":
            if (fieldValue.includes(condValue)) return false
            break
          case "igual":
            if (fieldValue !== condValue) return false
            break
          case "diferente":
            if (fieldValue === condValue) return false
            break
          case "mayor":
            if (Number(fieldValue) <= Number(condValue)) return false
            break
          case "menor":
            if (Number(fieldValue) >= Number(condValue)) return false
            break
        }
      }

      return true
    })
  }, [getDateRange])

  // Group data by field
  const groupData = useCallback(<T extends object>(
    data: T[],
    groupField: string
  ): Map<string, T[]> => {
    const groups = new Map<string, T[]>()
    
    if (!groupField) {
      groups.set("all", data)
      return groups
    }

    data.forEach(item => {
      const key = String((item as Record<string, unknown>)[groupField] || "Sin asignar")
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })

    return groups
  }, [])

  // Navegación cross-módulo desde historial de costos u otros eventos
  const [pendingRecepcionNumero, setPendingRecepcionNumero] = useState<string | null>(null)

  useEffect(() => {
    function handleNavegarRecepcion(e: Event) {
      const { numero } = (e as CustomEvent<{ numero: string }>).detail
      setActiveModule("compras")
      setActiveView("dashboard")
      setPendingRecepcionNumero(numero)
    }
    window.addEventListener("erp:navegar-recepcion", handleNavegarRecepcion)
    return () => window.removeEventListener("erp:navegar-recepcion", handleNavegarRecepcion)
  }, [])

  // Reset filters when view changes
  useEffect(() => {
    setSearchQuery("")
    setActiveQuickFilters([])
    setActiveDateFilter("")
    setFilterConditions([])
    setGroupBy("")
    setShowFilterDropdown(false)
    setShowGroupDropdown(false)
    setShowFavoritesDropdown(false)
  }, [activeView])

  // Add filter condition
  const addFilterCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: `cond_${Date.now()}`,
      field: currentFilterConfig.filterFields[0]?.field || "",
      operator: "contiene",
      value: ""
    }
    setFilterConditions(prev => [...prev, newCondition])
  }, [currentFilterConfig])

  // Update filter condition
  const updateFilterCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setFilterConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [])

  // Remove filter condition
  const removeFilterCondition = useCallback((id: string) => {
    setFilterConditions(prev => prev.filter(c => c.id !== id))
  }, [])

  // Toggle quick filter
  const toggleQuickFilter = useCallback((filterId: string) => {
    setActiveQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    )
  }, [])

  // Save current filters as favorite
  const saveCurrentFilters = useCallback((name: string) => {
    setSavedFilters(prev => [...prev, {
      name,
      filters: filterConditions,
      quickFilters: activeQuickFilters,
      dateFilter: activeDateFilter
    }])
  }, [filterConditions, activeQuickFilters, activeDateFilter])

  // Load saved filter
  const loadSavedFilter = useCallback((index: number) => {
    const saved = savedFilters[index]
    if (saved) {
      setFilterConditions(saved.filters)
      setActiveQuickFilters(saved.quickFilters)
      setActiveDateFilter(saved.dateFilter)
    }
    setShowFavoritesDropdown(false)
  }, [savedFilters])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery("")
    setActiveQuickFilters([])
    setActiveDateFilter("")
    setFilterConditions([])
    setGroupBy("")
  }, [])

  // Filtered data based on selections
  const tiposOTFiltrados = useMemo(() => 
    mockTiposOT.filter(t => t.area_id === Number(formArea)),
    [formArea]
  )
  
  const equiposFiltrados = useMemo(() => 
    mockEquipos.filter(e => e.area_id === Number(formArea)),
    [formArea]
  )
  
  const fallasFiltradas = useMemo(() => 
    mockFallas.filter(f => f.equipo_id === Number(formEquipo)),
    [formEquipo]
  )
  
  const categoriaReparacion = useMemo(() => {
    const falla = mockFallas.find(f => f.id === Number(formFalla))
    if (!falla) return ""
    const cat = mockCategoriasReparacion.find(c => c.id === falla.categoria_reparacion_id)
    return cat?.nombre || ""
  }, [formFalla])

  // Filtered ordenes with advanced filtering
  const ordenesFiltradas = useMemo(() => {
    if (activeView !== "ordenes") return ordenes
    return applyFilters(
      ordenes,
      filterConfigs.ordenes,
      searchQuery,
      activeQuickFilters,
      activeDateFilter,
      filterConditions
    )
  }, [ordenes, activeView, searchQuery, activeQuickFilters, activeDateFilter, filterConditions, applyFilters, filterConfigs])

  // Grouped ordenes
  const ordenesAgrupadas = useMemo(() => {
    return groupData(ordenesFiltradas, groupBy)
  }, [ordenesFiltradas, groupBy, groupData])

  // Filtered clientes
  const clientesFiltrados = useMemo(() => {
    if (activeView !== "clientes") return clientes
    return applyFilters(
      clientes,
      filterConfigs.clientes,
      searchQuery,
      activeQuickFilters,
      activeDateFilter,
      filterConditions
    )
  }, [clientes, activeView, searchQuery, activeQuickFilters, activeDateFilter, filterConditions, applyFilters, filterConfigs])

  // Grouped clientes
  const clientesAgrupados = useMemo(() => {
    return groupData(clientesFiltrados, groupBy)
  }, [clientesFiltrados, groupBy, groupData])

  // Filtered tecnicos
  const tecnicosFiltrados = useMemo(() => {
    if (activeView !== "tecnicos") return tecnicos
    return applyFilters(
      tecnicos,
      filterConfigs.tecnicos,
      searchQuery,
      activeQuickFilters,
      activeDateFilter,
      filterConditions
    )
  }, [tecnicos, activeView, searchQuery, activeQuickFilters, activeDateFilter, filterConditions, applyFilters, filterConfigs])

  // Grouped tecnicos
  const tecnicosAgrupados = useMemo(() => {
    return groupData(tecnicosFiltrados, groupBy)
  }, [tecnicosFiltrados, groupBy, groupData])

  // Filtered equipos
  const equiposFiltradosView = useMemo(() => {
    if (activeView !== "equipos") return equipos
    return applyFilters(
      equipos,
      filterConfigs.equipos,
      searchQuery,
      activeQuickFilters,
      activeDateFilter,
      filterConditions
    )
  }, [equipos, activeView, searchQuery, activeQuickFilters, activeDateFilter, filterConditions, applyFilters, filterConfigs])

  // Grouped equipos
  const equiposAgrupados = useMemo(() => {
    return groupData(equiposFiltradosView, groupBy)
  }, [equiposFiltradosView, groupBy, groupData])

  // Filtered fallas
  const fallasFiltradas2 = useMemo(() => {
    if (activeView !== "fallas") return fallas
    return applyFilters(
      fallas,
      filterConfigs.fallas,
      searchQuery,
      activeQuickFilters,
      activeDateFilter,
      filterConditions
    )
  }, [fallas, activeView, searchQuery, activeQuickFilters, activeDateFilter, filterConditions, applyFilters, filterConfigs])

  // Grouped fallas
  const fallasAgrupadas = useMemo(() => {
    return groupData(fallasFiltradas2, groupBy)
  }, [fallasFiltradas2, groupBy, groupData])

  // Stats for dashboard
  const stats = useMemo(() => ({
    total: ordenes.length,
    borrador: ordenes.filter(o => o.estado === "borrador").length,
    en_proceso: ordenes.filter(o => o.estado === "asignada_en_proceso").length,
    control_calidad: ordenes.filter(o => o.estado === "control_calidad").length,
    entregados: ordenes.filter(o => o.estado === "entregado").length,
    clientes: clientes.length,
    tecnicos: tecnicos.filter(t => t.activo).length,
  }), [ordenes, clientes, tecnicos])

  // Reset form
  const resetForm = useCallback(() => {
    setFormArea("")
    setFormTipo("")
    setFormCliente("")
    setFormEquipo("")
    setFormFalla("")
    setFormCelular("")
    setFormIMEI("")
    setFormSerial("")
    setFormCodigo("")
    setFormApagado(false)
    setFormMojado(false)
    setFormCargador(false)
    setFormPresupuesto("")
    setFormDescripcion("")
  }, [])

  // Create new OT
  const crearOT = useCallback(() => {
    if (!formArea || !formTipo || !formCliente || !formEquipo || !formFalla) {
      alert("Por favor complete todos los campos requeridos")
      return
    }

    const cliente = clientes.find(c => c.id === Number(formCliente))
    const equipo = mockEquipos.find(e => e.id === Number(formEquipo))
    const falla = mockFallas.find(f => f.id === Number(formFalla))

    const fallaData = mockFallas.find(f => f.id === Number(formFalla))
    const categoriaRepId = fallaData?.categoria_reparacion_id || 0
    const fallaEquipoData = mockFallasEquipos.find(fe => fe.equipo_id === Number(formEquipo) && fe.falla_id === Number(formFalla))
    const tiempoEstimado = fallaEquipoData?.tiempo_reparacion_principal || 60

    const nuevaOT: OrdenTrabajo = {
      id: ordenes.length + 1,
      numero: `OT-2024-${String(ordenes.length + 1).padStart(3, '0')}`,
      cliente_id: Number(formCliente),
      cliente_nombre: cliente?.nombre,
      tecnico_id: null,
      tecnico_nombre: undefined,
      equipo_id: Number(formEquipo),
      equipo_nombre: equipo?.nombre,
      falla_principal_id: Number(formFalla),
      falla_principal_nombre: falla?.nombre,
      fallas_secundarias: [],
      area_id: Number(formArea),
      tipo_ot_id: Number(formTipo),
      categoria_reparacion_id: categoriaRepId,
      estado: "borrador",
      imei: formIMEI,
      serial: formSerial,
      codigo_desbloqueo: formCodigo,
      ingresa_apagado: formApagado,
      ingresa_mojado: formMojado,
      deja_cargador: formCargador,
      requerido_mkt: false,
      tipo_tecnico: "ambos",
      factura_asociada: "",
      ot_anterior_id: null,
      presupuesto: Number(formPresupuesto) || 0,
      descripcion: formDescripcion,
      celular_contacto: formCelular,
      tiempo_estimado: tiempoEstimado,
      tiempo_real: 0,
      fecha_inicio_trabajo: null,
      puntaje_tecnico: null,
      historial_reasignaciones: [],
      fecha_creacion: new Date().toISOString().split('T')[0],
      fecha_actualizacion: new Date().toISOString().split('T')[0],
    }

    setOrdenes(prev => [...prev, nuevaOT])
    setActiveView("ordenes")
    resetForm()
  }, [formArea, formTipo, formCliente, formEquipo, formFalla, formIMEI, formSerial, formCodigo, formApagado, formMojado, formCargador, formPresupuesto, formDescripcion, formCelular, clientes, ordenes, resetForm])

  // Open detail view
  const abrirDetalleOT = useCallback((ot: OrdenTrabajo) => {
    setSelectedOT(ot)
    setActiveTab("info")
    setActiveView("detalle_ot")
  }, [])

  // Change state
  const cambiarEstado = useCallback((nuevoEstado: string) => {
    if (!selectedOT) return
    
    setOrdenes(prev => prev.map(o => 
      o.id === selectedOT.id 
        ? { ...o, estado: nuevoEstado, fecha_actualizacion: new Date().toISOString().split('T')[0] }
        : o
    ))
    setSelectedOT(prev => prev ? { ...prev, estado: nuevoEstado } : null)
  }, [selectedOT])

  // Assign technician
  const asignarTecnico = useCallback((tecnicoId: number) => {
    if (!selectedOT) return
    const tecnico = tecnicos.find(t => t.id === tecnicoId)
    
    setOrdenes(prev => prev.map(o => 
      o.id === selectedOT.id 
        ? { 
            ...o, 
            tecnico_id: tecnicoId, 
            tecnico_nombre: tecnico?.nombre,
            estado: o.estado === "borrador" ? "asignada_sin_resolucion" : o.estado,
            fecha_actualizacion: new Date().toISOString().split('T')[0] 
          }
        : o
    ))
    setSelectedOT(prev => prev ? { 
      ...prev, 
      tecnico_id: tecnicoId, 
      tecnico_nombre: tecnico?.nombre,
      estado: prev.estado === "borrador" ? "asignada_sin_resolucion" : prev.estado
    } : null)
  }, [selectedOT, tecnicos])

  // Get badge class for estado
  const getBadgeClass = (estado: string) => {
    const found = estadosOT.find(e => e.value === estado)
    return found?.color || "bg-gray-200 text-gray-700"
  }

  // Get estado label
  const getEstadoLabel = (estado: string) => {
    const found = estadosOT.find(e => e.value === estado)
    return found?.label || estado
  }

  // Get progress steps
  const getProgressSteps = (estado: string) => {
    const stateOrder = ["borrador", "asignada_sin_resolucion", "asignada_en_proceso", "control_calidad", "facturado", "a_entregar", "entregado"]
    const currentIndex = stateOrder.indexOf(estado)
    return stateOrder.map((s, i) => ({
      state: s,
      label: getEstadoLabel(s),
      status: i < currentIndex ? "completed" : i === currentIndex ? "active" : "pending"
    }))
  }

  // Sidebar content based on module
  const renderSidebar = () => {
    if (activeModule === "taller") {
      return (
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Principal</h3>
            <button 
              onClick={() => setActiveView("dashboard")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "dashboard" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveView("ordenes")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "ordenes" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Órdenes de Trabajo
            </button>
          </div>
          <div className="mb-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Catálogos</h3>
            <button 
              onClick={() => setActiveView("tecnicos")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "tecnicos" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Técnicos
            </button>
            <button 
              onClick={() => setActiveView("equipos")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "equipos" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Equipos
            </button>
            <button 
              onClick={() => setActiveView("fallas")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "fallas" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Fallas
            </button>
          </div>
          <div className="mb-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Configuración</h3>
            <button 
              onClick={() => setActiveView("areas")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "areas" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Áreas de Reparación
            </button>
            <button 
              onClick={() => setActiveView("tipos_ot")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "tipos_ot" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Tipos de OT
            </button>
            <button 
              onClick={() => setActiveView("categorias")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "categorias" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Categorías Reparación
            </button>
            <button 
              onClick={() => setActiveView("controles")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "controles" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Controles/Checklist
            </button>
          </div>
          <div className="mb-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Vistas Técnico</h3>
            <button 
              onClick={() => setActiveView("kanban")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "kanban" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Kanban Técnicos
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Módulo próximamente
      </div>
    )
  }

  // Main content based on view
  const renderContent = () => {
    if (activeModule !== "taller") {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4 text-gray-300">🚧</div>
            <h2 className="text-xl font-semibold text-gray-600">Módulo en desarrollo</h2>
            <p className="text-gray-500 mt-2">Este módulo estará disponible próximamente</p>
          </div>
        </div>
      )
    }

    switch (activeView) {
      case "dashboard":
        return renderDashboard()
      case "ordenes":
        return renderOrdenes()
      case "nueva_ot":
        return renderNuevaOT()
      case "detalle_ot":
        return renderDetalleOT()
      
      case "tecnicos":
        return renderTecnicos()
      case "equipos":
        return renderEquipos()
      case "fallas":
        return renderFallas()
      case "areas":
        return renderAreas()
      case "tipos_ot":
        return renderTiposOT()
      case "categorias":
        return renderCategorias()
      case "controles":
        return renderControles()
      case "kanban":
        return renderKanban()
      default:
        return renderDashboard()
    }
  }

  // Nueva OT view (full page)
  const renderNuevaOT = () => (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { resetForm(); setActiveView("ordenes") }}
          className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Órdenes
        </button>
        <h1 className="text-2xl font-bold text-indigo-900">Nueva Orden de Trabajo</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
              <select
                value={formArea}
                onChange={(e) => { setFormArea(e.target.value); setFormTipo(""); setFormEquipo(""); setFormFalla("") }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar área...</option>
                {mockAreas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de OT *</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!formArea}
              >
                <option value="">Seleccionar tipo...</option>
                {tiposOTFiltrados.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                value={formCliente}
                onChange={(e) => setFormCliente(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNuevoClienteOT(true)}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear nuevo cliente
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular de Contacto</label>
              <input
                type="text"
                value={formCelular}
                onChange={(e) => setFormCelular(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo *</label>
              <select
                value={formEquipo}
                onChange={(e) => { setFormEquipo(e.target.value); setFormFalla("") }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!formArea}
              >
                <option value="">Seleccionar equipo...</option>
                {equiposFiltrados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Falla Principal *</label>
              <select
                value={formFalla}
                onChange={(e) => setFormFalla(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!formEquipo}
              >
                <option value="">Seleccionar falla...</option>
                {fallasFiltradas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría de Reparación</label>
              <input
                type="text"
                value={categoriaReparacion}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IMEI</label>
            <input
              type="text"
              value={formIMEI}
              onChange={(e) => setFormIMEI(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input
              type="text"
              value={formSerial}
              onChange={(e) => setFormSerial(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Código de Desbloqueo</label>
          <input
            type="text"
            value={formCodigo}
            onChange={(e) => setFormCodigo(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formApagado} onChange={(e) => setFormApagado(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Ingresa Apagado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formMojado} onChange={(e) => setFormMojado(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Ingresa Mojado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formCargador} onChange={(e) => setFormCargador(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Deja Cargador</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto Estimado ($)</label>
          <input
            type="number"
            value={formPresupuesto}
            onChange={(e) => setFormPresupuesto(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            step="0.01"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Observaciones</label>
          <textarea
            value={formDescripcion}
            onChange={(e) => setFormDescripcion(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t">
          <button
            onClick={() => { resetForm(); setActiveView("ordenes") }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={crearOT}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 transition-colors"
          >
            Crear Orden
          </button>
        </div>
      </div>
    </div>
  )

  // Detalle OT view (full page)
  const renderDetalleOT = () => {
    if (!selectedOT) return null
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveView("ordenes")}
            className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Órdenes
          </button>
          <h1 className="text-2xl font-bold text-indigo-900">Orden de Trabajo {selectedOT.numero}</h1>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(selectedOT.estado)}`}>
            {getEstadoLabel(selectedOT.estado)}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Progress Bar */}
          <div className="flex gap-1 mb-6 p-4 bg-gray-100 rounded-lg">
            {getProgressSteps(selectedOT.estado).map((step) => (
              <div
                key={step.state}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded ${
                  step.status === "completed" ? "bg-green-500 text-white" :
                  step.status === "active" ? "bg-indigo-900 text-white" :
                  "bg-gray-300 text-gray-600"
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-gray-200 mb-5">
            {["info", "repuestos", "control", "etapas"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium relative transition-colors ${
                  activeTab === tab ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"
                }`}
              >
                {tab === "info" && "Información"}
                {tab === "repuestos" && "Repuestos"}
                {tab === "control" && "Control"}
                {tab === "etapas" && "Etapas"}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Cliente</div>
                <div className="font-medium">{selectedOT.cliente_nombre}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Celular</div>
                <div className="font-medium">{selectedOT.celular_contacto || "-"}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Equipo</div>
                <div className="font-medium">{selectedOT.equipo_nombre}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Falla Principal</div>
                <div className="font-medium">{selectedOT.falla_principal_nombre}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">IMEI</div>
                <div className="font-medium">{selectedOT.imei || "-"}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Serial</div>
                <div className="font-medium">{selectedOT.serial || "-"}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Presupuesto</div>
                <div className="font-medium">${selectedOT.presupuesto.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 uppercase mb-1">Técnico Asignado</div>
                <div className="font-medium">{selectedOT.tecnico_nombre || "Sin asignar"}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded col-span-2">
                <div className="text-xs text-gray-500 uppercase mb-1">Descripción</div>
                <div className="font-medium">{selectedOT.descripcion || "-"}</div>
              </div>
              <div className="flex gap-2 mt-2">
                {selectedOT.ingresa_apagado && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">Ingresa Apagado</span>}
                {selectedOT.ingresa_mojado && <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Ingresa Mojado</span>}
                {selectedOT.deja_cargador && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">Deja Cargador</span>}
              </div>

              {/* Asignar Técnico */}
              {!selectedOT.tecnico_id && (
                <div className="col-span-2 mt-4 p-4 bg-indigo-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asignar Técnico</label>
                  <div className="flex gap-3">
                    <select
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(e) => e.target.value && asignarTecnico(Number(e.target.value))}
                      defaultValue=""
                    >
                      <option value="">Seleccionar técnico...</option>
                      {tecnicos.filter(t => t.activo).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} - {t.especialidad}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "repuestos" && (
            <div className="text-center py-8 text-gray-500">
              No hay repuestos registrados para esta orden
            </div>
          )}

          {activeTab === "control" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-sm">Funcionalidad OK</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-sm">Pantalla OK</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-sm">Batería OK</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "etapas" && (
            <div className="space-y-3">
              <div className="flex gap-4 p-3 bg-gray-50 rounded items-center">
                <div className="text-sm text-gray-500 w-24">{selectedOT.fecha_creacion}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass("borrador")}`}>Borrador</span>
                <div className="text-sm">Orden creada</div>
              </div>
              {selectedOT.estado !== "borrador" && (
                <div className="flex gap-4 p-3 bg-gray-50 rounded items-center">
                  <div className="text-sm text-gray-500 w-24">{selectedOT.fecha_actualizacion}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(selectedOT.estado)}`}>{getEstadoLabel(selectedOT.estado)}</span>
                  <div className="text-sm">Estado actualizado</div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap mt-6 pt-5 border-t">
            {selectedOT.estado === "borrador" && selectedOT.tecnico_id && (
              <button onClick={() => cambiarEstado("asignada_sin_resolucion")} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors">
                Confirmar Asignación
              </button>
            )}
            {selectedOT.estado === "asignada_sin_resolucion" && (
              <button onClick={() => cambiarEstado("asignada_en_proceso")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                Iniciar Trabajo
              </button>
            )}
            {selectedOT.estado === "asignada_en_proceso" && (
              <>
                <button onClick={() => cambiarEstado("control_calidad")} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
                  Enviar a Control
                </button>
                <button onClick={() => cambiarEstado("falta_repuestos")} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">
                  Falta Repuestos
                </button>
                <button onClick={() => cambiarEstado("re_presupuestacion")} className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-md hover:bg-pink-600 transition-colors">
                  Re-presupuestar
                </button>
              </>
            )}
            {selectedOT.estado === "control_calidad" && (
              <>
                <button onClick={() => cambiarEstado("facturado")} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                  Aprobar y Facturar
                </button>
                <button onClick={() => cambiarEstado("asignada_en_proceso")} className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600 transition-colors">
                  Devolver a Proceso
                </button>
              </>
            )}
            {selectedOT.estado === "facturado" && (
              <button onClick={() => cambiarEstado("a_entregar")} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors">
                Listo para Entregar
              </button>
            )}
            {selectedOT.estado === "a_entregar" && (
              <button onClick={() => cambiarEstado("entregado")} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors">
                Marcar como Entregado
              </button>
            )}
            {selectedOT.estado === "falta_repuestos" && (
              <button onClick={() => cambiarEstado("asignada_en_proceso")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                Repuestos Disponibles
              </button>
            )}
            {selectedOT.estado === "re_presupuestacion" && (
              <button onClick={() => cambiarEstado("asignada_en_proceso")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                Presupuesto Aprobado
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Dashboard view
  const renderDashboard = () => (
    <div>
      <h1 className="text-2xl font-bold text-indigo-900 mb-6">Dashboard del Taller</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-indigo-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total OTs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-gray-600">{stats.borrador}</div>
          <div className="text-xs text-gray-500 mt-1">Borradores</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-600">{stats.en_proceso}</div>
          <div className="text-xs text-gray-500 mt-1">En Proceso</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600">{stats.control_calidad}</div>
          <div className="text-xs text-gray-500 mt-1">Control Calidad</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-600">{stats.entregados}</div>
          <div className="text-xs text-gray-500 mt-1">Entregados</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-amber-600">{stats.clientes}</div>
          <div className="text-xs text-gray-500 mt-1">Clientes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-teal-600">{stats.tecnicos}</div>
          <div className="text-xs text-gray-500 mt-1">Técnicos</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-4">Últimas Órdenes de Trabajo</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Equipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.slice(0, 5).map(ot => (
                <tr key={ot.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => abrirDetalleOT(ot)}>
                  <td className="py-3 px-4 font-medium text-indigo-900">{ot.numero}</td>
                  <td className="py-3 px-4">{ot.cliente_nombre}</td>
                  <td className="py-3 px-4">{ot.equipo_nombre}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(ot.estado)}`}>
                      {getEstadoLabel(ot.estado)}
                    </span>
                  </td>
                  <td className="py-3 px-4">{ot.tecnico_nombre || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Ordenes view
  const renderOrdenes = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Órdenes de Trabajo</h1>
        <button 
          onClick={() => { resetForm(); setActiveView("nueva_ot") }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nueva OT
        </button>
      </div>

      <FilterBar
        config={filterConfigs.ordenes}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeQuickFilters={activeQuickFilters}
        toggleQuickFilter={toggleQuickFilter}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        filterConditions={filterConditions}
        addFilterCondition={addFilterCondition}
        updateFilterCondition={updateFilterCondition}
        removeFilterCondition={removeFilterCondition}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        showGroupDropdown={showGroupDropdown}
        setShowGroupDropdown={setShowGroupDropdown}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        savedFilters={savedFilters}
        saveCurrentFilters={saveCurrentFilters}
        loadSavedFilter={loadSavedFilter}
        clearAllFilters={clearAllFilters}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {groupBy ? (
          // Grouped view
          <div>
            {Array.from(ordenesAgrupadas.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="border-b last:border-b-0">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 flex items-center gap-2">
                  <span>{groupBy === "estado" ? getEstadoLabel(groupKey) : groupKey}</span>
                  <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      {items.map(ot => (
                        <tr 
                          key={ot.id} 
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => abrirDetalleOT(ot)}
                        >
                          <td className="py-3 px-4 font-medium text-indigo-900 w-32">{ot.numero}</td>
                          <td className="py-3 px-4 text-gray-600 w-28">{ot.fecha_creacion}</td>
                          <td className="py-3 px-4">{ot.cliente_nombre}</td>
                          <td className="py-3 px-4">{ot.equipo_nombre}</td>
                          <td className="py-3 px-4">{ot.falla_principal_nombre}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(ot.estado)}`}>
                              {getEstadoLabel(ot.estado)}
                            </span>
                          </td>
                          <td className="py-3 px-4">{ot.tecnico_nombre || "-"}</td>
                          <td className="py-3 px-4 font-medium w-28">${ot.presupuesto.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Normal table view
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Equipo</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Falla</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Técnico</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Presupuesto</th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map(ot => (
                  <tr 
                    key={ot.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => abrirDetalleOT(ot)}
                  >
                    <td className="py-3 px-4 font-medium text-indigo-900">{ot.numero}</td>
                    <td className="py-3 px-4 text-gray-600">{ot.fecha_creacion}</td>
                    <td className="py-3 px-4">{ot.cliente_nombre}</td>
                    <td className="py-3 px-4">{ot.equipo_nombre}</td>
                    <td className="py-3 px-4">{ot.falla_principal_nombre}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClass(ot.estado)}`}>
                        {getEstadoLabel(ot.estado)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{ot.tecnico_nombre || "-"}</td>
                    <td className="py-3 px-4 font-medium">${ot.presupuesto.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ordenesFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron órdenes de trabajo
          </div>
        )}
      </div>
    </div>
  )

  // Tecnicos view
  const renderTecnicos = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Técnicos</h1>
        <button 
          onClick={() => { setEditingItem(null); setShowTecnicoModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nuevo Técnico
        </button>
      </div>

      <FilterBar
        config={filterConfigs.tecnicos}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeQuickFilters={activeQuickFilters}
        toggleQuickFilter={toggleQuickFilter}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        filterConditions={filterConditions}
        addFilterCondition={addFilterCondition}
        updateFilterCondition={updateFilterCondition}
        removeFilterCondition={removeFilterCondition}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        showGroupDropdown={showGroupDropdown}
        setShowGroupDropdown={setShowGroupDropdown}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        savedFilters={savedFilters}
        saveCurrentFilters={saveCurrentFilters}
        loadSavedFilter={loadSavedFilter}
        clearAllFilters={clearAllFilters}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {groupBy ? (
          <div>
            {Array.from(tecnicosAgrupados.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="border-b last:border-b-0">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 flex items-center gap-2">
                  <span>{groupKey === "true" ? "Activo" : groupKey === "false" ? "Inactivo" : groupKey}</span>
                  <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <table className="w-full">
                  <tbody>
                    {items.map(t => (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{t.nombre}</td>
                        <td className="py-3 px-4">{t.especialidad}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${t.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {t.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => { setEditingItem(t); setShowTecnicoModal(true) }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => setTecnicos(prev => prev.filter(x => x.id !== t.id))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Especialidad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tecnicosFiltrados.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{t.nombre}</td>
                  <td className="py-3 px-4">{t.especialidad}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${t.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => { setEditingItem(t); setShowTecnicoModal(true) }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setTecnicos(prev => prev.filter(x => x.id !== t.id))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tecnicosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron técnicos
          </div>
        )}
      </div>
    </div>
  )

  // Equipos view
  const renderEquipos = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Equipos</h1>
        <button 
          onClick={() => { setEditingItem(null); setShowEquipoModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nuevo Equipo
        </button>
      </div>

      <FilterBar
        config={filterConfigs.equipos}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeQuickFilters={activeQuickFilters}
        toggleQuickFilter={toggleQuickFilter}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        filterConditions={filterConditions}
        addFilterCondition={addFilterCondition}
        updateFilterCondition={updateFilterCondition}
        removeFilterCondition={removeFilterCondition}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        showGroupDropdown={showGroupDropdown}
        setShowGroupDropdown={setShowGroupDropdown}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        savedFilters={savedFilters}
        saveCurrentFilters={saveCurrentFilters}
        loadSavedFilter={loadSavedFilter}
        clearAllFilters={clearAllFilters}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {groupBy ? (
          <div>
            {Array.from(equiposAgrupados.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="border-b last:border-b-0">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 flex items-center gap-2">
                  <span>{groupKey === "1" ? "Celulares" : groupKey === "2" ? "Tablets" : groupKey === "3" ? "Laptops" : groupKey}</span>
                  <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <table className="w-full">
                  <tbody>
                    {items.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{e.nombre}</td>
                        <td className="py-3 px-4">{e.marca}</td>
                        <td className="py-3 px-4">{e.modelo}</td>
                        <td className="py-3 px-4">{mockAreas.find(a => a.id === e.area_id)?.nombre}</td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => { setEditingItem(e); setShowEquipoModal(true) }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => setEquipos(prev => prev.filter(x => x.id !== e.id))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Marca</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Modelo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Área</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equiposFiltradosView.map(e => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{e.nombre}</td>
                  <td className="py-3 px-4">{e.marca}</td>
                  <td className="py-3 px-4">{e.modelo}</td>
                  <td className="py-3 px-4">{mockAreas.find(a => a.id === e.area_id)?.nombre}</td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => { setEditingItem(e); setShowEquipoModal(true) }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setEquipos(prev => prev.filter(x => x.id !== e.id))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {equiposFiltradosView.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron equipos
          </div>
        )}
      </div>
    </div>
  )

  // Fallas view
  const renderFallas = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Fallas</h1>
        <button 
          onClick={() => { setEditingItem(null); setShowFallaModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nueva Falla
        </button>
      </div>

      <FilterBar
        config={filterConfigs.fallas}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeQuickFilters={activeQuickFilters}
        toggleQuickFilter={toggleQuickFilter}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        filterConditions={filterConditions}
        addFilterCondition={addFilterCondition}
        updateFilterCondition={updateFilterCondition}
        removeFilterCondition={removeFilterCondition}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        showGroupDropdown={showGroupDropdown}
        setShowGroupDropdown={setShowGroupDropdown}
        showFavoritesDropdown={showFavoritesDropdown}
        setShowFavoritesDropdown={setShowFavoritesDropdown}
        savedFilters={savedFilters}
        saveCurrentFilters={saveCurrentFilters}
        loadSavedFilter={loadSavedFilter}
        clearAllFilters={clearAllFilters}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {groupBy ? (
          <div>
            {Array.from(fallasAgrupadas.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="border-b last:border-b-0">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 flex items-center gap-2">
                  <span>{mockEquipos.find(e => e.id === Number(groupKey))?.nombre || groupKey}</span>
                  <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <table className="w-full">
                  <tbody>
                    {items.map(f => (
                      <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{f.nombre}</td>
                        <td className="py-3 px-4">{f.descripcion}</td>
                        <td className="py-3 px-4">{mockEquipos.find(e => e.id === f.equipo_id)?.nombre}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                            {categoriasReparacion.find(c => c.id === f.categoria_reparacion_id)?.nombre ?? "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => { setEditingItem(f); setShowFallaModal(true) }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => setFallas(prev => prev.filter(x => x.id !== f.id))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Equipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fallasFiltradas2.map(f => (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{f.nombre}</td>
                  <td className="py-3 px-4">{f.descripcion}</td>
                  <td className="py-3 px-4">{mockEquipos.find(e => e.id === f.equipo_id)?.nombre}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {mockCategoriasReparacion.find(c => c.id === f.categoria_reparacion_id)?.nombre || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => { setEditingItem(f); setShowFallaModal(true) }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setFallas(prev => prev.filter(x => x.id !== f.id))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {fallasFiltradas2.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron fallas
          </div>
        )}
      </div>
    </div>
  )

  // Areas view
  const renderAreas = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Áreas de Reparación</h1>
        <button 
          onClick={() => { setEditingArea(null); setShowAreaModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nueva Área
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-20">Orden</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {areas.map(a => (
              <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditingArea(a); setShowAreaModal(true) }}>
                <td className="py-3 px-4 text-center font-medium">{a.orden_asignacion}</td>
                <td className="py-3 px-4 font-mono text-sm text-gray-600">{`REP${a.nombre.substring(0, 3).toUpperCase()}`}</td>
                <td className="py-3 px-4 font-medium text-indigo-700">{a.nombre}</td>
                <td className="py-3 px-4 text-gray-600">{a.descripcion}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingArea(a); setShowAreaModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                  <button onClick={() => setAreas(prev => prev.filter(x => x.id !== a.id))} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Tipos de OT view
  const renderTiposOT = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Tipos de Orden de Trabajo</h1>
        <button 
          onClick={() => { setEditingTipoOT(null); setShowTipoOTModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nuevo Tipo
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo Técnico</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Área Reparación</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Garantía Compra</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Garantía Reparación</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tiposOT.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditingTipoOT(t); setShowTipoOTModal(true) }}>
                <td className="py-3 px-4 font-medium text-indigo-700">{t.nombre}</td>
                <td className="py-3 px-4 font-mono text-sm text-gray-600">{`REP${t.nombre.substring(0, 3).toUpperCase()}${t.area_id}`}</td>
                <td className="py-3 px-4">Propio</td>
                <td className="py-3 px-4">{areas.find(a => a.id === t.area_id)?.nombre}</td>
                <td className="py-3 px-4 text-center">{t.busca_garantia_compra ? <span className="text-green-600 font-medium">Si</span> : <span className="text-gray-400">No</span>}</td>
                <td className="py-3 px-4 text-center">{t.busca_garantia_reparacion ? <span className="text-green-600 font-medium">Si</span> : <span className="text-gray-400">No</span>}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingTipoOT(t); setShowTipoOTModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                  <button onClick={() => setTiposOT(prev => prev.filter(x => x.id !== t.id))} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Categorias Reparación view
  const renderCategorias = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Categorías de Reparación</h1>
        <button 
          onClick={() => { setEditingCategoria(null); setShowCategoriaModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nueva Categoría
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-20">Orden</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Área</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categoriasReparacion.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditingCategoria(c); setShowCategoriaModal(true) }}>
                <td className="py-3 px-4 text-center font-medium">{c.orden_asignacion}</td>
                <td className="py-3 px-4 font-medium text-indigo-700">{c.nombre}</td>
                <td className="py-3 px-4">{areas.find(a => a.id === c.area_id)?.nombre}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingCategoria(c); setShowCategoriaModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                  <button onClick={() => setCategoriasReparacion(prev => prev.filter(x => x.id !== c.id))} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Controles/Checklist view
  const renderControles = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo-900">Controles / Checklist</h1>
        <button 
          onClick={() => { setEditingControl(null); setShowControlModal(true) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nuevo Control
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Detalle</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Área</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Recepción</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Calidad</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {controlChecklist.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditingControl(c); setShowControlModal(true) }}>
                <td className="py-3 px-4 font-medium text-indigo-700">{c.detalle}</td>
                <td className="py-3 px-4">{areas.find(a => a.id === c.area_id)?.nombre}</td>
                <td className="py-3 px-4">{c.categoria_reparacion_id ? categoriasReparacion.find(cat => cat.id === c.categoria_reparacion_id)?.nombre : "Todas"}</td>
                <td className="py-3 px-4 text-center">{c.disponible_recepcion ? <span className="text-green-600 font-medium">Si</span> : <span className="text-gray-400">No</span>}</td>
                <td className="py-3 px-4 text-center">{c.disponible_calidad ? <span className="text-green-600 font-medium">Si</span> : <span className="text-gray-400">No</span>}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingControl(c); setShowControlModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                  <button onClick={() => setControlChecklist(prev => prev.filter(x => x.id !== c.id))} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Kanban Técnicos view
  const renderKanban = () => {
    const tecnicoActivo = tecnicos.find(t => t.activo)
    const otsPorTecnico = ordenes.filter(o => o.tecnico_id === tecnicoActivo?.id && o.estado !== "entregado")
    
    const columnasKanban = [
      { estado: "asignada_sin_resolucion", titulo: "Pendientes" },
      { estado: "asignada_en_proceso", titulo: "En Proceso" },
      { estado: "re_presupuestacion", titulo: "Re-presupuestación" },
      { estado: "falta_repuestos", titulo: "Falta Repuestos" },
      { estado: "control_calidad", titulo: "Control Calidad" },
    ]

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-indigo-900">Vista Kanban - Técnicos</h1>
          <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {tecnicos.filter(t => t.activo).map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {columnasKanban.map(col => {
            const otsColumna = ordenes.filter(o => o.estado === col.estado)
            return (
              <div key={col.estado} className="bg-gray-100 rounded-lg p-3 min-h-[500px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">{col.titulo}</h3>
                  <span className="bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">{otsColumna.length}</span>
                </div>
                <div className="space-y-3">
                  {otsColumna.map(ot => (
                    <div 
                      key={ot.id} 
                      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-indigo-500"
                      onClick={() => abrirDetalleOT(ot)}
                    >
                      <div className="font-medium text-sm text-indigo-900 mb-1">{ot.numero}</div>
                      <div className="text-xs text-gray-600 mb-2">{ot.cliente_nombre}</div>
                      <div className="text-xs text-gray-500 mb-2">{ot.equipo_nombre}</div>
                      <div className="text-xs text-gray-500">{ot.falla_principal_nombre}</div>
                      <div className="flex gap-1 mt-2">
                        {ot.ingresa_mojado && <span className="w-2 h-2 rounded-full bg-red-500" title="Mojado" />}
                        {ot.ingresa_apagado && <span className="w-2 h-2 rounded-full bg-orange-500" title="Apagado" />}
                        {ot.requerido_mkt && <span className="w-2 h-2 rounded-full bg-purple-500" title="MKT" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-11 bg-indigo-900 flex items-center px-4 z-50 shadow-md">
        <div className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Cell Home ERP
        </div>
        <div className="flex ml-10 gap-1">
          {["home", "taller", "ventas", "compras", "finanzas", "contabilidad", "deposito", "informes", "config"].map(mod => (
            <button
              key={mod}
              onClick={() => { setActiveModule(mod); setActiveView("dashboard") }}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                activeModule === mod 
                  ? "bg-white/20 text-white" 
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>
      </nav>

{/* Layout */}
  {activeModule === "home" ? (
  <div className="pt-11">
  <ModuloHome />
  </div>
  ) : activeModule === "ventas" ? (
  <div className="pt-11">
        <ModuloVentas
          clientesIniciales={clientesVenta.length > 0 ? clientesVenta : undefined}
          onNuevoCliente={(c) => setClientesVenta(prev => {
            if (prev.find(x => x.id === c.id)) return prev
            return [...prev, c]
          })}
        />
  </div>
  ) : activeModule === "compras" ? (
  <div className="pt-11">
  <ModuloCompras
    initialRecepcionNumero={pendingRecepcionNumero}
    onNavigationHandled={() => setPendingRecepcionNumero(null)}
  />
  </div>
  ) : activeModule === "finanzas" ? (
  <div className="pt-11">
  <ModuloFinanzas />
  </div>
  ) : activeModule === "contabilidad" ? (
  <div className="pt-11">
  <ModuloContabilidad />
  </div>
  ) : activeModule === "deposito" ? (
        <div className="pt-11">
          <ModuloStock />
        </div>
      ) : activeModule === "informes" ? (
        <div className="pt-11">
          <ModuloInformes />
        </div>
      ) : activeModule === "config" ? (
        <div className="flex pt-11">
          {/* Sidebar Config */}
          <aside className="w-52 bg-white border-r border-gray-200 fixed top-11 left-0 bottom-0 overflow-y-auto">
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">General</h3>
                <button
                  onClick={() => setActiveView("sucursales")}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeView === "sucursales" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Sucursales
                </button>
              </div>
            </div>
          </aside>
          {/* Contenido Config */}
          <main className="ml-52 flex-1 p-6 min-h-[calc(100vh-44px)]">
            {activeView === "sucursales" && <ModuloConfigSucursales />}
            {activeView === "dashboard" && (
              <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                Seleccioná una sección del menú lateral
              </div>
            )}
          </main>
        </div>
      ) : activeModule === "taller" ? (
        <div className="pt-11">
          <ModuloTaller />
        </div>
      ) : (
        <div className="flex items-center justify-center pt-11 h-96 text-gray-400 text-sm">
          Seleccioná un módulo del menú superior
        </div>
      )}

      {/* Modal Nuevo Cliente desde OT */}
      {showNuevoClienteOT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" onClick={() => setShowNuevoClienteOT(false)}>
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-base font-semibold">Nuevo Cliente</h3>
              <button onClick={() => setShowNuevoClienteOT(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="form-nuevo-cliente-ot" onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const nuevoId = Math.max(...clientes.map(c => c.id), 0) + 1
                const nombre = fd.get("nombre") as string
                const telefono = (fd.get("celular") as string) || (fd.get("telefono") as string) || ""
                const email = fd.get("email") as string || ""
                const direccion = fd.get("direccion") as string || ""
                const categoria = (fd.get("categoria") as "publico" | "mayorista") || "publico"

                // Agregar al estado del Taller
                const nuevoCliente: Cliente = {
                  id: nuevoId,
                  nombre,
                  telefono,
                  email,
                  direccion,
                  categoria,
                  orden_asignacion: clientes.length + 1,
                }
                setClientes(prev => [...prev, nuevoCliente])

                // Agregar también al estado de Ventas (para que aparezca en el módulo de Clientes)
                const codigoVenta = `C0${15520 + clientesVenta.length}`
                const nuevoClienteVenta: ClienteVenta = {
                  id: nuevoId,
                  codigo: codigoVenta,
                  nombre,
                  nombre_fantasia: fd.get("nombre_fantasia") as string || "",
                  tipo_documento: fd.get("tipo_documento") as "DNI" | "CUIT" | "CUIL" || "DNI",
                  numero_documento: fd.get("numero_documento") as string || "",
                  posicion_fiscal: fd.get("posicion_fiscal") as ClienteVenta["posicion_fiscal"] || "consumidor_final",
                  direccion,
                  ciudad: fd.get("ciudad") as string || "Rosario",
                  provincia: fd.get("provincia") as string || "Santa Fe",
                  codigo_postal: fd.get("codigo_postal") as string || "",
                  zona: fd.get("zona") as string || "",
                  telefono: fd.get("telefono") as string || "",
                  celular: fd.get("celular") as string || "",
                  email,
                  categoria_id: fd.get("categoria_id") ? parseInt(fd.get("categoria_id") as string) : null,
                  vendedor_id: parseInt(fd.get("vendedor_id") as string) || null,
                  cobrador_id: null,
                  lista_precios_id: parseInt(fd.get("lista_precios_id") as string) || 1,
                  descuento_default: parseFloat(fd.get("descuento_default") as string) || 0,
                  moneda_cuenta_corriente: fd.get("moneda_cuenta_corriente") as "ARS" | "USD" || "ARS",
                  termino_pago_id: parseInt(fd.get("termino_pago_id") as string) || 1,
                  activo: true,
                  es_confidencial: false,
                  sucursal_origen: "Puerto Norte",
                  fecha_alta: new Date().toISOString().split("T")[0],
                  saldo_cuenta_corriente: 0,
                  total_facturado: 0,
                  seguimiento: [{
                    id: Date.now(),
                    fecha: new Date().toISOString(),
                    usuario: "Admin",
                    tipo: "creacion" as const,
                    descripcion: "Cliente creado desde Nueva OT",
                  }],
                }
                setClientesVenta(prev => [...prev, nuevoClienteVenta])

                setFormCliente(String(nuevoId))
                setShowNuevoClienteOT(false)
              }} className="p-5">
                {/* Identificación */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Identificación
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Nombre / Razón Social *</label>
                      <input type="text" name="nombre" required autoFocus
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Nombre Fantasía</label>
                      <input type="text" name="nombre_fantasia"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Tipo Documento *</label>
                      <select name="tipo_documento" defaultValue="DNI"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="DNI">DNI</option>
                        <option value="CUIT">CUIT</option>
                        <option value="CUIL">CUIL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Número Documento *</label>
                      <input type="text" name="numero_documento" required
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Posición Fiscal *</label>
                      <select name="posicion_fiscal" defaultValue="consumidor_final"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="consumidor_final">Consumidor Final</option>
                        <option value="responsable_inscripto">Responsable Inscripto</option>
                        <option value="monotributista">Monotributista</option>
                        <option value="exento">Exento</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dirección */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Dirección
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Dirección</label>
                      <input type="text" name="direccion"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Ciudad</label>
                      <input type="text" name="ciudad" defaultValue="Rosario"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Provincia</label>
                      <input type="text" name="provincia" defaultValue="Santa Fe"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Código Postal</label>
                      <input type="text" name="codigo_postal"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Zona</label>
                      <input type="text" name="zona"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Contacto
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Teléfono</label>
                      <input type="text" name="telefono"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Celular</label>
                      <input type="text" name="celular"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Email</label>
                      <input type="email" name="email"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Información Comercial */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Información Comercial
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Categoría *</label>
                      <select name="categoria" defaultValue="publico"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="publico">Público General</option>
                        <option value="mayorista">Mayorista</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Vendedor</label>
                      <select name="vendedor_id"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="">Sin asignar</option>
                        <option value="1">Max Solina</option>
                        <option value="2">Laura García</option>
                        <option value="3">Carlos Pérez</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Lista de Precios</label>
                      <select name="lista_precios_id" defaultValue="1"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="1">Minorista (ARS)</option>
                        <option value="2">Mayorista (ARS)</option>
                        <option value="3">Minorista (USD)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Descuento Default (%)</label>
                      <input type="number" name="descuento_default" defaultValue="0" min="0" max="100" step="0.5"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Moneda CC</label>
                      <select name="moneda_cuenta_corriente" defaultValue="ARS"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Término de Pago</label>
                      <select name="termino_pago_id" defaultValue="1"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="1">Contado Efectivo</option>
                        <option value="2">Cuenta Corriente 30 días</option>
                        <option value="3">Cuenta Corriente 60 días</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-5 py-4 flex justify-end gap-3 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowNuevoClienteOT(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 bg-white rounded hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-nuevo-cliente-ot"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded hover:bg-indigo-800 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Crear Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tecnico Modal */}
      {showTecnicoModal && (
        <CRUDModal
          title={editingItem ? "Editar Técnico" : "Nuevo Técnico"}
          onClose={() => setShowTecnicoModal(false)}
          onSave={(data) => {
            if (editingItem) {
              setTecnicos(prev => prev.map(t => t.id === (editingItem as Tecnico).id ? { ...t, ...data } : t))
            } else {
              setTecnicos(prev => [...prev, { id: prev.length + 1, activo: true, ...data } as Tecnico])
            }
            setShowTecnicoModal(false)
          }}
          fields={[
            { name: "nombre", label: "Nombre", type: "text", required: true, value: (editingItem as Tecnico)?.nombre || "" },
            { name: "especialidad", label: "Especialidad", type: "text", value: (editingItem as Tecnico)?.especialidad || "" },
          ]}
        />
      )}

      {/* Equipo Modal */}
      {showEquipoModal && (
        <CRUDModal
          title={editingItem ? "Editar Equipo" : "Nuevo Equipo"}
          onClose={() => setShowEquipoModal(false)}
          onSave={(data) => {
            if (editingItem) {
              setEquipos(prev => prev.map(e => e.id === (editingItem as Equipo).id ? { ...e, ...data } : e))
            } else {
              setEquipos(prev => [...prev, { id: prev.length + 1, ...data } as Equipo])
            }
            setShowEquipoModal(false)
          }}
          fields={[
            { name: "nombre", label: "Nombre", type: "text", required: true, value: (editingItem as Equipo)?.nombre || "" },
            { name: "marca", label: "Marca", type: "text", value: (editingItem as Equipo)?.marca || "" },
            { name: "modelo", label: "Modelo", type: "text", value: (editingItem as Equipo)?.modelo || "" },
            { name: "area_id", label: "Área", type: "select", options: mockAreas.map(a => ({ value: a.id, label: a.nombre })), value: (editingItem as Equipo)?.area_id || "" },
          ]}
        />
      )}

      {/* Falla Modal */}
      {showFallaModal && (
        <CRUDModal
          title={editingItem ? "Editar Falla" : "Nueva Falla"}
          onClose={() => setShowFallaModal(false)}
          onSave={(data) => {
            if (editingItem) {
              setFallas(prev => prev.map(f => f.id === (editingItem as Falla).id ? { ...f, ...data } : f))
            } else {
              setFallas(prev => [...prev, { id: prev.length + 1, ...data } as Falla])
            }
            setShowFallaModal(false)
          }}
          fields={[
            { name: "nombre", label: "Nombre", type: "text", required: true, value: (editingItem as Falla)?.nombre || "" },
            { name: "descripcion", label: "Descripción", type: "text", value: (editingItem as Falla)?.descripcion || "" },
            { name: "equipo_id", label: "Equipo", type: "select", options: mockEquipos.map(e => ({ value: e.id, label: e.nombre })), value: (editingItem as Falla)?.equipo_id || "" },
            { name: "categoria_reparacion_id", label: "Categoría Reparación", type: "select", options: categoriasReparacion.map(c => ({ value: c.id, label: c.nombre })), value: (editingItem as Falla)?.categoria_reparacion_id || "" },
            { name: "activo", label: "Activo", type: "checkbox", value: (editingItem as Falla)?.activo ?? true },
          ]}
        />
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <ConfigModal
          title={editingArea ? "Editar Área" : "Nueva Área"}
          onClose={() => { setShowAreaModal(false); setEditingArea(null) }}
          onSave={(data) => {
            if (editingArea) {
              setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, ...data } as Area : a))
            } else {
              setAreas(prev => [...prev, { id: prev.length + 1, ...data } as Area])
            }
            setShowAreaModal(false)
            setEditingArea(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" defaultValue={editingArea?.nombre || ""} name="nombre" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea defaultValue={editingArea?.descripcion || ""} name="descripcion" rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Asignación</label>
              <input type="number" defaultValue={editingArea?.orden_asignacion || 1} name="orden_asignacion" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </ConfigModal>
      )}

      {/* TipoOT Modal */}
      {showTipoOTModal && (
        <ConfigModal
          title={editingTipoOT ? "Editar Tipo de OT" : "Nuevo Tipo de OT"}
          onClose={() => { setShowTipoOTModal(false); setEditingTipoOT(null) }}
          onSave={(data) => {
            if (editingTipoOT) {
              setTiposOT(prev => prev.map(t => t.id === editingTipoOT.id ? { ...t, ...data } as TipoOT : t))
            } else {
              setTiposOT(prev => [...prev, {
                id: prev.length + 1,
                nombre: String(data.nombre ?? ""),
                area_id: Number(data.area_id ?? 0),
                busca_garantia_compra: Boolean(data.busca_garantia_compra),
                busca_garantia_reparacion: Boolean(data.busca_garantia_reparacion),
                campos_visibles: [],
              }])
            }
            setShowTipoOTModal(false)
            setEditingTipoOT(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" defaultValue={editingTipoOT?.nombre || ""} name="nombre" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área Reparación *</label>
              <select defaultValue={editingTipoOT?.area_id || ""} name="area_id" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={editingTipoOT?.busca_garantia_compra || false} name="busca_garantia_compra" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Garantía de Compra</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={editingTipoOT?.busca_garantia_reparacion || false} name="busca_garantia_reparacion" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Garantía de Reparación</span>
              </label>
            </div>
          </div>
        </ConfigModal>
      )}

      {/* Categoria Modal */}
      {showCategoriaModal && (
        <ConfigModal
          title={editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
          onClose={() => { setShowCategoriaModal(false); setEditingCategoria(null) }}
          onSave={(data) => {
            if (editingCategoria) {
              setCategoriasReparacion(prev => prev.map(c => c.id === editingCategoria.id ? { ...c, ...data } as CategoriaReparacion : c))
            } else {
              setCategoriasReparacion(prev => [...prev, { id: prev.length + 1, ...data } as CategoriaReparacion])
            }
            setShowCategoriaModal(false)
            setEditingCategoria(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" defaultValue={editingCategoria?.nombre || ""} name="nombre" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
              <select defaultValue={editingCategoria?.area_id || ""} name="area_id" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Asignación</label>
              <input type="number" defaultValue={editingCategoria?.orden_asignacion || 1} name="orden_asignacion" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </ConfigModal>
      )}

      {/* Control Modal */}
      {showControlModal && (
        <ConfigModal
          title={editingControl ? "Editar Control" : "Nuevo Control"}
          onClose={() => { setShowControlModal(false); setEditingControl(null) }}
          onSave={(data) => {
            if (editingControl) {
              setControlChecklist(prev => prev.map(c => c.id === editingControl.id ? { ...c, ...data } as ControlChecklist : c))
            } else {
              setControlChecklist(prev => [...prev, { id: prev.length + 1, requiere_observacion: false, ...data } as ControlChecklist])
            }
            setShowControlModal(false)
            setEditingControl(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detalle *</label>
              <input type="text" defaultValue={editingControl?.detalle || ""} name="detalle" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
              <select defaultValue={editingControl?.area_id || ""} name="area_id" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (opcional)</label>
              <select defaultValue={editingControl?.categoria_reparacion_id || ""} name="categoria_reparacion_id" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todas las categorías</option>
                {categoriasReparacion.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={editingControl?.disponible_recepcion ?? true} name="disponible_recepcion" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Disponible en Recepción</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={editingControl?.disponible_calidad ?? true} name="disponible_calidad" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Disponible en Calidad</span>
              </label>
            </div>
          </div>
        </ConfigModal>
      )}

      </div>
  )
}

// Filter Bar Component
interface FilterBarProps {
  config: FilterConfig
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeQuickFilters: string[]
  toggleQuickFilter: (id: string) => void
  activeDateFilter: string
  setActiveDateFilter: (f: string) => void
  filterConditions: FilterCondition[]
  addFilterCondition: () => void
  updateFilterCondition: (id: string, updates: Partial<FilterCondition>) => void
  removeFilterCondition: (id: string) => void
  groupBy: string
  setGroupBy: (g: string) => void
  showFilterDropdown: boolean
  setShowFilterDropdown: (s: boolean) => void
  showGroupDropdown: boolean
  setShowGroupDropdown: (s: boolean) => void
  showFavoritesDropdown: boolean
  setShowFavoritesDropdown: (s: boolean) => void
  savedFilters: { name: string; filters: FilterCondition[]; quickFilters: string[]; dateFilter: string }[]
  saveCurrentFilters: (name: string) => void
  loadSavedFilter: (index: number) => void
  clearAllFilters: () => void
}

function FilterBar({
  config,
  searchQuery,
  setSearchQuery,
  activeQuickFilters,
  toggleQuickFilter,
  activeDateFilter,
  setActiveDateFilter,
  filterConditions,
  addFilterCondition,
  updateFilterCondition,
  removeFilterCondition,
  groupBy,
  setGroupBy,
  showFilterDropdown,
  setShowFilterDropdown,
  showGroupDropdown,
  setShowGroupDropdown,
  showFavoritesDropdown,
  setShowFavoritesDropdown,
  savedFilters,
  saveCurrentFilters,
  loadSavedFilter,
  clearAllFilters,
}: FilterBarProps) {
  const [newFilterName, setNewFilterName] = useState("")
  const [showSaveInput, setShowSaveInput] = useState(false)

  const hasActiveFilters = activeQuickFilters.length > 0 || activeDateFilter || filterConditions.length > 0 || groupBy

  return (
    <div className="mb-4">
      {/* Search and Filter Buttons Row */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.searchPlaceholder}
            className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowGroupDropdown(false); setShowFavoritesDropdown(false) }}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              activeQuickFilters.length > 0 || activeDateFilter || filterConditions.length > 0
                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {(activeQuickFilters.length > 0 || filterConditions.length > 0) && (
              <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeQuickFilters.length + filterConditions.length}
              </span>
            )}
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50" onClick={e => e.stopPropagation()}>
              <div className="p-3 max-h-96 overflow-y-auto">
                {/* Quick Filters */}
                {config.quickFilters.length > 0 && (
                  <div className="mb-3">
                    {config.quickFilters.map(qf => (
                      <button
                        key={qf.id}
                        onClick={() => toggleQuickFilter(qf.id)}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          activeQuickFilters.includes(qf.id)
                            ? "bg-indigo-100 text-indigo-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {activeQuickFilters.includes(qf.id) && (
                          <svg className="w-4 h-4 inline mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {qf.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Date Filters */}
                {config.dateFilters.length > 0 && (
                  <div className="mb-3 border-t pt-3">
                    {config.dateFilters.map(df => (
                      <button
                        key={df.id}
                        onClick={() => setActiveDateFilter(activeDateFilter === df.id ? "" : df.id)}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          activeDateFilter === df.id
                            ? "bg-indigo-100 text-indigo-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {activeDateFilter === df.id && (
                          <svg className="w-4 h-4 inline mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {df.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Conditions */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Otro campo</span>
                  </div>
                  
                  {filterConditions.map(cond => (
                    <div key={cond.id} className="mb-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <select
                          value={cond.field}
                          onChange={(e) => updateFilterCondition(cond.id, { field: e.target.value })}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {config.filterFields.map(f => (
                            <option key={f.field} value={f.field}>{f.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeFilterCondition(cond.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={cond.operator}
                          onChange={(e) => updateFilterCondition(cond.id, { operator: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="contiene">contiene</option>
                          <option value="no_contiene">no contiene</option>
                          <option value="igual">es igual a</option>
                          <option value="diferente">es diferente de</option>
                          <option value="mayor">mayor que</option>
                          <option value="menor">menor que</option>
                        </select>
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) => updateFilterCondition(cond.id, { value: e.target.value })}
                          placeholder="Valor..."
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addFilterCondition}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar una condición
                  </button>
                </div>

                {/* Apply Button */}
                <div className="border-t mt-3 pt-3 flex justify-between">
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800"
                  >
                    Aplicar
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { clearAllFilters(); setShowFilterDropdown(false) }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agrupar Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowGroupDropdown(!showGroupDropdown); setShowFilterDropdown(false); setShowFavoritesDropdown(false) }}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              groupBy
                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Agrupar
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGroupDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-2">
                <button
                  onClick={() => { setGroupBy(""); setShowGroupDropdown(false) }}
                  className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    !groupBy ? "bg-indigo-100 text-indigo-800" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Sin agrupar
                </button>
                {config.groupByOptions.map(opt => (
                  <button
                    key={opt.field}
                    onClick={() => { setGroupBy(opt.field); setShowGroupDropdown(false) }}
                    className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      groupBy === opt.field ? "bg-indigo-100 text-indigo-800" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {groupBy === opt.field && (
                      <svg className="w-4 h-4 inline mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {opt.label}
                  </button>
                ))}

                {/* Otro campo section */}
                <div className="border-t mt-2 pt-2">
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Otro campo</div>
                  <select
                    value={groupBy}
                    onChange={(e) => { setGroupBy(e.target.value); setShowGroupDropdown(false) }}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
                  >
                    <option value="">Seleccionar campo...</option>
                    {config.filterFields.map(f => (
                      <option key={f.field} value={f.field}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Favoritos Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowFavoritesDropdown(!showFavoritesDropdown); setShowFilterDropdown(false); setShowGroupDropdown(false) }}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Favoritos
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFavoritesDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-2">
                {savedFilters.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3 py-2">No hay favoritos guardados</div>
                ) : (
                  savedFilters.map((sf, i) => (
                    <button
                      key={i}
                      onClick={() => loadSavedFilter(i)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      {sf.name}
                    </button>
                  ))
                )}

                <div className="border-t mt-2 pt-2">
                  {!showSaveInput ? (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 w-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Guardar filtros actuales
                    </button>
                  ) : (
                    <div className="px-2">
                      <input
                        type="text"
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        placeholder="Nombre del favorito..."
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newFilterName.trim()) {
                              saveCurrentFilters(newFilterName.trim())
                              setNewFilterName("")
                              setShowSaveInput(false)
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => { setShowSaveInput(false); setNewFilterName("") }}
                          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeQuickFilters.map(qfId => {
            const qf = config.quickFilters.find(f => f.id === qfId)
            return qf ? (
              <span key={qfId} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                {qf.label}
                <button onClick={() => toggleQuickFilter(qfId)} className="hover:text-indigo-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ) : null
          })}
          {activeDateFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {config.dateFilters.find(f => f.id === activeDateFilter)?.label}
              <button onClick={() => setActiveDateFilter("")} className="hover:text-green-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {filterConditions.map(cond => {
            const field = config.filterFields.find(f => f.field === cond.field)
            return (
              <span key={cond.id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                {field?.label} {cond.operator} "{cond.value}"
                <button onClick={() => removeFilterCondition(cond.id)} className="hover:text-amber-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
          {groupBy && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Agrupado por: {config.groupByOptions.find(o => o.field === groupBy)?.label || config.filterFields.find(f => f.field === groupBy)?.label}
              <button onClick={() => setGroupBy("")} className="hover:text-purple-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// CRUD Modal Component
interface FieldConfig {
  name: string
  label: string
  type: "text" | "email" | "select" | "checkbox"
  required?: boolean
  value?: string | number | boolean
  options?: { value: string | number; label: string }[]
}

interface CRUDModalProps {
  title: string
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  fields: FieldConfig[]
}

function CRUDModal({ title, onClose, onSave, fields }: CRUDModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    fields.forEach(f => {
      initial[f.name] = f.value ?? (f.type === "checkbox" ? false : "")
    })
    return initial
  })

  const handleSubmit = () => {
    const missingRequired = fields.filter(f => f.required && !formData[f.name])
    if (missingRequired.length > 0) {
      alert("Por favor complete todos los campos requeridos")
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-900 text-white px-5 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none hover:text-white/80">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "select" ? (
                <select
                  value={formData[field.name] as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field.name])}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}
        </div>
        <div className="bg-gray-50 px-5 py-4 flex justify-end gap-3 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// Config Modal Component with children
interface ConfigModalProps {
  title: string
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  children: React.ReactNode
}

function ConfigModal({ title, onClose, onSave, children }: ConfigModalProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = () => {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    const data: Record<string, unknown> = {}
    formData.forEach((value, key) => {
      if (value === "on") {
        data[key] = true
      } else if (value === "") {
        // Check if it's a checkbox that's unchecked
        const input = formRef.current?.querySelector(`[name="${key}"]`) as HTMLInputElement
        if (input?.type === "checkbox") {
          data[key] = false
        } else {
          data[key] = value
        }
      } else {
        // Try to convert to number if it looks like one
        const numValue = Number(value)
        data[key] = isNaN(numValue) || value === "" ? value : numValue
      }
    })
    // Handle unchecked checkboxes
    formRef.current.querySelectorAll('input[type="checkbox"]').forEach((checkbox: Element) => {
      const input = checkbox as HTMLInputElement
      if (!(input.name in data)) {
        data[input.name] = false
      }
    })
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-900 text-white px-5 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none hover:text-white/80">&times;</button>
        </div>
        <form ref={formRef} className="p-5">
          {children}
        </form>
        <div className="bg-gray-50 px-5 py-4 flex justify-end gap-3 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} type="button" className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// Export wrapped component with auth
export default function CellHomeERP() {
  return (
    <ERPWrapper>
      <CellHomeERPContent />
    </ERPWrapper>
  )
}
