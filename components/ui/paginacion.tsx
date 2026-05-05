"use client"

// Paginación frontend genérica al estilo Odoo.
//
// Uso típico:
//   const { paginated, controles } = usePaginacion(filtrados)
//   <thead/><tbody>{paginated.map(...)}</tbody>
//   {controles}
//
// La paginación es 100% frontend (slice sobre el array ya cargado). El backend
// ya cap a 49999 filas con `.range(...)` en los endpoints de listado, así que
// el límite duro queda allá. Si en el futuro algún módulo crece más allá, hay
// que pasar a backend pagination — pero por ahora frontend alcanza y es
// trivial de aplicar a todos los listados.
//
// El default es 40 filas (igual que Odoo). Sin persistencia: cada vez que se
// monta el componente arranca en 40.

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export const PAGE_SIZE_OPTIONS = [40, 80, 200, 500, Infinity] as const
export type PageSize = typeof PAGE_SIZE_OPTIONS[number]

const labelFor = (n: PageSize) => (n === Infinity ? "Todos" : String(n))

export function usePaginacion<T>(items: T[]) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<PageSize>(40)

  const total = items.length
  const totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)

  const paginated = useMemo(() => {
    if (pageSize === Infinity) return items
    const start = safePage * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const desde = total === 0 ? 0 : safePage * (pageSize === Infinity ? total : pageSize) + 1
  const hasta = pageSize === Infinity ? total : Math.min(total, (safePage + 1) * pageSize)

  const controles = (
    <PaginacionControles
      page={safePage}
      totalPages={totalPages}
      pageSize={pageSize}
      total={total}
      desde={desde}
      hasta={hasta}
      onPageChange={setPage}
      onPageSizeChange={(n) => {
        setPageSize(n)
        setPage(0)
      }}
    />
  )

  return {
    paginated,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    desde,
    hasta,
    controles,
  }
}

export function PaginacionControles({
  page,
  totalPages,
  pageSize,
  total,
  desde,
  hasta,
  onPageChange,
  onPageSizeChange,
  className = "",
}: {
  page: number
  totalPages: number
  pageSize: PageSize
  total: number
  desde: number
  hasta: number
  onPageChange: (p: number) => void
  onPageSizeChange: (n: PageSize) => void
  className?: string
}) {
  const noHayQuePaginar = pageSize === Infinity || total <= pageSize

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <span className="whitespace-nowrap">
        {total === 0 ? "0 resultados" : `${desde}-${hasta} de ${total}`}
      </span>
      {!noHayQuePaginar && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Primera página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 whitespace-nowrap text-xs">
            Pág. <strong>{page + 1}</strong>/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <select
        value={pageSize === Infinity ? "Infinity" : pageSize}
        onChange={(e) => {
          const v = e.target.value
          onPageSizeChange(v === "Infinity" ? Infinity : (Number(v) as PageSize))
        }}
        className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
        title="Filas por página"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={String(n)} value={n === Infinity ? "Infinity" : n}>
            {labelFor(n)}
          </option>
        ))}
      </select>
    </div>
  )
}
