"use client"

import { useState } from "react"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Wrench, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ArrowRight,
  Users,
  ShoppingCart,
  BarChart3,
  Bell,
  Star,
  Target,
  Cake,
  UtensilsCrossed,
  Palmtree,
  Thermometer,
  Gift,
  X,
  Send,
  FolderOpen,
  FileCheck,
  BookOpen,
  Network,
  ChevronRight,
  Download,
  Eye
} from "lucide-react"

// Mock data para el usuario actual
const currentUser = {
  id: 1,
  nombre: "Martín",
  apellido: "González",
  rol: "Administrador",
  avatar: null,
  sucursal: "Casa Central",
  diasVacacionesDisponibles: 12,
  diasVacacionesTomados: 3
}

// Mock data para cumpleaños
const cumpleanosHoy = [
  { id: 1, nombre: "Ana", apellido: "Rodríguez", puesto: "Técnica" },
  { id: 2, nombre: "Carlos", apellido: "Méndez", puesto: "Ventas" },
]

// Mock data para menú del almuerzo
const menuAlmuerzo = {
  disponible: true,
  horaLimite: "11:00",
  opciones: [
    { id: 1, nombre: "Milanesa con puré", precio: 3500 },
    { id: 2, nombre: "Pollo grillado con ensalada", precio: 3200 },
    { id: 3, nombre: "Pasta del día", precio: 2800 },
    { id: 4, nombre: "Empanadas (x3)", precio: 2400 },
    { id: 5, nombre: "Ensalada completa", precio: 2600 },
  ]
}

// Mock data para documentos del empleado (estilo Drive)
const misDocumentos = {
  carpetas: [
    { 
      id: 1, 
      nombre: "Mi puesto", 
      icono: "puesto",
      archivos: [
        { id: 1, nombre: "Descripción del puesto - Administrador.pdf", tipo: "pdf", fecha: "2024-01-15" },
        { id: 2, nombre: "Objetivos 2024.pdf", tipo: "pdf", fecha: "2024-01-20" },
        { id: 3, nombre: "Evaluación de desempeño Q4-2023.pdf", tipo: "pdf", fecha: "2024-01-05" },
      ]
    },
    { 
      id: 2, 
      nombre: "Procedimientos", 
      icono: "procedimientos",
      archivos: [
        { id: 4, nombre: "Manual de procesos - Ventas.pdf", tipo: "pdf", fecha: "2023-11-10" },
        { id: 5, nombre: "Protocolo de atención al cliente.pdf", tipo: "pdf", fecha: "2023-09-05" },
        { id: 6, nombre: "Guía de uso del ERP.pdf", tipo: "pdf", fecha: "2024-02-01" },
      ]
    },
    { 
      id: 3, 
      nombre: "Capacitaciones", 
      icono: "capacitacion",
      archivos: [
        { id: 7, nombre: "Certificado - Atención al cliente.pdf", tipo: "pdf", fecha: "2023-08-15" },
        { id: 8, nombre: "Capacitación - Nuevos productos Apple.pdf", tipo: "pdf", fecha: "2024-01-25" },
      ]
    },
    { 
      id: 4, 
      nombre: "Recibos de sueldo", 
      icono: "recibos",
      archivos: [
        { id: 9, nombre: "Recibo - Febrero 2024.pdf", tipo: "pdf", fecha: "2024-02-28" },
        { id: 10, nombre: "Recibo - Enero 2024.pdf", tipo: "pdf", fecha: "2024-01-31" },
        { id: 11, nombre: "Recibo - Diciembre 2023.pdf", tipo: "pdf", fecha: "2023-12-29" },
      ]
    },
  ]
}

// Mock data para organigrama
const organigrama = {
  empresa: "TechFix SRL",
  miPosicion: {
    nombre: "Martín González",
    puesto: "Administrador",
    area: "Administración",
    reportaA: { nombre: "Roberto Fernández", puesto: "Director General" },
    equipoDirecto: [
      { nombre: "Ana Rodríguez", puesto: "Técnica Senior" },
      { nombre: "Carlos Méndez", puesto: "Ventas" },
      { nombre: "Pedro Martínez", puesto: "Técnico" },
    ]
  },
  areas: [
    { nombre: "Dirección", cantidad: 2 },
    { nombre: "Administración", cantidad: 3 },
    { nombre: "Ventas", cantidad: 4 },
    { nombre: "Taller", cantidad: 8 },
    { nombre: "Depósito", cantidad: 2 },
  ]
}

