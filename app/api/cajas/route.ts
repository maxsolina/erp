import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/cajas → listado de cajas (filtra activos por default, ?incluir_inactivos=1 las trae todas)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("cajas")
    .select("id, nombre, codigo, sucursal, cierre_diario_obligatorio, activo")
    .order("sucursal")
    .order("nombre")

  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
