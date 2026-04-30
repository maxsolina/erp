// Tipos y helpers compartidos para Ventas (top-level migradas).

export interface Cliente {
  id: number
  codigo?: string
  nombre: string
  razon_social?: string | null
  tipo_documento?: string
  numero_documento?: string | null
  cuit?: string | null
  condicion_iva?: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  ciudad?: string | null
  provincia?: string | null
  saldo_cuenta_corriente?: number
  total_facturado?: number
  activo: boolean
  categoria_id?: number | null
  vendedor_id?: number | null
  lista_precios_id?: number | null
}

export { formatCurrency } from "@/lib/format"
