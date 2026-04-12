"use client"

import React from "react"

/* ================================================================
   ListPage – Componentes reutilizables para pantallas de lista
   Sistema: Cell Home ERP
   Referencia visual: Módulo Depósito → "IMEI en Stock"
   ================================================================

   Uso típico:

   <ListPageHeader title="IMEI en Stock"
     actions={<ListPageAction onClick={fn} icon={<Plus className="w-4 h-4"/>}>Nuevo</ListPageAction>}
   />
   <OdooFilterBar ... />
   <ListTable>
     {datos.length === 0 ? <ListEmpty message="Sin datos" /> : (
       <table className="w-full">
         <ListThead>
           <ListTh>Nombre</ListTh>
           <ListTh align="center">Estado</ListTh>
         </ListThead>
         <tbody>
           {datos.map(d => (
             <ListTr key={d.id} onClick={() => ver(d)}>
               <ListTd className="font-medium text-gray-900">{d.nombre}</ListTd>
               <ListTd align="center"><ListBadge variant="success">Activo</ListBadge></ListTd>
             </ListTr>
           ))}
         </tbody>
       </table>
     )}
   </ListTable>
   ================================================================ */

// ── Constantes de estilo ─────────────────────────────────────────
const TITLE_CLASS = "text-2xl font-bold text-amber-900"
const ACTION_BTN_CLASS = "bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
const TABLE_WRAPPER_CLASS = "mt-4 bg-white rounded-lg shadow-sm overflow-hidden"
const THEAD_ROW_CLASS = "border-b bg-gray-50"
const TH_BASE = "py-2 px-4 text-xs font-semibold text-gray-600 uppercase"
const TR_BASE = "border-b border-gray-100 hover:bg-gray-50"
const TD_BASE = "py-2 px-4 text-sm text-gray-600"

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

// ── ListPageHeader ───────────────────────────────────────────────
export function ListPageHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className={TITLE_CLASS}>{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── ListPageAction (botón "+ Nuevo X") ───────────────────────────
export function ListPageAction({
  onClick,
  icon,
  children,
}: {
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} className={ACTION_BTN_CLASS}>
      {icon}
      {children}
    </button>
  )
}

// ── ListTable (contenedor blanco con sombra) ─────────────────────
export function ListTable({ children }: { children: React.ReactNode }) {
  return <div className={TABLE_WRAPPER_CLASS}>{children}</div>
}

// ── ListThead ────────────────────────────────────────────────────
export function ListThead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className={THEAD_ROW_CLASS}>{children}</tr>
    </thead>
  )
}

// ── ListTh ───────────────────────────────────────────────────────
export function ListTh({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
}) {
  return (
    <th className={`${TH_BASE} ${ALIGN[align]} ${className}`}>
      {children}
    </th>
  )
}

// ── ListTr ───────────────────────────────────────────────────────
export function ListTr({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={`${TR_BASE} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  )
}

// ── ListTd ───────────────────────────────────────────────────────
export function ListTd({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
}) {
  return (
    <td className={`${TD_BASE} ${ALIGN[align]} ${className}`}>
      {children}
    </td>
  )
}

// ── ListEmpty ────────────────────────────────────────────────────
export function ListEmpty({
  icon,
  message,
  onClear,
}: {
  icon?: React.ReactNode
  message?: string
  onClear?: () => void
}) {
  return (
    <div className="p-8 text-center">
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <p className="text-gray-500">{message || "No se encontraron registros"}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

// ── ListBadge ────────────────────────────────────────────────────
const BADGE_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
}

export function ListBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode
  variant?: "success" | "warning" | "danger" | "info" | "default" | "purple"
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE_COLORS[variant]}`}
    >
      {children}
    </span>
  )
}

// ── Exportar constantes para uso directo en migraciones parciales ─
export {
  TITLE_CLASS,
  ACTION_BTN_CLASS,
  TABLE_WRAPPER_CLASS,
  THEAD_ROW_CLASS,
  TH_BASE,
  TR_BASE,
  TD_BASE,
}
