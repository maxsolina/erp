import { createClient } from "@/lib/supabase/client"

export interface CategoriaProveedorDB {
  id: number
  nombre: string
  disponible_clientes: boolean
  disponible_proveedores: boolean
  tipo_control: string
  cuenta_cobrar_defecto: string
  cuenta_pagar_defecto: string
  requiere_oc_para_facturar: boolean
  comprobantes_confidenciales: boolean
  cuenta_cobrar_id: string | null   // UUID → contabilidad_plan_cuentas (para facturas de venta)
  cuenta_pagar_id: string | null    // UUID → contabilidad_plan_cuentas (para facturas de compra)
  created_at: string
}

export async function getCategoriaProveedores(): Promise<CategoriaProveedorDB[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categorias_proveedor")
    .select("*")
    .order("nombre", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCategoriaProveedor(
  payload: Omit<CategoriaProveedorDB, "id" | "created_at">
): Promise<CategoriaProveedorDB> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categorias_proveedor")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCategoriaProveedor(
  id: number,
  payload: Partial<Omit<CategoriaProveedorDB, "id" | "created_at">>
): Promise<CategoriaProveedorDB> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categorias_proveedor")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategoriaProveedor(id: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("categorias_proveedor")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
}
