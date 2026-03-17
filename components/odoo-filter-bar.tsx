"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Filter, Layers, Star, ChevronDown, X, Check, Users, User } from "lucide-react"

// Tipos para el sistema de filtros
export interface FilterOption {
  id: string
  label: string
  field: string
  value: string
}

export interface GroupByOption {
  id: string
  label: string
  field: string
}

export interface SavedFilter {
  id: string
  name: string
  filters: FilterOption[]
  groupBy: GroupByOption[]
  isDefault: boolean
  isShared: boolean
  createdBy: string
}

interface OdooFilterBarProps {
  // Configuración
  moduleName: string // Para identificar los favoritos guardados
  
  // Opciones disponibles
  filterOptions: { field: string; label: string; values: { value: string; label: string }[] }[]
  groupByOptions: GroupByOption[]
  
  // Estado actual
  activeFilters: FilterOption[]
  activeGroupBy: GroupByOption[]
  searchTerm: string
  
  // Callbacks
  onFiltersChange: (filters: FilterOption[]) => void
  onGroupByChange: (groupBy: GroupByOption[]) => void
  onSearchChange: (term: string) => void
  
  // Favoritos guardados
  savedFilters: SavedFilter[]
  onSaveFilter: (filter: Omit<SavedFilter, "id" | "createdBy">) => void
  onDeleteFilter: (id: string) => void
  onApplyFilter: (filter: SavedFilter) => void
  
  // Info de resultados
  totalCount: number
  filteredCount: number
}