// Mock data para KPIs
const mockKPIs = {
  ventasHoy: 125400,
  ventasAyer: 98200,
  otPendientes: 12,
  otEnProceso: 8,
  cobranzasPendientes: 45600,
  stockBajo: 5
}

// Mock data para tareas pendientes
const mockTareas = [
  { id: 1, tipo: "ot", titulo: "OT-2024-015 - Control de calidad pendiente", prioridad: "alta", fecha: "Hoy", icono: Wrench },
  { id: 2, tipo: "cobranza", titulo: "Cobranza pendiente - Juan Pérez ($12,500)", prioridad: "media", fecha: "Hoy", icono: DollarSign },
  { id: 3, tipo: "stock", titulo: "Stock bajo: Pantalla iPhone 14 Pro (2 unidades)", prioridad: "alta", fecha: "Hoy", icono: Package },
  { id: 4, tipo: "ot", titulo: "OT-2024-012 - Esperando aprobación cliente", prioridad: "media", fecha: "Ayer", icono: Wrench },
  { id: 5, tipo: "factura", titulo: "Factura #00125 vencida hace 3 días", prioridad: "alta", fecha: "Hace 3 días", icono: FileText },
]

// Mock data para actividad reciente
const mockActividad = [
  { id: 1, accion: "Nueva venta registrada", detalle: "NV-2024-089 - $45,200", usuario: "Carlos", tiempo: "Hace 5 min" },
  { id: 2, accion: "OT completada", detalle: "OT-2024-014 - iPhone 14 Pro", usuario: "Pedro", tiempo: "Hace 15 min" },
  { id: 3, accion: "Pago recibido", detalle: "María García - $28,000", usuario: "Ana", tiempo: "Hace 30 min" },
  { id: 4, accion: "Stock actualizado", detalle: "Recepción de mercadería", usuario: "Luis", tiempo: "Hace 1 hora" },
  { id: 5, accion: "Cliente nuevo", detalle: "Tech Solutions SRL", usuario: "Martín", tiempo: "Hace 2 horas" },
]

// Accesos rápidos
const accesosRapidos = [
  { id: 1, nombre: "Nueva OT", icono: Wrench, color: "bg-blue-500", modulo: "taller" },
  { id: 2, nombre: "Nueva Venta", icono: ShoppingCart, color: "bg-emerald-500", modulo: "ventas" },
  { id: 3, nombre: "Registrar Pago", icono: DollarSign, color: "bg-amber-500", modulo: "caja" },
  { id: 4, nombre: "Ver Stock", icono: Package, color: "bg-purple-500", modulo: "deposito" },
]

