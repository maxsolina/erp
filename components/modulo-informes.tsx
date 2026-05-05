"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useERP } from "@/contexts/erp-context"
import { 
  BarChart3, 
  FileText, 
  X, 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  Download,
  Filter,
  Table,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Activity,
  Eye,
  EyeOff,
  Settings
} from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

// Tipos para el cubo
interface Dimension {
  id: string
  nombre: string
  campo: string
}

interface Medida {
  id: string
  nombre: string
  campo: string
  agregacion: "suma" | "promedio" | "conteo" | "min" | "max"
}

interface DatoVenta {
  id: number
  fecha: string
  mes: string
  anio: number
  sucursal: string
  vendedor: string
  cliente: string
  categoria_cliente: string
  producto: string
  categoria_producto: string
  subcategoria_producto: string
  marca: string
  cantidad: number
  precio_unitario: number
  total: number
  descuento: number
  impuestos: number
  costo: number
  margen: number
}

// Dimensiones disponibles
const dimensionesDisponibles: Dimension[] = [
  { id: "sucursal", nombre: "Sucursal", campo: "sucursal" },
  { id: "vendedor", nombre: "Vendedor", campo: "vendedor" },
  { id: "cliente", nombre: "Cliente", campo: "cliente" },
  { id: "categoria_cliente", nombre: "Categoría Cliente", campo: "categoria_cliente" },
  { id: "categoria_producto", nombre: "Categoría Producto", campo: "categoria_producto" },
  { id: "subcategoria_producto", nombre: "Subcategoría Producto", campo: "subcategoria_producto" },
  { id: "producto", nombre: "Producto", campo: "producto" },
  { id: "marca", nombre: "Marca", campo: "marca" },
  { id: "mes", nombre: "Fecha (mes)", campo: "mes" },
  { id: "anio", nombre: "Fecha (año)", campo: "anio" },
]

// Medidas disponibles
const medidasDisponibles: Medida[] = [
  { id: "cantidad", nombre: "Cantidad", campo: "cantidad", agregacion: "suma" },
  { id: "total", nombre: "Total", campo: "total", agregacion: "suma" },
  { id: "descuento", nombre: "Descuento", campo: "descuento", agregacion: "suma" },
  { id: "impuestos", nombre: "Impuestos", campo: "impuestos", agregacion: "suma" },
  { id: "costo", nombre: "Costo", campo: "costo", agregacion: "suma" },
  { id: "margen", nombre: "Margen", campo: "margen", agregacion: "suma" },
  { id: "precio_promedio", nombre: "Precio Promedio", campo: "precio_unitario", agregacion: "promedio" },
  { id: "conteo", nombre: "Cantidad de Ventas", campo: "id", agregacion: "conteo" },
]

// Los datos reales se cargan desde la API /api/informes/estadisticas-ventas

