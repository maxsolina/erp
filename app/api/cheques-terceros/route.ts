import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/cheques-terceros
// Filtros opcionales: ?estado=en_cartera, ?caja_id=<uuid>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 500)
  const estado = searchParams.get("estado")
  const cajaId = searchParams.get("caja_id")

  const supabase = await createClient()
  let query = supabase
    .from("cheques_terceros")
    .select("id, numero_cheque, fecha_vencimiento, origen_nombre, banco_nombre, importe, moneda, caja_id, caja_nombre, fecha_ingreso, estado")
    .order("fecha_vencimiento", { ascending: false })
    .limit(limit)

  if (estado) query = query.eq("estado", estado)
  if (cajaId) query = query.eq("caja_id", cajaId)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
