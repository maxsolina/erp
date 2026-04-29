import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/catalogo-permisos → catálogo maestro de permisos del sistema
// Devuelve todos los permisos activos ordenados por módulo y orden.
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("catalogo_permisos")
    .select("id, modulo, tipo, label, descripcion, orden, activo, parent_id")
    .eq("activo", true)
    .order("modulo")
    .order("orden")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
