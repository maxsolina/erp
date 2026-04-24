import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface ClienteDB {
  id: number
  codigo: string
  nombre: string
  razon_social: string | null
  tipo_documento: string
  numero_documento: string | null
  cuit: string | null
  condicion_iva: string
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  pais: string
  termino_pago_id: number | null
  vendedor_id: number | null
  lista_precios_id: number | null
  sucursal_id: number | null
  limite_credito: number
  saldo_cuenta_corriente: number
  total_facturado: number
  activo: boolean
  notas: string | null
  categoria_id: number | null
  created_at: string
  updated_at: string
}

export function useClientes(busqueda?: string, activo?: boolean) {
  const params = new URLSearchParams()
  if (busqueda) params.set("busqueda", busqueda)
  if (activo !== undefined) params.set("activo", String(activo))

  const key = `/api/clientes${params.toString() ? `?${params.toString()}` : ""}`

  const { data, error, isLoading, mutate } = useSWR<ClienteDB[]>(key, fetcher)

  return {
    clientes: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

// Funciones de mutación — retornan Promise, sin await en el cuerpo del módulo
export function crearCliente(cliente: Partial<ClienteDB>): Promise<ClienteDB> {
  return fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  }).then((res) => {
    if (!res.ok) return res.text().then((t) => Promise.reject(new Error(t)))
    return res.json()
  })
}

export function actualizarCliente(id: number, cliente: Partial<ClienteDB>): Promise<ClienteDB> {
  return fetch(`/api/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  }).then((res) => {
    if (!res.ok) return res.text().then((t) => Promise.reject(new Error(t)))
    return res.json()
  })
}

export function eliminarCliente(id: number): Promise<{ ok: boolean }> {
  return fetch(`/api/clientes/${id}`, { method: "DELETE" }).then((res) => {
    if (!res.ok) return res.text().then((t) => Promise.reject(new Error(t)))
    return res.json()
  })
}
