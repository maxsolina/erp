import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/caja-valores?caja_id=<uuid>
// Listado de valores (formas de pago) configurados para una caja.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cajaId = searchParams.get("caja_id")

  const supabase = await createClient()
  let query = supabase
    .from("caja_valores")
    .select("id, caja_id, nombre, tipo, subtipo, moneda, banco_permitido_id, activo")
    .order("nombre")

  if (cajaId) query = query.eq("caja_id", cajaId)

  // Filtrar activos (compat con DBs donde la columna `activo` existe pero algunos rows tienen NULL)
  const { data, error } = await query
  if (error) return dbError(error)

  const filtrados = (data ?? []).filter((v: any) => v.activo === true || v.activo === null || v.activo === undefined)
  return NextResponse.json(filtrados)
}
