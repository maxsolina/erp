"use client"

// ─── <SearchableSelect> ─────────────────────────────────────────────────────
//
// Combobox con búsqueda integrada. Reemplaza al `<select>` nativo en
// dropdowns con muchas opciones (clientes, productos, equipos, etc.).
//
// REGLAS GENERALES (toda la app):
//   • El usuario puede escribir para filtrar (no solo abrir y scrollear).
//   • Nunca se renderizan más de `maxVisible` ítems a la vez (default 10).
//     El resto se accede tipeando — esto evita saturar el DOM con miles
//     de opciones (clientes, productos masivos).
//   • Teclado: ↑↓ navegan, Enter selecciona, Esc cierra.
//
// Uso:
//   <SearchableSelect
//     value={clienteId}
//     onChange={(v) => setClienteId(v)}
//     options={clientes.map(c => ({ value: c.id, label: c.nombre }))}
//     placeholder="Seleccionar cliente..."
//   />

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search, X } from "lucide-react"

export interface SearchableOption {
  value: string | number
  label: string
  // Campo extra opcional para búsqueda (ej: codigo + nombre)
  searchExtra?: string
  // Subtítulo opcional debajo del label (ej: "código · marca")
  hint?: string
  // Marca opcional (ej: "Inactivo")
  badge?: string
  badgeColor?: "gray" | "red" | "amber" | "emerald" | "blue"
  disabled?: boolean
}

export interface SearchableSelectProps {
  value: string | number | null | undefined
  onChange: (value: string | number | null) => void
  options: SearchableOption[]
  placeholder?: string
  emptyText?: string
  required?: boolean
  disabled?: boolean
  allowClear?: boolean
  className?: string
  /** Máximo de ítems renderizados. Default 10 (regla general). */
  maxVisible?: number
  /** ID para asociar con un <label htmlFor>. */
  id?: string
}

const BADGE_CLASSES = {
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  emptyText = "Sin resultados",
  required,
  disabled,
  allowClear = true,
  className = "",
  maxVisible = 10,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click afuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  // Opción seleccionada actual (label visible cuando NO está abierto)
  const selected = useMemo(
    () => (value != null && value !== "" ? options.find(o => String(o.value) === String(value)) : null),
    [value, options],
  )

  // Filtro normalizado
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => {
      const haystack = `${o.label} ${o.hint ?? ""} ${o.searchExtra ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [options, search])

  // Recortar a maxVisible: el operador ve hasta N items, el resto se accede
  // tipeando para filtrar. Esto evita renderizar 5000 <option> de productos.
  const visible = filtered.slice(0, maxVisible)
  const overflowCount = Math.max(0, filtered.length - visible.length)

  // Reset highlight al filtrar
  useEffect(() => {
    setHighlight(0)
  }, [search])

  function commit(option: SearchableOption) {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
    setSearch("")
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      setHighlight(h => Math.min(h + 1, visible.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight(h => Math.max(0, h - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && visible[highlight]) commit(visible[highlight])
    } else if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setSearch("")
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / search input */}
      <div
        className={`flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500"
        }`}
        onClick={() => {
          if (disabled) return
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          required={required && !value}
          disabled={disabled}
          value={open ? search : (selected?.label ?? "")}
          onChange={e => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
        {allowClear && selected && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Limpiar selección"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-sm text-gray-500 italic">{emptyText}</div>
          )}
          {visible.map((opt, idx) => {
            const isSelected = selected && String(opt.value) === String(selected.value)
            const isHighlighted = idx === highlight
            return (
              <div
                key={String(opt.value)}
                onMouseDown={e => {
                  e.preventDefault()
                  commit(opt)
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ${
                  opt.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : isHighlighted
                      ? "bg-indigo-50"
                      : "hover:bg-gray-50"
                } ${isSelected ? "font-medium" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">{opt.label}</div>
                  {opt.hint && (
                    <div className="text-xs text-gray-500 truncate">{opt.hint}</div>
                  )}
                </div>
                {opt.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${BADGE_CLASSES[opt.badgeColor ?? "gray"]}`}>
                    {opt.badge}
                  </span>
                )}
              </div>
            )
          })}
          {overflowCount > 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 italic border-t border-gray-100 bg-gray-50">
              y {overflowCount} resultado(s) más — escribí para filtrar
            </div>
          )}
        </div>
      )}
    </div>
  )
}