export default function OdooFilterBar({
  moduleName,
  filterOptions,
  groupByOptions,
  activeFilters,
  activeGroupBy,
  searchTerm,
  onFiltersChange,
  onGroupByChange,
  onSearchChange,
  savedFilters,
  onSaveFilter,
  onDeleteFilter,
  onApplyFilter,
  totalCount,
  filteredCount
}: OdooFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showGroupBy, setShowGroupBy] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [newFilterName, setNewFilterName] = useState("")
  const [newFilterDefault, setNewFilterDefault] = useState(false)
  const [newFilterShared, setNewFilterShared] = useState(false)
  
  const filtersRef = useRef<HTMLDivElement>(null)
  const groupByRef = useRef<HTMLDivElement>(null)
  const favoritesRef = useRef<HTMLDivElement>(null)
  
  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setShowGroupBy(false)
      }
      if (favoritesRef.current && !favoritesRef.current.contains(e.target as Node)) {
        setShowFavorites(false)
        setShowSaveForm(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Agregar filtro
  const addFilter = (field: string, value: string, label: string, fieldLabel: string) => {
    const newFilter: FilterOption = {
      id: `${field}-${value}-${Date.now()}`,
      label: `${fieldLabel}: ${label}`,
      field,
      value
    }
    onFiltersChange([...activeFilters, newFilter])
  }
  
  // Quitar filtro
  const removeFilter = (id: string) => {
    onFiltersChange(activeFilters.filter(f => f.id !== id))
  }
  
  // Agregar agrupación
  const addGroupBy = (option: GroupByOption) => {
    // Verificar si ya está agregada
    if (activeGroupBy.some(g => g.field === option.field)) return
    onGroupByChange([...activeGroupBy, option])
  }
  
  // Quitar agrupación
  const removeGroupBy = (field: string) => {
    onGroupByChange(activeGroupBy.filter(g => g.field !== field))
  }
  
  // Limpiar todo
  const clearAll = () => {
    onFiltersChange([])
    onGroupByChange([])
    onSearchChange("")
  }
  
  // Guardar favorito
  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return
    onSaveFilter({
      name: newFilterName,
      filters: activeFilters,
      groupBy: activeGroupBy,
      isDefault: newFilterDefault,
      isShared: newFilterShared
    })
    setNewFilterName("")
    setNewFilterDefault(false)
    setNewFilterShared(false)
    setShowSaveForm(false)
  }
  
  const hasActiveFilters = activeFilters.length > 0 || activeGroupBy.length > 0 || searchTerm
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Barra principal */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Campo de búsqueda con tags */}
          <div className="flex-1 flex items-center gap-2 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent bg-white">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            
            {/* Tags de agrupaciones activas */}
            {activeGroupBy.map((group, index) => (
              <span 
                key={group.field}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex-shrink-0"
              >
                {group.label}
                <button 
                  onClick={() => removeGroupBy(group.field)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {/* Tags de filtros activos */}
            {activeFilters.map(filter => (
              <span 
                key={filter.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium flex-shrink-0"
              >
                {filter.label}
                <button 
                  onClick={() => removeFilter(filter.id)}
                  className="hover:bg-amber-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {/* Input de búsqueda */}
            <input
              type="text"
              placeholder={hasActiveFilters ? "Agregar más filtros..." : "Buscar..."}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
            />
            
            {/* Limpiar todo */}
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="Limpiar todo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Dropdown Filtros */}
          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => { setShowFilters(!showFilters); setShowGroupBy(false); setShowFavorites(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                activeFilters.length > 0 
                  ? 'border-amber-500 bg-amber-50 text-amber-700' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFilters.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilters && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 border-b bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Filtrar por</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {filterOptions.map(option => (
                    <div key={option.field} className="border-b last:border-b-0">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        {option.label}
                      </div>
                      {option.values.map(val => {
                        const isActive = activeFilters.some(f => f.field === option.field && f.value === val.value)
                        return (
                          <button
                            key={val.value}
                            onClick={() => {
                              if (isActive) {
                                const filterId = activeFilters.find(f => f.field === option.field && f.value === val.value)?.id
                                if (filterId) removeFilter(filterId)
                              } else {
                                addFilter(option.field, val.value, val.label, option.label)
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                              isActive ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                            }`}
                          >
                            <span>{val.label}</span>
                            {isActive && <Check className="w-4 h-4" />}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Dropdown Agrupar */}
          <div className="relative" ref={groupByRef}>
            <button
              onClick={() => { setShowGroupBy(!showGroupBy); setShowFilters(false); setShowFavorites(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                activeGroupBy.length > 0 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Agrupar
              {activeGroupBy.length > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeGroupBy.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showGroupBy && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 border-b bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Agrupar por</span>
                </div>
                <div className="py-1">
                  {groupByOptions.map(option => {
                    const isActive = activeGroupBy.some(g => g.field === option.field)
                    const order = activeGroupBy.findIndex(g => g.field === option.field) + 1
                    return (
                      <button
                        key={option.field}
                        onClick={() => {
                          if (isActive) {
                            removeGroupBy(option.field)
                          } else {
                            addGroupBy(option)
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isActive && (
                          <span className="flex items-center gap-2">
                            <span className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              {order}
                            </span>
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {activeGroupBy.length > 0 && (
                  <div className="p-2 border-t bg-gray-50">
                    <div className="text-xs text-gray-500">
                      Orden: {activeGroupBy.map(g => g.label).join(" → ")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Dropdown Favoritos */}
          <div className="relative" ref={favoritesRef}>
            <button
              onClick={() => { setShowFavorites(!showFavorites); setShowFilters(false); setShowGroupBy(false) }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Star className="w-4 h-4" />
              Favoritos
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFavorites && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Lista de favoritos guardados */}
                {savedFilters.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border-b">
                    {savedFilters.map(filter => (
                      <div 
                        key={filter.id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 group"
                      >
                        <button
                          onClick={() => {
                            onApplyFilter(filter)
                            setShowFavorites(false)
                          }}
                          className="flex-1 text-left text-sm text-gray-700 flex items-center gap-2"
                        >
                          <span>{filter.name}</span>
                          {filter.isShared && <Users className="w-3 h-3 text-gray-400" title="Compartido" />}
                          {filter.isDefault && <span className="text-xs text-amber-600">(por defecto)</span>}
                        </button>
                        <button
                          onClick={() => onDeleteFilter(filter.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Formulario para guardar */}
                <div className="p-3">
                  <button
                    onClick={() => setShowSaveForm(!showSaveForm)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full"
                  >
                    <ChevronDown className={`w-4 h-4 transform transition-transform ${showSaveForm ? 'rotate-0' : '-rotate-90'}`} />
                    Guardar filtro actual
                  </button>
                  
                  {showSaveForm && (
                    <div className="mt-3 space-y-3">
                      <input
                        type="text"
                        placeholder="Nombre del filtro"
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFilterDefault}
                          onChange={(e) => setNewFilterDefault(e.target.checked)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        Usar por defecto
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFilterShared}
                          onChange={(e) => setNewFilterShared(e.target.checked)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <Users className="w-4 h-4" />
                        Compartir con todos los usuarios
                      </label>
                      <button
                        onClick={handleSaveFilter}
                        disabled={!newFilterName.trim() || (activeFilters.length === 0 && activeGroupBy.length === 0)}
                        className="w-full bg-amber-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Contador de resultados */}
          <div className="text-sm text-gray-500 flex-shrink-0">
            {filteredCount} de {totalCount}
          </div>
        </div>
      </div>
    </div>
  )
}
