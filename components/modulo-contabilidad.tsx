"use client"

import React, { useState } from "react"
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Coins,
  Save,
  X,
  TrendingUp
} from "lucide-react"

// Types
interface TipoCotizacion {
  id: number
  nombre: string
  descripcion: string
  activo: boolean
}

interface Cotizacion {
  id: number
  fecha: string
  tipo: string
  tasa: number
}

interface Moneda {
  id: number
  nombre: string
  simbolo: string
  cotizacion_actual: number
  cotizacion_automatica: boolean
  tipo_cotizacion_defecto: string
  factor_redondeo: number
  precision_calculo: number
  posicion_simbolo: "antes" | "despues"
  moneda_afip: string
  es_base: boolean
  activo: boolean
  fecha_tasa: string
  cotizaciones: Cotizacion[]
}

// Datos de ejemplo - Tipos de Cotizaciones
const tiposCotizacionIniciales: TipoCotizacion[] = [
  {
    id: 1,
    nombre: "Oficial",
    descripcion: "Cotización oficial del Banco Central",
    activo: true
  },
  {
    id: 2,
    nombre: "Blue",
    descripcion: "Cotización del mercado paralelo",
    activo: true
  },
  {
    id: 3,
    nombre: "Divisa",
    descripcion: "Cotización para operaciones de comercio exterior",
    activo: true
  }
]

// Datos de ejemplo - Monedas
const monedasIniciales: Moneda[] = [
  {
    id: 1,
    nombre: "ARS",
    simbolo: "$",
    cotizacion_actual: 1,
    cotizacion_automatica: false,
    tipo_cotizacion_defecto: "Oficial",
    factor_redondeo: 1.000,
    precision_calculo: 0.010000,
    posicion_simbolo: "antes",
    moneda_afip: "PES - Peso Argentino",
    es_base: true,
    activo: true,
    fecha_tasa: "2010-01-01",
    cotizaciones: [
      { id: 1, fecha: "2010-01-01", tipo: "Oficial", tasa: 1 }
    ]
  },
  {
    id: 2,
    nombre: "USD",
    simbolo: "$",
    cotizacion_actual: 1450000,
    cotizacion_automatica: false,
    tipo_cotizacion_defecto: "Blue",
    factor_redondeo: 0.010000,
    precision_calculo: 4,
    posicion_simbolo: "antes",
    moneda_afip: "DOL - Dólar Estadounidense",
    es_base: false,
    activo: true,
    fecha_tasa: "2026-03-17",
    cotizaciones: [
      { id: 1, fecha: "2026-03-17", tipo: "Blue", tasa: 1450000 },
      { id: 2, fecha: "2026-03-16", tipo: "Blue", tasa: 1448500 },
      { id: 3, fecha: "2026-03-15", tipo: "Blue", tasa: 1445000 },
      { id: 4, fecha: "2026-03-14", tipo: "Blue", tasa: 1442000 },
      { id: 5, fecha: "2026-03-13", tipo: "Blue", tasa: 1438000 },
      { id: 6, fecha: "2026-03-12", tipo: "Blue", tasa: 1435000 },
      { id: 7, fecha: "2026-03-11", tipo: "Blue", tasa: 1432000 },
      { id: 8, fecha: "2026-03-10", tipo: "Blue", tasa: 1430000 },
      // Más datos históricos para paginación
      ...Array.from({ length: 72 }, (_, i) => ({
        id: i + 9,
        fecha: new Date(2026, 2, 9 - i).toISOString().split("T")[0],
        tipo: "Blue" as const,
        tasa: 1430000 - (i * 2500)
      }))
    ]
  }
]

const monedasAFIP = [
  "DOL - Dólar Estadounidense",
  "EUR - Euro",
  "PES - Peso Argentino",
  "BRL - Real Brasileño",
  "GBP - Libra Esterlina",
  "JPY - Yen Japonés",
  "CNY - Yuan Chino",
  "CHF - Franco Suizo"
]

