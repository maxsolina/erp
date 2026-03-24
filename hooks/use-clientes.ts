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
  sucursal_id: number | null
  limite_credito: number
  saldo_cuenta_corriente: number
  total_facturado: number
  activo: boolean
  notas: string | null
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
    clientes: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export async function crearCliente(cliente: Partial<ClienteDB>) {
  const res = await fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function actualizarCliente(id: number, cliente: Partial<ClienteDB>) {
  const res = await fetch(`/api/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function eliminarCliente(id: number) {
  const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