export default function ModuloInformes() {
  const { sucursales } = useERP()
  const sucursalesDisponibles = sucursales.filter(s => s.activa).map(s => s.nombre)

  // Datos reales desde la API
  const [datosVenta, setDatosVenta] = useState<DatoVenta[]>([])
  const [cargando, setCargando] = useState(false)

  // Estados del modal de filtros
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterSucursales, setFilterSucursales] = useState<string[]>([])
  const [filterFechaDesde, setFilterFechaDesde] = useState("2026-01-01")
  const [filterFechaHasta, setFilterFechaHasta] = useState("2026-12-31")
  
  // Estados del cubo
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<string[]>(["categoria_producto"])
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState<string[]>(["mes"])
  const [medidasSeleccionadas, setMedidasSeleccionadas] = useState<string[]>(["cantidad", "total"])
  const [mostrarCampos, setMostrarCampos] = useState(true)
  
  // Estados de expansión de filas
  const [filasExpandidas, setFilasExpandidas] = useState<Set<string>>(new Set())
  
  // Estados de drag & drop
  const [draggedItem, setDraggedItem] = useState<{ id: string, from: 'campos' | 'filas' | 'columnas' } | null>(null)
  const [dragOverZone, setDragOverZone] = useState<'filas' | 'columnas' | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Estados para dashboard de KPIs y gráficos
  const [mostrarDashboard, setMostrarDashboard] = useState(false)
  const [kpisVisibles, setKpisVisibles] = useState<string[]>(["ventas_totales", "cantidad_vendida", "ticket_promedio", "margen_promedio"])
  const [graficosVisibles, setGraficosVisibles] = useState<string[]>(["ventas_por_mes", "ventas_por_categoria"])
  const [mostrarConfigGraficos, setMostrarConfigGraficos] = useState(false)

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    }).format(value)
  }

  // Formatear número
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(value)
  }

  // Cargar datos desde la API
  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({
        fecha_desde: filterFechaDesde,
        fecha_hasta: filterFechaHasta,
      })
      const res = await fetch(`/api/informes/estadisticas-ventas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDatosVenta(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error("Error cargando estadísticas de ventas:", err)
    } finally {
      setCargando(false)
    }
  }, [filterFechaDesde, filterFechaHasta])

  useEffect(() => {
    cargarDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtrar datos: la fecha ya viene filtrada del servidor; solo aplicar filtro de sucursal en cliente
  const datosFiltrados = useMemo(() => {
    if (filterSucursales.length === 0) return datosVenta
    return datosVenta.filter(d => filterSucursales.includes(d.sucursal))
  }, [datosVenta, filterSucursales])

  // Calcular agregación
  const calcularAgregacion = (datos: DatoVenta[], medida: Medida): number => {
    if (datos.length === 0) return 0
    const valores = datos.map(d => d[medida.campo as keyof DatoVenta] as number)
    
    switch (medida.agregacion) {
      case "suma":
        return valores.reduce((a, b) => a + b, 0)
      case "promedio":
        return valores.reduce((a, b) => a + b, 0) / valores.length
      case "conteo":
        return datos.length
      case "min":
        return Math.min(...valores)
      case "max":
        return Math.max(...valores)
      default:
        return 0
    }
  }

  // Obtener valores únicos de una dimensión
  const getValoresUnicos = (campo: string): string[] => {
    const valores = new Set(datosFiltrados.map(d => String(d[campo as keyof DatoVenta])))
    return Array.from(valores).sort()
  }

  // Agrupar datos por dimensiones de fila
  const datosAgrupados = useMemo(() => {
    if (filasSeleccionadas.length === 0) {
      return [{ key: "Total", datos: datosFiltrados, nivel: 0 }]
    }

    const primeraDimension = filasSeleccionadas[0]
    const valoresUnicos = getValoresUnicos(primeraDimension)
    
    return valoresUnicos.map(valor => ({
      key: valor,
      datos: datosFiltrados.filter(d => String(d[primeraDimension as keyof DatoVenta]) === valor),
      nivel: 0
    }))
  }, [datosFiltrados, filasSeleccionadas])

  // Obtener columnas únicas
  const columnasUnicas = useMemo(() => {
    if (columnasSeleccionadas.length === 0) return ["Total"]
    const primeraDimension = columnasSeleccionadas[0]
    return getValoresUnicos(primeraDimension)
  }, [datosFiltrados, columnasSeleccionadas])

  // Toggle expansión de fila
  const toggleFilaExpandida = (key: string) => {
    const nuevas = new Set(filasExpandidas)
    if (nuevas.has(key)) {
      nuevas.delete(key)
    } else {
      nuevas.add(key)
    }
    setFilasExpandidas(nuevas)
  }

  // Agregar/quitar dimensión de filas
  const toggleDimensionFila = (dimId: string) => {
    if (filasSeleccionadas.includes(dimId)) {
      setFilasSeleccionadas(filasSeleccionadas.filter(d => d !== dimId))
    } else {
      // Quitar de columnas si está ahí
      setColumnasSeleccionadas(columnasSeleccionadas.filter(d => d !== dimId))
      setFilasSeleccionadas([...filasSeleccionadas, dimId])
    }
  }

  // Agregar/quitar dimensión de columnas
  const toggleDimensionColumna = (dimId: string) => {
    if (columnasSeleccionadas.includes(dimId)) {
      setColumnasSeleccionadas(columnasSeleccionadas.filter(d => d !== dimId))
    } else {
      // Quitar de filas si está ahí
      setFilasSeleccionadas(filasSeleccionadas.filter(d => d !== dimId))
      setColumnasSeleccionadas([...columnasSeleccionadas, dimId])
    }
  }

  // Agregar/quitar medida
  const toggleMedida = (medidaId: string) => {
    if (medidasSeleccionadas.includes(medidaId)) {
      if (medidasSeleccionadas.length > 1) {
        setMedidasSeleccionadas(medidasSeleccionadas.filter(m => m !== medidaId))
      }
    } else {
      setMedidasSeleccionadas([...medidasSeleccionadas, medidaId])
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string, from: 'campos' | 'filas' | 'columnas') => {
    setDraggedItem({ id, from })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, zone: 'filas' | 'columnas', index?: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZone(zone)
    if (index !== undefined) setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverZone(null)
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, zone: 'filas' | 'columnas', dropIndex?: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const { id, from } = draggedItem
    
    if (zone === 'filas') {
      // Quitar de donde estaba
      if (from === 'columnas') {
        setColumnasSeleccionadas(prev => prev.filter(d => d !== id))
      }
      
      // Agregar a filas en la posición correcta
      if (!filasSeleccionadas.includes(id)) {
        const newFilas = [...filasSeleccionadas]
        const insertIndex = dropIndex !== undefined ? dropIndex : newFilas.length
        newFilas.splice(insertIndex, 0, id)
        setFilasSeleccionadas(newFilas)
      } else if (from === 'filas' && dropIndex !== undefined) {
        // Reordenar dentro de filas
        const currentIndex = filasSeleccionadas.indexOf(id)
        const newFilas = [...filasSeleccionadas]
        newFilas.splice(currentIndex, 1)
        const adjustedIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex
        newFilas.splice(adjustedIndex, 0, id)
        setFilasSeleccionadas(newFilas)
      }
    } else if (zone === 'columnas') {
      // Quitar de donde estaba
      if (from === 'filas') {
        setFilasSeleccionadas(prev => prev.filter(d => d !== id))
      }
      
      // Agregar a columnas
      if (!columnasSeleccionadas.includes(id)) {
        const newColumnas = [...columnasSeleccionadas]
        const insertIndex = dropIndex !== undefined ? dropIndex : newColumnas.length
        newColumnas.splice(insertIndex, 0, id)
        setColumnasSeleccionadas(newColumnas)
      } else if (from === 'columnas' && dropIndex !== undefined) {
        // Reordenar dentro de columnas
        const currentIndex = columnasSeleccionadas.indexOf(id)
        const newColumnas = [...columnasSeleccionadas]
        newColumnas.splice(currentIndex, 1)
        const adjustedIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex
        newColumnas.splice(adjustedIndex, 0, id)
        setColumnasSeleccionadas(newColumnas)
      }
    }

    setDraggedItem(null)
    setDragOverZone(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverZone(null)
    setDragOverIndex(null)
  }

  // Quitar dimensión de zona
  const quitarDeFila = (id: string) => {
    setFilasSeleccionadas(prev => prev.filter(d => d !== id))
  }

  const quitarDeColumna = (id: string) => {
    setColumnasSeleccionadas(prev => prev.filter(d => d !== id))
  }

  return (
    <div>
      {/* Main Content — el sidebar del módulo lo provee app/(dashboard)/informes/layout.tsx */}
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Notas de Venta /</span>
            <span className="text-gray-400">Nuevo /</span>
            <span className="font-semibold text-gray-900">Estadística de Ventas</span>
            {cargando && (
              <span className="text-xs text-gray-400 animate-pulse ml-2">Cargando datos...</span>
            )}
            {!cargando && datosVenta.length > 0 && (
              <span className="text-xs text-gray-400 ml-2">{datosVenta.length} líneas</span>
            )}
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filtros ({filterFechaDesde} → {filterFechaHasta})
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-gray-200 rounded-t-lg p-2 flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setMostrarCampos(!mostrarCampos)}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${mostrarCampos ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            {mostrarCampos ? 'Ocultar Campos' : 'Mostrar Campos'}
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded flex items-center gap-1">
            <Table className="w-4 h-4" /> Filas
          </button>
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded flex items-center gap-1">
            Columnas
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded flex items-center gap-1">
            <BarChart3 className="w-4 h-4" /> Cubo
          </button>
<div className="flex-1" />
          <button 
            onClick={() => setMostrarDashboard(!mostrarDashboard)}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 mr-2 ${
              mostrarDashboard 
                ? 'bg-violet-600 text-white hover:bg-violet-700' 
                : 'border border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" /> Dashboard
          </button>
          <button className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded flex items-center gap-1 hover:bg-emerald-700">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>

        {/* Campos disponibles */}
        {mostrarCampos && (
          <div className="bg-sky-50 border-x border-gray-200 p-4">
            {/* Dimensiones */}
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-600 mr-3">Campos</span>
              <div className="inline-flex flex-wrap gap-1">
                {dimensionesDisponibles.map(dim => {
                  const enFilas = filasSeleccionadas.includes(dim.id)
                  const enColumnas = columnasSeleccionadas.includes(dim.id)
                  const enUso = enFilas || enColumnas
                  return (
                    <div 
                      key={dim.id} 
                      draggable={!enUso}
                      onDragStart={(e) => handleDragStart(e, dim.id, 'campos')}
                      onDragEnd={handleDragEnd}
                      className={`px-2 py-1 text-xs rounded border cursor-grab active:cursor-grabbing select-none ${
                        enUso 
                          ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-default opacity-50' 
                          : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      }`}
                      title={enUso ? 'Ya está en uso' : 'Arrastrar a Filas o Columnas'}
                    >
                      {dim.nombre}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Medidas */}
            <div>
              <span className="text-xs font-medium text-gray-600 mr-3">Medidas</span>
              <div className="inline-flex flex-wrap gap-1">
                {medidasDisponibles.map(medida => {
                  const seleccionada = medidasSeleccionadas.includes(medida.id)
                  return (
                    <button
                      key={medida.id}
                      onClick={() => toggleMedida(medida.id)}
                      className={`px-2 py-1 text-xs rounded ${
                        seleccionada 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {medida.nombre} ({medida.agregacion === "suma" ? "Suma" : medida.agregacion === "promedio" ? "Prom" : "Cnt"})
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Zona de Filas (drop zone vertical a la izquierda de la tabla) */}
        <div className="flex">
          {/* Columna de dimensiones de filas */}
          <div 
            className={`w-48 bg-white border-l border-t border-gray-200 p-2 min-h-[100px] transition-colors ${
              dragOverZone === 'filas' ? 'bg-blue-50 border-blue-300' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, 'filas')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'filas')}
          >
            <div className="text-[10px] text-gray-400 uppercase font-medium mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Filas
            </div>
            <div className="space-y-1">
              {filasSeleccionadas.map((dimId, index) => {
                const dim = dimensionesDisponibles.find(d => d.id === dimId)
                return (
                  <div
                    key={dimId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, dimId, 'filas')}
                    onDragOver={(e) => handleDragOver(e, 'filas', index)}
                    onDrop={(e) => handleDrop(e, 'filas', index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between px-2 py-1 bg-blue-600 text-white text-xs rounded cursor-grab active:cursor-grabbing select-none ${
                      dragOverIndex === index && dragOverZone === 'filas' ? 'ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <GripVertical className="w-3 h-3 opacity-60" />
                      {dim?.nombre}
                    </span>
                    <button onClick={() => quitarDeFila(dimId)} className="hover:bg-blue-700 rounded p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
              {filasSeleccionadas.length === 0 && (
                <div className="text-xs text-gray-400 italic py-2 text-center border-2 border-dashed border-gray-200 rounded">
                  Arrastrar campos aquí
                </div>
              )}
            </div>
          </div>
          
          {/* Tabla principal con columnas arriba */}
          <div className="flex-1">
            {/* Zona de Columnas (drop zone horizontal arriba de la tabla) */}
            <div 
              className={`bg-white border-t border-r border-gray-200 p-2 min-h-[40px] transition-colors ${
                dragOverZone === 'columnas' ? 'bg-amber-50 border-amber-300' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, 'columnas')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'columnas')}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400 uppercase font-medium">Columnas:</span>
                {columnasSeleccionadas.map((dimId, index) => {
                  const dim = dimensionesDisponibles.find(d => d.id === dimId)
                  return (
                    <div
                      key={dimId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, dimId, 'columnas')}
                      onDragOver={(e) => handleDragOver(e, 'columnas', index)}
                      onDrop={(e) => handleDrop(e, 'columnas', index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded cursor-grab active:cursor-grabbing select-none ${
                        dragOverIndex === index && dragOverZone === 'columnas' ? 'ring-2 ring-amber-300' : ''
                      }`}
                    >
                      <GripVertical className="w-3 h-3 opacity-60" />
                      {dim?.nombre}
                      <button onClick={() => quitarDeColumna(dimId)} className="hover:bg-amber-600 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
                {columnasSeleccionadas.length === 0 && (
                  <span className="text-xs text-gray-400 italic border-2 border-dashed border-gray-200 rounded px-3 py-1">
                    Arrastrar campos aquí
                  </span>
                )}
              </div>
            </div>

            {/* Tabla Cubo */}
            <div className="bg-white border-r border-b border-gray-200 rounded-br-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3 font-medium text-gray-700 min-w-[200px]">
                  {filasSeleccionadas.length > 0 
                    ? dimensionesDisponibles.find(d => d.id === filasSeleccionadas[0])?.nombre 
                    : "Total"}
                </th>
                {columnasUnicas.map(col => (
                  <th key={col} colSpan={medidasSeleccionadas.length} className="text-center py-2 px-2 font-medium text-gray-700 border-l">
                    {col}
                  </th>
                ))}
                <th colSpan={medidasSeleccionadas.length} className="text-center py-2 px-2 font-medium text-gray-900 bg-gray-100 border-l">
                  Total
                </th>
              </tr>
              <tr className="bg-gray-50 border-b text-xs">
                <th></th>
                {columnasUnicas.map(col => (
                  medidasSeleccionadas.map(medidaId => {
                    const medida = medidasDisponibles.find(m => m.id === medidaId)
                    return (
                      <th key={`${col}-${medidaId}`} className="text-right py-1 px-2 font-medium text-gray-600 border-l first:border-l-0">
                        {medida?.nombre}
                      </th>
                    )
                  })
                ))}
                {medidasSeleccionadas.map(medidaId => {
                  const medida = medidasDisponibles.find(m => m.id === medidaId)
                  return (
                    <th key={`total-${medidaId}`} className="text-right py-1 px-2 font-medium text-gray-700 bg-gray-100 border-l first:border-l-0">
                      {medida?.nombre}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {datosAgrupados.map(grupo => (
                <tr key={grupo.key} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">
                    <button 
                      onClick={() => toggleFilaExpandida(grupo.key)}
                      className="flex items-center gap-1"
                    >
                      {filasSeleccionadas.length > 1 && (
                        filasExpandidas.has(grupo.key) 
                          ? <ChevronDown className="w-4 h-4 text-gray-400" />
                          : <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      {grupo.key}
                    </button>
                  </td>
                  {columnasUnicas.map(col => {
                    const datosColumna = columnasSeleccionadas.length > 0
                      ? grupo.datos.filter(d => String(d[columnasSeleccionadas[0] as keyof DatoVenta]) === col)
                      : grupo.datos
                    
                    return medidasSeleccionadas.map(medidaId => {
                      const medida = medidasDisponibles.find(m => m.id === medidaId)!
                      const valor = calcularAgregacion(datosColumna, medida)
                      return (
                        <td key={`${col}-${medidaId}`} className="text-right py-2 px-2 text-gray-700 border-l">
                          {medida.campo === "total" || medida.campo === "costo" || medida.campo === "margen" || medida.campo === "descuento" || medida.campo === "impuestos"
                            ? formatCurrency(valor)
                            : formatNumber(valor)}
                        </td>
                      )
                    })
                  })}
                  {/* Totales de fila */}
                  {medidasSeleccionadas.map(medidaId => {
                    const medida = medidasDisponibles.find(m => m.id === medidaId)!
                    const valor = calcularAgregacion(grupo.datos, medida)
                    return (
                      <td key={`total-${medidaId}`} className="text-right py-2 px-2 font-medium text-gray-900 bg-gray-50 border-l">
                        {medida.campo === "total" || medida.campo === "costo" || medida.campo === "margen" || medida.campo === "descuento" || medida.campo === "impuestos"
                          ? formatCurrency(valor)
                          : formatNumber(valor)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Fila de totales */}
              <tr className="bg-gray-100 font-bold">
                <td className="py-2 px-3 text-gray-900">Total</td>
                {columnasUnicas.map(col => {
                  const datosColumna = columnasSeleccionadas.length > 0
                    ? datosFiltrados.filter(d => String(d[columnasSeleccionadas[0] as keyof DatoVenta]) === col)
                    : datosFiltrados
                  
                  return medidasSeleccionadas.map(medidaId => {
                    const medida = medidasDisponibles.find(m => m.id === medidaId)!
                    const valor = calcularAgregacion(datosColumna, medida)
                    return (
                      <td key={`total-${col}-${medidaId}`} className="text-right py-2 px-2 text-gray-900 border-l">
                        {medida.campo === "total" || medida.campo === "costo" || medida.campo === "margen" || medida.campo === "descuento" || medida.campo === "impuestos"
                          ? formatCurrency(valor)
                          : formatNumber(valor)}
                      </td>
                    )
                  })
                })}
                {/* Gran total */}
                {medidasSeleccionadas.map(medidaId => {
                  const medida = medidasDisponibles.find(m => m.id === medidaId)!
                  const valor = calcularAgregacion(datosFiltrados, medida)
                  return (
                    <td key={`gran-total-${medidaId}`} className="text-right py-2 px-2 text-gray-900 bg-gray-200 border-l">
                      {medida.campo === "total" || medida.campo === "costo" || medida.campo === "margen" || medida.campo === "descuento" || medida.campo === "impuestos"
                        ? formatCurrency(valor)
                        : formatNumber(valor)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
            </div>
          </div>
        </div>

        {/* Dashboard de KPIs y Gráficos */}
        {mostrarDashboard && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mt-6">
            {/* Header del dashboard */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-600" />
                Dashboard de Ventas
              </h3>
              <button
                onClick={() => setMostrarConfigGraficos(!mostrarConfigGraficos)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center gap-2 shadow-sm"
              >
                <Settings className="w-4 h-4" /> Configurar
              </button>
            </div>

          {/* Panel de configuración */}
            {mostrarConfigGraficos && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">KPIs visibles</h4>
                    <div className="space-y-1">
                      {[
                        { id: "ventas_totales", nombre: "Ventas Totales" },
                        { id: "cantidad_vendida", nombre: "Cantidad Vendida" },
                        { id: "ticket_promedio", nombre: "Ticket Promedio" },
                        { id: "margen_promedio", nombre: "Margen Promedio" },
                        { id: "total_clientes", nombre: "Total Clientes" },
                        { id: "total_productos", nombre: "Total Productos" },
                      ].map(kpi => (
                        <label key={kpi.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={kpisVisibles.includes(kpi.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setKpisVisibles([...kpisVisibles, kpi.id])
                              } else {
                                setKpisVisibles(kpisVisibles.filter(k => k !== kpi.id))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          {kpi.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Gráficos visibles</h4>
                    <div className="space-y-1">
                      {[
                        { id: "ventas_por_mes", nombre: "Ventas por Mes (Línea)" },
                        { id: "ventas_por_categoria", nombre: "Ventas por Categoría (Barras)" },
                        { id: "ventas_por_vendedor", nombre: "Ventas por Vendedor (Barras)" },
                        { id: "margen_por_mes", nombre: "Margen % por Mes (Línea)" },
                        { id: "distribucion_categorias", nombre: "Distribución por Categoría (Torta)" },
                        { id: "ventas_por_vendedor_pie", nombre: "Ventas por Vendedor (Torta)" },
                        { id: "ventas_por_marca", nombre: "Ventas por Marca (Torta)" },
                      ].map(grafico => (
                        <label key={grafico.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={graficosVisibles.includes(grafico.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGraficosVisibles([...graficosVisibles, grafico.id])
                              } else {
                                setGraficosVisibles(graficosVisibles.filter(g => g !== grafico.id))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          {grafico.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {kpisVisibles.includes("ventas_totales") && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-emerald-700 uppercase font-semibold">Ventas</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(datosFiltrados.reduce((sum, d) => sum + d.total, 0))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12.5%</span>
                  </div>
                </div>
              )}
              {kpisVisibles.includes("cantidad_vendida") && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-blue-700 uppercase font-semibold">Cantidad</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatNumber(datosFiltrados.reduce((sum, d) => sum + d.cantidad, 0))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+8.3%</span>
                  </div>
                </div>
              )}
              {kpisVisibles.includes("ticket_promedio") && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-xs text-amber-700 uppercase font-semibold">Ticket Prom.</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(datosFiltrados.length > 0 ? datosFiltrados.reduce((sum, d) => sum + d.total, 0) / datosFiltrados.length : 0)}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+3.8%</span>
                  </div>
                </div>
              )}
              {kpisVisibles.includes("margen_promedio") && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-xs text-violet-700 uppercase font-semibold">Margen %</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {(() => {
                      const totalVentas = datosFiltrados.reduce((sum, d) => sum + d.total, 0)
                      const totalMargen = datosFiltrados.reduce((sum, d) => sum + d.margen, 0)
                      return totalVentas > 0 ? ((totalMargen / totalVentas) * 100).toFixed(1) : "0"
                    })()}%
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-violet-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+2.1%</span>
                  </div>
                </div>
              )}
              {kpisVisibles.includes("total_clientes") && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-cyan-100 rounded-lg">
                      <Users className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="text-xs text-cyan-700 uppercase font-semibold">Clientes</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {new Set(datosFiltrados.map(d => d.cliente)).size}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-cyan-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+5 nuevos</span>
                  </div>
                </div>
              )}
              {kpisVisibles.includes("total_productos") && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-rose-100 rounded-lg">
                      <Package className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-xs text-rose-700 uppercase font-semibold">Productos</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {new Set(datosFiltrados.map(d => d.producto)).size}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-rose-500">
                    <span>vendidos</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {graficosVisibles.includes("ventas_por_mes") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                    Ventas por Mes
                  </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={(() => {
                    const porMes: Record<string, number> = {}
                    datosFiltrados.forEach(d => {
                      porMes[d.mes] = (porMes[d.mes] || 0) + d.total
                    })
                    return Object.entries(porMes).map(([mes, total]) => ({ mes, total }))
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {graficosVisibles.includes("ventas_por_categoria") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  Ventas por Categoría
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                    const porCat: Record<string, number> = {}
                    datosFiltrados.forEach(d => {
                      porCat[d.categoria_producto] = (porCat[d.categoria_producto] || 0) + d.total
                    })
                    return Object.entries(porCat).map(([cat, total]) => ({ categoria: cat, total })).sort((a, b) => b.total - a.total).slice(0, 6)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="categoria" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {graficosVisibles.includes("ventas_por_vendedor") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  Ventas por Vendedor
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                    const porVend: Record<string, number> = {}
                    datosFiltrados.forEach(d => {
                      porVend[d.vendedor] = (porVend[d.vendedor] || 0) + d.total
                    })
                    return Object.entries(porVend).map(([vendedor, total]) => ({ vendedor, total })).sort((a, b) => b.total - a.total)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {graficosVisibles.includes("margen_por_mes") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                  Margen % por Mes
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={(() => {
                    const porMes: Record<string, { ventas: number, margen: number }> = {}
                    datosFiltrados.forEach(d => {
                      if (!porMes[d.mes]) porMes[d.mes] = { ventas: 0, margen: 0 }
                      porMes[d.mes].ventas += d.total
                      porMes[d.mes].margen += d.margen
                    })
                    return Object.entries(porMes).map(([mes, data]) => ({ 
                      mes, 
                      margen: data.ventas > 0 ? (data.margen / data.ventas) * 100 : 0 
                    }))
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 50]} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Line type="monotone" dataKey="margen" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {graficosVisibles.includes("distribucion_categorias") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                  Distribución por Categoría
                </h4>
                {(() => {
                  const COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444"]
                  const porCat: Record<string, number> = {}
                  datosFiltrados.forEach(d => {
                    porCat[d.categoria_producto] = (porCat[d.categoria_producto] || 0) + d.total
                  })
                  const data = Object.entries(porCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
                  const total = data.reduce((sum, d) => sum + d.value, 0)
                  
                  return (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {data.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{((item.value / total) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {graficosVisibles.includes("ventas_por_vendedor_pie") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  Ventas por Vendedor
                </h4>
                {(() => {
                  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
                  const porVend: Record<string, number> = {}
                  datosFiltrados.forEach(d => {
                    porVend[d.vendedor] = (porVend[d.vendedor] || 0) + d.total
                  })
                  const data = Object.entries(porVend).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
                  const total = data.reduce((sum, d) => sum + d.value, 0)
                  
                  return (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {data.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{((item.value / total) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {graficosVisibles.includes("ventas_por_marca") && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                  Ventas por Marca
                </h4>
                {(() => {
                  const COLORS = ["#e11d48", "#059669", "#d97706", "#3b82f6", "#7c3aed"]
                  const porMarca: Record<string, number> = {}
                  datosFiltrados.forEach(d => {
                    if (d.marca !== "-") {
                      porMarca[d.marca] = (porMarca[d.marca] || 0) + d.total
                    }
                  })
                  const data = Object.entries(porMarca).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
                  const total = data.reduce((sum, d) => sum + d.value, 0)
                  
                  return (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {data.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{((item.value / total) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Modal de Filtros */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Estadística de Ventas - Filtros</h3>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Columna izquierda */}
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visualización</label>
                    <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-purple-100">
                      <option>Cubo</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sucursales (incluidos)</label>
                    <div className="border border-gray-300 rounded p-2 min-h-[100px] bg-white">
                      {filterSucursales.map(suc => (
                        <div key={suc} className="flex items-center justify-between py-1 px-2 bg-gray-100 rounded mb-1">
                          <span className="text-sm">{suc}</span>
                          <button onClick={() => setFilterSucursales(filterSucursales.filter(s => s !== suc))}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                      <select 
                        className="w-full text-sm text-blue-600 mt-1"
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !filterSucursales.includes(e.target.value)) {
                            setFilterSucursales([...filterSucursales, e.target.value])
                          }
                        }}
                      >
                        <option value="">Añadir un elemento</option>
                        {sucursalesDisponibles.filter(s => !filterSucursales.includes(s)).map(suc => (
                          <option key={suc} value={suc}>{suc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde ({'>='})</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={filterFechaDesde}
                        onChange={(e) => setFilterFechaDesde(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Columna derecha */}
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasta ({'<='})</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={filterFechaHasta}
                        onChange={(e) => setFilterFechaHasta(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { cargarDatos(); setShowFilterModal(false) }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                {cargando ? "Cargando..." : "Aceptar"}
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                o Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
