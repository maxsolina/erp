"use server"

import { createClient } from "@/lib/supabase/server"

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
  created_at: string
}

export async function getCategoriaProveedores(): Promise<CategoriaProveedorDB[]> {
  const supabase = await createClient()
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
  const supabase = await createClient()
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
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { error } = await supabase
    .from("categorias_proveedor")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
}
