"use client"

// Form genérico para los ABMs de Servicio Técnico (Áreas, Categorías, Equipos,
// Fallas, Técnicos, Turnos, Feriados, Controles, Tipos de OT, Motivos de
// Cierre, Fallas por Equipo). Se monta vía una declaración de campos
// `FieldDef[]` y maneja inputs comunes:
//   - text / textarea / number / date / time
//   - checkbox
//   - select fijo (con `options`)
//   - select dinámico desde una lista de objetos (con `optionsFrom`)
//   - multi-select (chips) — para categorías secundarias de técnicos
//
// El layout sigue la convención del ERP: header con BotonVolver + título a la
// izquierda, Cancelar + Guardar a la derecha. No mezcla acciones al pie.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SearchableSelect from "@/components/ui/searchable-select"

export type FieldDef =
  | { kind: "text"; key: string; label: string; required?: boolean; placeholder?: string; helper?: string }
  | { kind: "textarea"; key: string; label: string; required?: boolean; rows?: number }
  | { kind: "number"; key: string; label: string; required?: boolean; min?: number; max?: number; step?: number; helper?: string }
  | { kind: "date"; key: string; label: string; required?: boolean }
  | { kind: "time"; key: string; label: string; required?: boolean }
  | { kind: "checkbox"; key: string; label: string; helper?: string }
  | { kind: "section"; key: string; label: string; description?: string }
  | { kind: "select"; key: string; label: string; required?: boolean; options: { value: string; label: string }[] }
  | { kind: "selectFrom"; key: string; label: string; required?: boolean; optionsFrom: { value: unknown; label: string }[]; allowEmpty?: boolean }
  | { kind: "multiSelectFrom"; key: string; label: string; optionsFrom: { value: string; label: string }[] }

export interface TallerEntityFormProps<T extends Record<string, unknown>> {
  title: string                // ej: "Nueva Área" o "Editar Área — Reparación Cel"
  backHref: string             // listado al que vuelve
  fields: FieldDef[]
  initialValues: T
  mode: "create" | "edit"
  onSave: (values: T) => Promise<void>
  onDelete?: () => Promise<void>
  // Slot opcional para sub-secciones complejas que no encajan en el grid
  // estándar (ej: editor de líneas de repuestos en Fallas por Equipo).
  // Recibe el estado actual del form y un setter; lo que se setee se
  // mergea en `values` y se manda en el onSave.
  renderExtra?: (args: { values: T; setField: (key: string, val: unknown) => void }) => React.ReactNode
}

export default function TallerEntityForm<T extends Record<string, unknown>>({
  title,
  backHref,
  fields,
  initialValues,
  mode,
  onSave,
  onDelete,
  renderExtra,
}: TallerEntityFormProps<T>) {
  const router = useRouter()
  const [values, setValues] = useState<T>(initialValues)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  function setField(key: string, val: unknown) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function validate(): string | null {
    for (const f of fields) {
      // Las "section" son solo headers visuales, no tienen valor
      if (f.kind === "section") continue
      if ("required" in f && f.required) {
        const v = values[f.key]
        if (v == null || v === "") return `El campo "${f.label}" es obligatorio.`
      }
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      await onSave(values)
      router.push(backHref)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
      router.push(backHref)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar")
      setDeleting(false)
    }
  }

  return (
    <div>
      {/* Header — convención: back + título a la izq, Cancelar + Guardar a la derecha */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push(backHref)} variant="minimal" texto="" />
          <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          )}
          <Link
            href={backHref}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || deleting}
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {fields.map(f => (
            <FieldRenderer key={f.key} field={f} value={values[f.key]} onChange={v => setField(f.key, v)} />
          ))}
        </div>
      </div>

      {renderExtra && (
        <div className="mt-5">
          {renderExtra({ values, setField })}
        </div>
      )}
    </div>
  )
}

// ─── Renderer por tipo de campo ────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {field.label}
      {"required" in field && field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
  const baseInputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"

  switch (field.kind) {
    case "text":
      return (
        <div>
          {labelEl}
          <input
            type="text"
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={e => onChange(e.target.value)}
            className={baseInputClass}
          />
          {field.helper && <p className="text-xs text-gray-500 mt-1">{field.helper}</p>}
        </div>
      )

    case "textarea":
      return (
        <div className="md:col-span-2">
          {labelEl}
          <textarea
            value={(value as string) ?? ""}
            rows={field.rows ?? 3}
            onChange={e => onChange(e.target.value)}
            className={baseInputClass}
          />
        </div>
      )

    case "number":
      return (
        <div>
          {labelEl}
          <input
            type="number"
            value={value == null ? "" : String(value)}
            onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className={baseInputClass}
          />
          {field.helper && <p className="text-xs text-gray-500 mt-1">{field.helper}</p>}
        </div>
      )

    case "date":
      return (
        <div>
          {labelEl}
          <input
            type="date"
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            className={baseInputClass}
          />
        </div>
      )

    case "time":
      return (
        <div>
          {labelEl}
          <input
            type="time"
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            className={baseInputClass}
          />
        </div>
      )

    case "checkbox":
      return (
        <div className="pt-7">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.key}
              checked={Boolean(value)}
              onChange={e => onChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor={field.key} className="text-sm text-gray-700 select-none cursor-pointer">
              {field.label}
            </label>
          </div>
          {field.helper && <p className="text-xs text-gray-500 mt-1 ml-6">{field.helper}</p>}
        </div>
      )

    case "section":
      return (
        <div className="md:col-span-2 mt-2 mb-1 pb-1 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">{field.label}</h3>
          {field.description && <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>}
        </div>
      )

    case "select":
      return (
        <div>
          {labelEl}
          <select
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Seleccionar…</option>
            {field.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )

    case "selectFrom":
      return (
        <div>
          {labelEl}
          <SearchableSelect
            value={value as string | number | null | undefined}
            onChange={v => onChange(v == null || v === "" ? null : v)}
            options={field.optionsFrom.map(o => ({ value: String(o.value), label: o.label }))}
            placeholder={field.required && !field.allowEmpty ? "Seleccionar…" : "— ninguno —"}
            allowClear={!field.required || field.allowEmpty}
            required={field.required}
          />
        </div>
      )

    case "multiSelectFrom": {
      const selected = (value as string[]) ?? []
      return (
        <div className="md:col-span-2">
          {labelEl}
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <div className="flex flex-wrap gap-2 mb-2">
              {selected.length === 0 && <span className="text-xs text-gray-400 italic">Ninguna seleccionada</span>}
              {selected.map(id => {
                const opt = field.optionsFrom.find(o => o.value === id)
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs"
                  >
                    {opt?.label ?? id}
                    <button
                      type="button"
                      onClick={() => onChange(selected.filter(x => x !== id))}
                      className="hover:text-indigo-900"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
            <select
              value=""
              onChange={e => {
                if (e.target.value && !selected.includes(e.target.value)) {
                  onChange([...selected, e.target.value])
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">+ Agregar…</option>
              {field.optionsFrom
                .filter(o => !selected.includes(o.value))
                .map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
          </div>
        </div>
      )
    }
  }
}
