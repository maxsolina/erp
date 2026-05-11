import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/movimientos-banco
//
// Query params:
//   cuenta_bancaria_id    requerido
//   tipo_fecha            "fecha_operacion" | "fecha_creacion" (default fecha_operacion)
//   desde, hasta          ISO date
//   conciliado            "true" | "false" | omit (todos)
//   tipos_movimiento      CSV de tipos_operacion
//   incluir_no_clasif     "1" para incluir movimientos sin tipo_operacion
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cuentaBancariaId = searchParams.get("cuenta_bancaria_id")
  if (!cuentaBancariaId) {
    return NextResponse.json([])
  }

  const tipoFecha = searchParams.get("tipo_fecha") === "fecha_creacion" ? "fecha_creacion" : "fecha_operacion"
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const conciliado = searchParams.get("conciliado")
  const tiposCsv = searchParams.get("tipos_movimiento")
  const incluirNoClasif = searchParams.get("incluir_no_clasif") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("movimientos_banco")
    .select("id, cuenta_bancaria_id, cuenta_bancaria_nombre, tipo_movimiento, importe, moneda, tipo_operacion, numero_operacion, fecha_operacion, chequera, numero_cheque, concepto, documento_origen_tipo, documento_origen_numero, conciliado, fecha_conciliacion, fecha_creacion")
    .eq("cuenta_bancaria_id", cuentaBancariaId)
    .order("fecha_operacion", { ascending: true })

  if (desde) query = query.gte(tipoFecha, desde)
  if (hasta) query = query.lte(tipoFecha, hasta)

  if (conciliado === "true") query = query.eq("conciliado", true)
  else if (conciliado === "false") query = query.eq("conciliado", false)

  // Tipos de movimiento — si vienen, filtramos por OR (tipo en lista OR sin clasificar si así se pidió)
  if (tiposCsv) {
    const tipos = tiposCsv.split(",").map(s => s.trim()).filter(Boolean)
    if (tipos.length > 0) {
      // Filtro IN sobre tipo_operacion; si incluir_no_clasif, agregamos OR is null.
      if (incluirNoClasif) {
        const escaped = tipos.map(t => `"${t.replace(/"/g, "\\\"")}"`).join(",")
        query = query.or(`tipo_operacion.in.(${escaped}),tipo_operacion.is.null`)
      } else {
        query = query.in("tipo_operacion", tipos)
      }
    }
  } else if (!incluirNoClasif) {
    // sin lista de tipos y sin incluir no clasificados → solo los que tienen tipo_operacion
    query = query.not("tipo_operacion", "is", null)
  }

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