export default function ModuloHome() {
  const [hoveredKPI, setHoveredKPI] = useState<string | null>(null)
  const [showAlmuerzoModal, setShowAlmuerzoModal] = useState(false)
  const [showLicenciaModal, setShowLicenciaModal] = useState(false)
  const [showDocumentosModal, setShowDocumentosModal] = useState(false)
  const [showOrganigramaModal, setShowOrganigramaModal] = useState(false)
  const [carpetaAbierta, setCarpetaAbierta] = useState<number | null>(null)
  const [almuerzoSeleccionado, setAlmuerzoSeleccionado] = useState<number | null>(null)
  const [licenciaTipo, setLicenciaTipo] = useState<string>("enfermedad")
  const [licenciaMotivo, setLicenciaMotivo] = useState("")
  
  // Obtener saludo según la hora
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 19) return "Buenas tardes"
    return "Buenas noches"
  }

  // Obtener frase motivacional según el día
  const getDayMessage = () => {
    const day = new Date().getDay() // 0=domingo, 1=lunes, etc.
    const messages: { [key: number]: { emoji: string; text: string } } = {
      0: { emoji: "☀️", text: "Domingo relax, recargá energías" },
      1: { emoji: "💪", text: "Arrancamos la semana con todo" },
      2: { emoji: "🚀", text: "Martes productivo, vamos que se puede" },
      3: { emoji: "⚡", text: "Mitad de semana, dale que falta menos" },
      4: { emoji: "🔥", text: "Jueves, ya se viene el finde" },
      5: { emoji: "🎉", text: "Viernes, dale que es viernes!" },
      6: { emoji: "🌟", text: "Sábado, último empujón" },
    }
    return messages[day] || { emoji: "✨", text: "Que tengas un gran día" }
  }

  const dayMessage = getDayMessage()
  
  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
  }
  
  // Calcular variación porcentual
  const calcVariacion = (actual: number, anterior: number) => {
    if (anterior === 0) return 0
    return ((actual - anterior) / anterior) * 100
  }
  
  const variacionVentas = calcVariacion(mockKPIs.ventasHoy, mockKPIs.ventasAyer)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con saludo */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                {getGreeting()}, {currentUser.nombre} <span className="text-4xl">{dayMessage.emoji}</span>
              </h1>
              <p className="text-amber-100 mt-1">
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — {dayMessage.text}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center gap-3 bg-white/20 rounded-lg px-4 py-2">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-white font-semibold">
                  {currentUser.nombre[0]}{currentUser.apellido[0]}
                </div>
                <div className="text-white">
                  <div className="font-medium">{currentUser.nombre} {currentUser.apellido}</div>
                  <div className="text-xs text-amber-100">{currentUser.rol}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 -mt-6">
        {/* Notificaciones sociales y RRHH */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Cumpleaños */}
          {cumpleanosHoy.length > 0 && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Cake className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {cumpleanosHoy.length === 1 
                      ? `Hoy es el cumple de ${cumpleanosHoy[0].nombre}!`
                      : `Hoy cumplen: ${cumpleanosHoy.map(c => c.nombre).join(", ")}`
                    }
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {cumpleanosHoy.map(c => `${c.nombre} ${c.apellido} - ${c.puesto}`).join(" | ")}
                  </div>
                </div>
                <button className="p-2 bg-pink-100 hover:bg-pink-200 rounded-lg transition-colors">
                  <Gift className="w-4 h-4 text-pink-600" />
                </button>
              </div>
            </div>
          )}

          {/* Almuerzo */}
          {menuAlmuerzo.disponible && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    Almuerzo disponible
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {currentUser.sucursal} - Pedí hasta las {menuAlmuerzo.horaLimite}
                  </div>
                </div>
                <button 
                  onClick={() => setShowAlmuerzoModal(true)}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Pedir
                </button>
              </div>
            </div>
          )}

          {/* Panel RRHH */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Palmtree className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  {currentUser.diasVacacionesDisponibles} días de vacaciones
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {currentUser.diasVacacionesTomados} días tomados este año
                </div>
              </div>
              <button 
                onClick={() => setShowLicenciaModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
              >
                <Thermometer className="w-4 h-4" />
                Pedir licencia
              </button>
            </div>
          </div>
        </div>

        {/* Mis Documentos y Organigrama */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Mis Documentos - estilo Drive */}
          <div 
            onClick={() => setShowDocumentosModal(true)}
            className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-gray-900">Mis Documentos</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Descripción de puesto, procedimientos, recibos y más
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {misDocumentos.carpetas.reduce((acc, c) => acc + c.archivos.length, 0)} archivos
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              {misDocumentos.carpetas.slice(0, 4).map(carpeta => (
                <div key={carpeta.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {carpeta.nombre}
                </div>
              ))}
            </div>
          </div>

          {/* Organigrama */}
          <div 
            onClick={() => setShowOrganigramaModal(true)}
            className="bg-white rounded-xl p-5 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Network className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-gray-900">Organigrama</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Conocé la estructura de {organigrama.empresa}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Tu área:</span> {organigrama.miPosicion.area}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Reportás a:</span> {organigrama.miPosicion.reportaA.nombre}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Equipo:</span> {organigrama.miPosicion.equipoDirecto.length} personas
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Columna izquierda - Tareas pendientes */}
          <div className="col-span-2 space-y-6">
            {/* Tareas pendientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Tareas pendientes
                </h2>
                <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Ver todas
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {mockTareas.map(tarea => (
                  <div key={tarea.id} className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      tarea.prioridad === 'alta' ? 'bg-red-100' : 
                      tarea.prioridad === 'media' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <tarea.icono className={`w-4 h-4 ${
                        tarea.prioridad === 'alta' ? 'text-red-600' : 
                        tarea.prioridad === 'media' ? 'text-amber-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{tarea.titulo}</div>
                      <div className="text-xs text-gray-500">{tarea.fecha}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      tarea.prioridad === 'alta' ? 'bg-red-100 text-red-700' : 
                      tarea.prioridad === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tarea.prioridad === 'alta' ? 'Urgente' : tarea.prioridad === 'media' ? 'Media' : 'Normal'}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 gap-4">
              {/* OTs por estado */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  OTs por estado
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-sm text-gray-600">Borrador</span>
                    </div>
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-600">En proceso</span>
                    </div>
                    <span className="text-sm font-semibold">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-gray-600">Control calidad</span>
                    </div>
                    <span className="text-sm font-semibold">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-gray-600">A entregar</span>
                    </div>
                    <span className="text-sm font-semibold">6</span>
                  </div>
                </div>
              </div>

              {/* Top técnicos */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Top técnicos del mes
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">PM</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Pedro Martínez</div>
                      <div className="text-xs text-gray-500">32 OTs completadas</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.9</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">AR</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Ana Rodríguez</div>
                      <div className="text-xs text-gray-500">28 OTs completadas</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">LS</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Luis Sánchez</div>
                      <div className="text-xs text-gray-500">25 OTs completadas</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Accesos rápidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Accesos rápidos</h3>
              <div className="grid grid-cols-2 gap-3">
                {accesosRapidos.map(acceso => (
                  <button 
                    key={acceso.id}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                  >
                    <div className={`p-3 rounded-lg ${acceso.color}`}>
                      <acceso.icono className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{acceso.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Actividad reciente
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {mockActividad.map(actividad => (
                  <div key={actividad.id} className="px-5 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{actividad.accion}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{actividad.detalle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{actividad.usuario}</span>
                      <span>•</span>
                      <span>{actividad.tiempo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendario / Próximos eventos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Próximas entregas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">15</div>
                    <div className="text-xs text-gray-500">MAR</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">OT-2024-003</div>
                    <div className="text-xs text-gray-500">Carlos López - iPhone 14</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">16</div>
                    <div className="text-xs text-gray-500">MAR</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">OT-2024-007</div>
                    <div className="text-xs text-gray-500">Tech Solutions - MacBook Pro</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">17</div>
                    <div className="text-xs text-gray-500">MAR</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">OT-2024-011</div>
                    <div className="text-xs text-gray-500">María García - Samsung S23</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Almuerzo */}
      {showAlmuerzoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                Pedido de almuerzo
              </h3>
              <button 
                onClick={() => { setShowAlmuerzoModal(false); setAlmuerzoSeleccionado(null) }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Seleccioná tu opción para hoy ({currentUser.sucursal}). Recordá que los pedidos se toman hasta las {menuAlmuerzo.horaLimite}.
              </p>
              <div className="space-y-2">
                {menuAlmuerzo.opciones.map(opcion => (
                  <label
                    key={opcion.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      almuerzoSeleccionado === opcion.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="almuerzo"
                        value={opcion.id}
                        checked={almuerzoSeleccionado === opcion.id}
                        onChange={() => setAlmuerzoSeleccionado(opcion.id)}
                        className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-900">{opcion.nombre}</span>
                    </div>
                    <span className="text-sm text-gray-500">${opcion.precio.toLocaleString()}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowAlmuerzoModal(false); setAlmuerzoSeleccionado(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { 
                  alert(`Pedido confirmado: ${menuAlmuerzo.opciones.find(o => o.id === almuerzoSeleccionado)?.nombre}`)
                  setShowAlmuerzoModal(false)
                  setAlmuerzoSeleccionado(null)
                }}
                disabled={!almuerzoSeleccionado}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Confirmar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Licencia */}
      {showLicenciaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-emerald-500" />
                Solicitar licencia
              </h3>
              <button 
                onClick={() => { setShowLicenciaModal(false); setLicenciaMotivo("") }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de licencia</label>
                <select
                  value={licenciaTipo}
                  onChange={(e) => setLicenciaTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="enfermedad">Enfermedad</option>
                  <option value="familiar">Familiar enfermo</option>
                  <option value="mudanza">Mudanza</option>
                  <option value="estudio">Examen / Estudio</option>
                  <option value="personal">Día personal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Observaciones</label>
                <textarea
                  value={licenciaMotivo}
                  onChange={(e) => setLicenciaMotivo(e.target.value)}
                  rows={3}
                  placeholder="Describí brevemente el motivo..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              {licenciaTipo === "enfermedad" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    Recordá que las licencias por enfermedad mayores a 2 días requieren certificado médico.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowLicenciaModal(false); setLicenciaMotivo("") }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { 
                  alert("Solicitud de licencia enviada. RRHH la revisará a la brevedad.")
                  setShowLicenciaModal(false)
                  setLicenciaMotivo("")
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Documentos - Estilo Drive */}
      {showDocumentosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                Mis Documentos
              </h3>
              <button 
                onClick={() => { setShowDocumentosModal(false); setCarpetaAbierta(null) }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {carpetaAbierta === null ? (
                // Vista de carpetas
                <div className="grid grid-cols-2 gap-3">
                  {misDocumentos.carpetas.map(carpeta => (
                    <div
                      key={carpeta.id}
                      onClick={() => setCarpetaAbierta(carpeta.id)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {carpeta.icono === "puesto" && <FileCheck className="w-5 h-5 text-blue-600" />}
                        {carpeta.icono === "procedimientos" && <BookOpen className="w-5 h-5 text-blue-600" />}
                        {carpeta.icono === "capacitacion" && <Star className="w-5 h-5 text-blue-600" />}
                        {carpeta.icono === "recibos" && <FileText className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{carpeta.nombre}</div>
                        <div className="text-xs text-gray-500">{carpeta.archivos.length} archivos</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                // Vista de archivos de una carpeta
                <div>
                  <button
                    onClick={() => setCarpetaAbierta(null)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Volver a carpetas
                  </button>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {misDocumentos.carpetas.find(c => c.id === carpetaAbierta)?.nombre}
                  </h4>
                  <div className="space-y-2">
                    {misDocumentos.carpetas.find(c => c.id === carpetaAbierta)?.archivos.map(archivo => (
                      <div
                        key={archivo.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="p-2 bg-red-100 rounded">
                          <FileText className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{archivo.nombre}</div>
                          <div className="text-xs text-gray-500">Actualizado: {archivo.fecha}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg" title="Ver">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg" title="Descargar">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Organigrama */}
      {showOrganigramaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-500" />
                Organigrama - {organigrama.empresa}
              </h3>
              <button 
                onClick={() => setShowOrganigramaModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {/* Mi posición */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tu posición</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-lg">
                      {organigrama.miPosicion.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{organigrama.miPosicion.nombre}</div>
                      <div className="text-sm text-purple-600">{organigrama.miPosicion.puesto}</div>
                      <div className="text-xs text-gray-500">{organigrama.miPosicion.area}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reporta a */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reportás a</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
                      {organigrama.miPosicion.reportaA.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{organigrama.miPosicion.reportaA.nombre}</div>
                      <div className="text-sm text-gray-500">{organigrama.miPosicion.reportaA.puesto}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipo directo */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tu equipo directo</h4>
                <div className="grid grid-cols-3 gap-3">
                  {organigrama.miPosicion.equipoDirecto.map((persona, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                          {persona.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{persona.nombre}</div>
                          <div className="text-xs text-gray-500">{persona.puesto}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Áreas de la empresa */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Áreas de la empresa</h4>
                <div className="grid grid-cols-5 gap-3">
                  {organigrama.areas.map((area, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{area.cantidad}</div>
                      <div className="text-xs text-gray-500">{area.nombre}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
