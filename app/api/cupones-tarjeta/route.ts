import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/cupones-tarjeta — listado de cupones (default: últimos 200).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get("estado")
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  let query = supabase
    .from("cupones_tarjeta")
    .select(
      "id, numero_cupon, numero_lote, tarjeta_nombre, forma_pago_nombre, cliente_nombre, sucursal, importe, moneda, fecha_ing_egr, estado, fecha_conciliacion, venta_numero",
    )
    .order("fecha_ing_egr", { ascending: false })
    .limit(limit)

  if (estado) query = query.eq("estado", estado)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
