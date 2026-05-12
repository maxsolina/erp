import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/extractos-caja/[id]
//
// Devuelve el extracto + saldos (con saldo_estimado + transacciones)
// + movimientos completos (ordenados desc por fecha).
//
// Auto-fix de huérfanos: si hay movimientos_caja con valor_id que no aparece
// en extracto_saldos (puede pasar si se agregó un valor a la caja después de
// abrir el extracto), se insertan filas nuevas en extracto_saldos con
// saldo_apertura=0. Solo aplica al extracto abierto.
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

  let [{ data: saldos }, { data: movs }] = await Promise.all([
    supabase.from("extracto_saldos")
      .select("id, valor_id, valor_nombre, valor_codigo, moneda, saldo_apertura, saldo_cierre_ingresado")
      .eq("extracto_id", id),
    supabase.from("movimientos_caja")
      .select("id, extracto_id, valor_id, valor_nombre, tipo_movimiento, importe, moneda, concepto, documento_origen_tipo, documento_origen_id, documento_origen_numero, estado_movimiento, fecha")
      .eq("extracto_id", id)
      .order("fecha", { ascending: false }),
  ])

  // Excluir valores que sean punteros a bancos permitidos: el banco no es un
  // "valor físico" de la caja, sus movimientos se ven en el extracto del banco.
  const valorIdsTodos = Array.from(new Set([
    ...((saldos ?? []).map(s => (s as any).valor_id)),
    ...((movs ?? []).map(m => (m as any).valor_id)),
  ].filter(Boolean)))
  let bancoValorIds = new Set<string>()
  if (valorIdsTodos.length > 0) {
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, banco_permitido_id")
      .in("id", valorIdsTodos)
    bancoValorIds = new Set((cv ?? []).filter((v: any) => v.banco_permitido_id).map((v: any) => v.id))
  }
  if (bancoValorIds.size > 0) {
    saldos = (saldos ?? []).filter((s: any) => !bancoValorIds.has(s.valor_id))
    movs = (movs ?? []).filter((m: any) => !bancoValorIds.has(m.valor_id))
  }

  // Auto-fix de huérfanos solo si está abierto.
  if (extracto.estado === "abierto" && saldos && movs) {
    const valorIdsRegistrados = new Set((saldos as any[]).map(s => s.valor_id))
    const huerfanos = new Map<string, any>()
    for (const m of movs as any[]) {
      if (m.valor_id && !valorIdsRegistrados.has(m.valor_id) && !huerfanos.has(m.valor_id)) {
        huerfanos.set(m.valor_id, m)
      }
    }
    if (huerfanos.size > 0) {
      const filasNuevas = Array.from(huerfanos.values()).map(m => ({
        extracto_id: id,
        valor_id: m.valor_id,
        valor_nombre: m.valor_nombre,
        valor_codigo: m.valor_nombre,
        moneda: m.moneda,
        saldo_apertura: 0,
      }))
      const { data: insertados } = await supabase.from("extracto_saldos").insert(filasNuevas).select()
      if (insertados) saldos = [...(saldos as any[]), ...(insertados as any[])]
    }
  }

  const movsByValor = new Map<string, { ingresos: number; egresos: number; transacciones: number }>()
  for (const m of movs ?? []) {
    if ((m as any).estado_movimiento === "cancelado") continue
    const cur = movsByValor.get((m as any).valor_id as string) ?? { ingresos: 0, egresos: 0, transacciones: 0 }
    if ((m as any).tipo_movimiento === "ingreso") cur.ingresos += Number((m as any).importe ?? 0)
    else if ((m as any).tipo_movimiento === "egreso") cur.egresos += Number((m as any).importe ?? 0)
    cur.transacciones += 1
    movsByValor.set((m as any).valor_id as string, cur)
  }

  const saldosEnriquecidos = (saldos ?? []).map((s: any) => {
    const mov = movsByValor.get(s.valor_id as string)
    const saldoEstimado = Number(s.saldo_apertura ?? 0) + (mov?.ingresos ?? 0) - (mov?.egresos ?? 0)
    return {
      ...s,
      saldo_estimado: Math.round(saldoEstimado * 100) / 100,
      transacciones: mov?.transacciones ?? 0,
    }
  })

  return NextResponse.json({ ...extracto, saldos: saldosEnriquecidos, movimientos: movs ?? [] })
}