export default function ModuloContabilidad() {
  // Estado principal
  const [activeView, setActiveView] = useState("monedas")
  const [expandedSections, setExpandedSections] = useState<string[]>(["configuracion"])

  // Tipos de Cotizaciones
  const [tiposCotizacion, setTiposCotizacion] = useState<TipoCotizacion[]>(tiposCotizacionIniciales)
  const [selectedTipoCotizacion, setSelectedTipoCotizacion] = useState<TipoCotizacion | null>(null)
  const [editingTipoCotizacion, setEditingTipoCotizacion] = useState<TipoCotizacion | null>(null)
  const [tipoCotizacionSearchText, setTipoCotizacionSearchText] = useState("")
  const [creatingTipoCotizacion, setCreatingTipoCotizacion] = useState(false)

  // Monedas
  const [monedas, setMonedas] = useState<Moneda[]>(monedasIniciales)
  const [selectedMoneda, setSelectedMoneda] = useState<Moneda | null>(null)
  const [editingMoneda, setEditingMoneda] = useState<Moneda | null>(null)
  const [monedaSearchText, setMonedaSearchText] = useState("")
  const [monedaTab, setMonedaTab] = useState<"cotizaciones" | "configuracion">("cotizaciones")
  const [cotizacionPage, setCotizacionPage] = useState(1)
  const cotizacionesPerPage = 6

  // Nueva cotización en edición
  const [nuevaCotizacion, setNuevaCotizacion] = useState<{
    fecha: string
    tipo: string
    tasa: string
  }>({
    fecha: new Date().toISOString().split("T")[0],
    tipo: "Blue",
    tasa: ""
  })

  // Helpers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-AR', { 
      minimumFractionDigits: 3,
      maximumFractionDigits: 6 
    }).format(num)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR')
  }

  // Menu
  const menuSections = [
    {
      id: "configuracion",
      label: "Configuración",
      icon: Coins,
      items: [
        { id: "monedas", label: "Monedas", icon: Coins },
        { id: "tipos-cotizacion", label: "Tipos de Cotizaciones", icon: TrendingUp }
      ]
    }
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Guardar cambios de moneda
  const guardarMoneda = () => {
    if (!editingMoneda) return
    
    setMonedas(prev => prev.map(m => 
      m.id === editingMoneda.id ? editingMoneda : m
    ))
    setSelectedMoneda(editingMoneda)
    setEditingMoneda(null)
  }

  // Descartar cambios
  const descartarCambios = () => {
    setEditingMoneda(null)
  }

  // Agregar nueva cotización
  const agregarCotizacion = () => {
    if (!editingMoneda || !nuevaCotizacion.tasa) return

    const nuevaCotizacionObj: Cotizacion = {
      id: Math.max(...editingMoneda.cotizaciones.map(c => c.id), 0) + 1,
      fecha: nuevaCotizacion.fecha,
      tipo: nuevaCotizacion.tipo,
      tasa: parseFloat(nuevaCotizacion.tasa.replace(/\./g, '').replace(',', '.'))
    }

    setEditingMoneda({
      ...editingMoneda,
      cotizaciones: [nuevaCotizacionObj, ...editingMoneda.cotizaciones],
      cotizacion_actual: nuevaCotizacionObj.tasa,
      fecha_tasa: nuevaCotizacion.fecha
    })

    setNuevaCotizacion({
      fecha: new Date().toISOString().split("T")[0],
      tipo: editingMoneda.tipo_cotizacion_defecto,
      tasa: ""
    })
  }

  // Eliminar cotización
  const eliminarCotizacion = (cotizacionId: number) => {
    if (!editingMoneda) return
    
    setEditingMoneda({
      ...editingMoneda,
      cotizaciones: editingMoneda.cotizaciones.filter(c => c.id !== cotizacionId)
    })
  }

  // Tipos de Cotización - CRUD
  const guardarTipoCotizacion = () => {
    if (!editingTipoCotizacion) return
    
    if (creatingTipoCotizacion) {
      const nuevoTipo: TipoCotizacion = {
        ...editingTipoCotizacion,
        id: Math.max(...tiposCotizacion.map(t => t.id), 0) + 1
      }
      setTiposCotizacion(prev => [...prev, nuevoTipo])
      setSelectedTipoCotizacion(nuevoTipo)
    } else {
      setTiposCotizacion(prev => prev.map(t => 
        t.id === editingTipoCotizacion.id ? editingTipoCotizacion : t
      ))
      setSelectedTipoCotizacion(editingTipoCotizacion)
    }
    setEditingTipoCotizacion(null)
    setCreatingTipoCotizacion(false)
  }

  const descartarTipoCotizacion = () => {
    setEditingTipoCotizacion(null)
    setCreatingTipoCotizacion(false)
    if (creatingTipoCotizacion) {
      setSelectedTipoCotizacion(null)
    }
  }

  const crearNuevoTipoCotizacion = () => {
    const nuevoTipo: TipoCotizacion = {
      id: 0,
      nombre: "",
      descripcion: "",
      activo: true
    }
    setSelectedTipoCotizacion(nuevoTipo)
    setEditingTipoCotizacion(nuevoTipo)
    setCreatingTipoCotizacion(true)
  }

  const eliminarTipoCotizacion = (id: number) => {
    setTiposCotizacion(prev => prev.filter(t => t.id !== id))
    if (selectedTipoCotizacion?.id === id) {
      setSelectedTipoCotizacion(null)
      setEditingTipoCotizacion(null)
    }
  }

  // Sidebar
  const renderSidebar = () => (
    <div className="w-56 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Contabilidad</h2>
      </div>
      <div className="p-2">
        {menuSections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <span className="flex items-center gap-2">
                <section.icon className="w-4 h-4" />
                {section.label}
              </span>
              {expandedSections.includes(section.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.includes(section.id) && (
              <div className="ml-4 mt-1 space-y-0.5">
{section.items.map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      setActiveView(item.id)
                                      // Limpiar estados al cambiar de vista
                                      setSelectedMoneda(null)
                                      setEditingMoneda(null)
                                      setSelectedTipoCotizacion(null)
                                      setEditingTipoCotizacion(null)
                                      setCreatingTipoCotizacion(false)
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                                      activeView === item.id
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                  >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                  </button>
                                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // Vista de lista de monedas
  const renderListaMonedas = () => {
    const filteredMonedas = monedas.filter(m =>
      m.nombre.toLowerCase().includes(monedaSearchText.toLowerCase())
    )

    return (
      <div>
        {/* Barra superior */}
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-2 px-4 -mx-6 -mt-6">
          <button 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Crear
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={monedaSearchText}
                onChange={(e) => setMonedaSearchText(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-64 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Filtros
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Agrupar
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Favoritos
            </button>
            <span className="text-sm text-gray-500 ml-4">
              1-{filteredMonedas.length} de {filteredMonedas.length}
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Moneda</th>
                <th className="text-left py-3 px-4 font-medium">Fecha</th>
                <th className="text-right py-3 px-4 font-medium">Tasa actual</th>
                <th className="text-right py-3 px-4 font-medium">Factor de redondeo</th>
                <th className="text-right py-3 px-4 font-medium">Precisión de cálculo</th>
                <th className="text-left py-3 px-4 font-medium">Posición del símbolo</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonedas.map((moneda, idx) => (
                <tr 
                  key={moneda.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                  onClick={() => {
                    setSelectedMoneda(moneda)
                    setEditingMoneda({ ...moneda })
                    setCotizacionPage(1)
                  }}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{moneda.nombre}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(moneda.fecha_tasa)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatNumber(moneda.cotizacion_actual)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatNumber(moneda.factor_redondeo)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatNumber(moneda.precision_calculo)}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {moneda.posicion_simbolo === "antes" ? "Antes de la cantidad" : "Después del importe"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Vista de detalle/edición de moneda
  const renderDetalleMoneda = () => {
    if (!selectedMoneda || !editingMoneda) return null

    const currentMoneda = editingMoneda
    const totalCotizaciones = currentMoneda.cotizaciones.length
    const startIdx = (cotizacionPage - 1) * cotizacionesPerPage
    const endIdx = startIdx + cotizacionesPerPage
    const cotizacionesPaginadas = currentMoneda.cotizaciones.slice(startIdx, endIdx)
    const totalPages = Math.ceil(totalCotizaciones / cotizacionesPerPage)

    // Navegación entre monedas
    const currentIndex = monedas.findIndex(m => m.id === selectedMoneda.id)
    const prevMoneda = currentIndex > 0 ? monedas[currentIndex - 1] : null
    const nextMoneda = currentIndex < monedas.length - 1 ? monedas[currentIndex + 1] : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <button 
            onClick={() => {
              setSelectedMoneda(null)
              setEditingMoneda(null)
            }} 
            className="hover:text-blue-600"
          >
            Monedas
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{currentMoneda.nombre}</span>
        </div>

        {/* Header con botones */}
        <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={guardarMoneda}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
            <button 
              onClick={descartarCambios}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
            >
              <X className="w-4 h-4" />
              Descartar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (prevMoneda) {
                  setSelectedMoneda(prevMoneda)
                  setEditingMoneda({ ...prevMoneda })
                  setCotizacionPage(1)
                }
              }}
              disabled={!prevMoneda}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (nextMoneda) {
                  setSelectedMoneda(nextMoneda)
                  setEditingMoneda({ ...nextMoneda })
                  setCotizacionPage(1)
                }
              }}
              disabled={!nextMoneda}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          {/* Campos principales */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={currentMoneda.nombre}
                onChange={(e) => setEditingMoneda({ ...currentMoneda, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cotización Actual</label>
              <input
                type="text"
                value={formatNumber(currentMoneda.cotizacion_actual)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0
                  setEditingMoneda({ ...currentMoneda, cotizacion_actual: value })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cotizacion_automatica"
                checked={currentMoneda.cotizacion_automatica}
                onChange={(e) => setEditingMoneda({ ...currentMoneda, cotizacion_automatica: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="cotizacion_automatica" className="text-sm text-gray-700">Cotización Automática</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cotización por Defecto</label>
              <select
                value={currentMoneda.tipo_cotizacion_defecto}
                onChange={(e) => setEditingMoneda({ 
                  ...currentMoneda, 
                  tipo_cotizacion_defecto: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {tiposCotizacion.filter(t => t.activo).map(tipo => (
                  <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setMonedaTab("cotizaciones")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  monedaTab === "cotizaciones"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Cotizaciones
              </button>
              <button
                onClick={() => setMonedaTab("configuracion")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  monedaTab === "configuracion"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Configuración
              </button>
            </div>
          </div>

          {/* Contenido de pestañas */}
          {monedaTab === "cotizaciones" && (
            <div>
              {/* Tabla de cotizaciones */}
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium">Fecha</th>
                    <th className="text-left py-2 px-3 font-medium">Tipo de Cotización</th>
                    <th className="text-right py-2 px-3 font-medium">Tasa</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Fila para nueva entrada */}
                  <tr className="border-b border-gray-100 bg-blue-50/50">
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={nuevaCotizacion.fecha}
                        onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, fecha: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={nuevaCotizacion.tipo}
                        onChange={(e) => setNuevaCotizacion({ 
                          ...nuevaCotizacion, 
                          tipo: e.target.value
                        })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {tiposCotizacion.filter(t => t.activo).map(tipo => (
                          <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="0.000"
                        value={nuevaCotizacion.tasa}
                        onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, tasa: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            agregarCotizacion()
                          }
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-full text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={agregarCotizacion}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Agregar cotización"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Cotizaciones existentes */}
                  {cotizacionesPaginadas.map((cotizacion, idx) => (
                    <tr 
                      key={cotizacion.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="py-2 px-3 text-sm text-gray-700">{formatDate(cotizacion.fecha)}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{cotizacion.tipo}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 text-right">{formatNumber(cotizacion.tasa)}</td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => eliminarCotizacion(cotizacion.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {startIdx + 1}-{Math.min(endIdx, totalCotizaciones)} de {totalCotizaciones}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCotizacionPage(p => Math.max(1, p - 1))}
                    disabled={cotizacionPage === 1}
                    className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {cotizacionPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCotizacionPage(p => Math.min(totalPages, p + 1))}
                    disabled={cotizacionPage === totalPages}
                    className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {monedaTab === "configuracion" && (
            <div className="space-y-6">
              {/* Sección Precisión */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Precisión</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Factor de redondeo</label>
                    <input
                      type="text"
                      value={formatNumber(currentMoneda.factor_redondeo)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0
                        setEditingMoneda({ ...currentMoneda, factor_redondeo: value })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Precisión de cálculo</label>
                    <input
                      type="number"
                      value={currentMoneda.precision_calculo}
                      onChange={(e) => setEditingMoneda({ 
                        ...currentMoneda, 
                        precision_calculo: parseInt(e.target.value) || 0 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Visualización */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Visualización</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Símbolo</label>
                    <input
                      type="text"
                      value={currentMoneda.simbolo}
                      onChange={(e) => setEditingMoneda({ ...currentMoneda, simbolo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Posición del símbolo</label>
                    <select
                      value={currentMoneda.posicion_simbolo}
                      onChange={(e) => setEditingMoneda({ 
                        ...currentMoneda, 
                        posicion_simbolo: e.target.value as "antes" | "despues" 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="antes">Antes de la cantidad</option>
                      <option value="despues">Después del importe</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección Varios */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Varios</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Moneda AFIP</label>
                    <select
                      value={currentMoneda.moneda_afip}
                      onChange={(e) => setEditingMoneda({ ...currentMoneda, moneda_afip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {monedasAFIP.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-6 pt-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="es_base"
                        checked={currentMoneda.es_base}
                        onChange={(e) => setEditingMoneda({ ...currentMoneda, es_base: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="es_base" className="text-sm text-gray-700">Base</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={currentMoneda.activo}
                        onChange={(e) => setEditingMoneda({ ...currentMoneda, activo: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="activo" className={`text-sm ${currentMoneda.activo ? 'text-green-600' : 'text-red-600'}`}>
                        Activo
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista de lista de tipos de cotización
  const renderListaTiposCotizacion = () => {
    const filteredTipos = tiposCotizacion.filter(t =>
      t.nombre.toLowerCase().includes(tipoCotizacionSearchText.toLowerCase()) ||
      t.descripcion.toLowerCase().includes(tipoCotizacionSearchText.toLowerCase())
    )

    return (
      <div>
        {/* Barra superior */}
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-2 px-4 -mx-6 -mt-6">
          <button 
            onClick={crearNuevoTipoCotizacion}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Crear
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={tipoCotizacionSearchText}
                onChange={(e) => setTipoCotizacionSearchText(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-64 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Filtros
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Agrupar
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
              Favoritos
            </button>
            <span className="text-sm text-gray-500 ml-4">
              1-{filteredTipos.length} de {filteredTipos.length}
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nombre</th>
                <th className="text-left py-3 px-4 font-medium">Descripción</th>
                <th className="text-center py-3 px-4 font-medium">Activo</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTipos.map((tipo, idx) => (
                <tr 
                  key={tipo.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                  onClick={() => {
                    setSelectedTipoCotizacion(tipo)
                    setEditingTipoCotizacion({ ...tipo })
                    setCreatingTipoCotizacion(false)
                  }}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{tipo.nombre}</td>
                  <td className="py-3 px-4 text-gray-600">{tipo.descripcion}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      tipo.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tipo.activo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        eliminarTipoCotizacion(tipo.id)
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTipos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No se encontraron tipos de cotización
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Vista de detalle/edición de tipo de cotización
  const renderDetalleTipoCotizacion = () => {
    if (!selectedTipoCotizacion || !editingTipoCotizacion) return null

    const currentTipo = editingTipoCotizacion

    // Navegación entre tipos
    const currentIndex = tiposCotizacion.findIndex(t => t.id === selectedTipoCotizacion.id)
    const prevTipo = currentIndex > 0 ? tiposCotizacion[currentIndex - 1] : null
    const nextTipo = currentIndex < tiposCotizacion.length - 1 ? tiposCotizacion[currentIndex + 1] : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <button 
            onClick={() => {
              setSelectedTipoCotizacion(null)
              setEditingTipoCotizacion(null)
              setCreatingTipoCotizacion(false)
            }} 
            className="hover:text-blue-600"
          >
            Tipos de Cotizaciones
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{creatingTipoCotizacion ? 'Nuevo' : currentTipo.nombre}</span>
        </div>

        {/* Header con botones */}
        <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={guardarTipoCotizacion}
              disabled={!currentTipo.nombre.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
            <button 
              onClick={descartarTipoCotizacion}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
            >
              <X className="w-4 h-4" />
              Descartar
            </button>
          </div>

          {!creatingTipoCotizacion && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (prevTipo) {
                    setSelectedTipoCotizacion(prevTipo)
                    setEditingTipoCotizacion({ ...prevTipo })
                  }
                }}
                disabled={!prevTipo}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (nextTipo) {
                    setSelectedTipoCotizacion(nextTipo)
                    setEditingTipoCotizacion({ ...nextTipo })
                  }
                }}
                disabled={!nextTipo}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={currentTipo.nombre}
                onChange={(e) => setEditingTipoCotizacion({ ...currentTipo, nombre: e.target.value })}
                placeholder="Ej: Oficial, Blue, Divisa..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={currentTipo.descripcion}
                onChange={(e) => setEditingTipoCotizacion({ ...currentTipo, descripcion: e.target.value })}
                placeholder="Descripción del tipo de cotización..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="tipo_activo"
                checked={currentTipo.activo}
                onChange={(e) => setEditingTipoCotizacion({ ...currentTipo, activo: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="tipo_activo" className={`text-sm font-medium ${currentTipo.activo ? 'text-green-600' : 'text-red-600'}`}>
                Activo
              </label>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render principal
  const renderContent = () => {
    if (activeView === "tipos-cotizacion") {
      if (selectedTipoCotizacion) {
        return renderDetalleTipoCotizacion()
      }
      return renderListaTiposCotizacion()
    }
    
    // Monedas (default)
    if (selectedMoneda) {
      return renderDetalleMoneda()
    }
    return renderListaMonedas()
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {renderSidebar()}
      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </div>
  )
}
