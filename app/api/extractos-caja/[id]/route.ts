import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/extractos-caja/[id]
//
// Devuelve el extracto + saldos con saldo_estimado calculado (suma signed de
// movimientos_caja confirmados/pendientes por valor, ignorando cancelados).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: extracto, error } = await supabase
    .from("extractos_caja")
    .select("id, numero, caja_id, caja_nombre, sucursal, responsable_nombre, fecha_apertura, fecha_cierre, estado")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!extracto) return apiError("Extracto no encontrado", 404)

  const [{ data: saldos }, { data: movs }] = await Promise.all([
    supabase.from("extracto_saldos").select("id, valor_id, valor_nombre, valor_codigo, moneda, saldo_apertura, saldo_cierre_ingresado").eq("extracto_id", id),
    supabase.from("movimientos_caja").select("valor_id, tipo_movimiento, importe, estado_movimiento").eq("extracto_id", id),
  ])

  const movsByValor = new Map<string, { ingresos: number; egresos: number }>()
  for (const m of movs ?? []) {
    if (m.estado_movimiento === "cancelado") continue
    const cur = movsByValor.get(m.valor_id as string) ?? { ingresos: 0, egresos: 0 }
    if (m.tipo_movimiento === "ingreso") cur.ingresos += Number(m.importe ?? 0)
    else if (m.tipo_movimiento === "egreso") cur.egresos += Number(m.importe ?? 0)
    movsByValor.set(m.valor_id as string, cur)
  }

  const saldosEnriquecidos = (saldos ?? []).map(s => {
    const mov = movsByValor.get(s.valor_id as string)
    const saldoEstimado = Number(s.saldo_apertura ?? 0) + (mov?.ingresos ?? 0) - (mov?.egresos ?? 0)
    return { ...s, saldo_estimado: Math.round(saldoEstimado * 100) / 100 }
  })

  return NextResponse.json({ ...extracto, saldos: saldosEnriquecidos })
}
