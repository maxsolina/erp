import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, caja_id, caja_nombre, sucursal, responsable_nombre, fecha_apertura, fecha_cierre, estado"

// GET /api/extractos-caja
//
// Por default enriquece cada extracto con `saldos` (lista de extracto_saldos
// con `saldo_estimado` calculado server-side ignorando cancelados). Pasar
// ?sin_saldos=1 para una lista sin enriquecimiento (más rápido).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)
  const estado = searchParams.get("estado")
  const sinSaldos = searchParams.get("sin_saldos") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("extractos_caja")
    .select(SELECT_LIST)
    .order("fecha_apertura", { ascending: false })
    .limit(limit)

  if (estado) query = query.eq("estado", estado)

  const { data, error } = await query
  if (error) return dbError(error)
  if (!data || data.length === 0 || sinSaldos) return NextResponse.json(data ?? [])

  // Enriquecimiento: una sola query por saldos + una sola por movimientos
  // sumarizados, indexados por (extracto_id, valor_id).
  const ids = data.map(e => (e as { id: string }).id)
  let [{ data: saldos }, { data: movs }] = await Promise.all([
    supabase.from("extracto_saldos")
      .select("id, extracto_id, valor_id, valor_nombre, valor_codigo, moneda, saldo_apertura, saldo_cierre_ingresado")
      .in("extracto_id", ids),
    supabase.from("movimientos_caja")
      .select("extracto_id, valor_id, tipo_movimiento, importe, estado_movimiento")
      .in("extracto_id", ids),
  ])

  // Excluir valores asociados a bancos permitidos (no son valores físicos de la caja).
  const valorIdsTodos = Array.from(new Set([
    ...((saldos ?? []).map(s => (s as any).valor_id)),
    ...((movs ?? []).map(m => (m as any).valor_id)),
  ].filter(Boolean)))
  if (valorIdsTodos.length > 0) {
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, banco_permitido_id")
      .in("id", valorIdsTodos)
    const bancoIds = new Set((cv ?? []).filter((v: any) => v.banco_permitido_id).map((v: any) => v.id))
    if (bancoIds.size > 0) {
      saldos = (saldos ?? []).filter((s: any) => !bancoIds.has(s.valor_id))
      movs = (movs ?? []).filter((m: any) => !bancoIds.has(m.valor_id))
    }
  }

  // Index: (extracto_id|valor_id) → {ingresos, egresos}
  const movMap = new Map<string, { ingresos: number; egresos: number }>()
  for (const m of movs ?? []) {
    if (m.estado_movimiento === "cancelado") continue
    const key = `${m.extracto_id}|${m.valor_id}`
    const cur = movMap.get(key) ?? { ingresos: 0, egresos: 0 }
    if (m.tipo_movimiento === "ingreso") cur.ingresos += Number(m.importe ?? 0)
    else if (m.tipo_movimiento === "egreso") cur.egresos += Number(m.importe ?? 0)
    movMap.set(key, cur)
  }

  const saldosByExt = new Map<string, any[]>()
  for (const s of saldos ?? []) {
    const mov = movMap.get(`${s.extracto_id}|${s.valor_id}`)
    const saldoEstimado = Number(s.saldo_apertura ?? 0) + (mov?.ingresos ?? 0) - (mov?.egresos ?? 0)
    const enriched = { ...s, saldo_estimado: Math.round(saldoEstimado * 100) / 100 }
    const arr = saldosByExt.get(s.extracto_id as string) ?? []
    arr.push(enriched)
    saldosByExt.set(s.extracto_id as string, arr)
  }

  const enriched = data.map(e => ({ ...(e as any), saldos: saldosByExt.get((e as { id: string }).id) ?? [] }))
  return NextResponse.json(enriched)
}

// POST /api/extractos-caja — abre un extracto nuevo en una caja.
//
// Workflow:
//   1. Valida que la caja no tenga otro extracto abierto.
//   2. Genera número via RPC.
//   3. Inserta el extracto en estado=abierto.
//   4. Inserta una fila en extracto_saldos por cada caja_valor activo, con
//      saldo_apertura = saldo_cierre_ingresado del último extracto cerrado.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_id) return apiError("caja_id es requerido", 400)

  const supabase = await createClient()
  const { data: caja } = await supabase.from("cajas").select("id, nombre, sucursal").eq("id", body.caja_id).maybeSingle()
  if (!caja) return apiError("Caja no encontrada", 404)

  // Verificar que no haya extracto abierto.
  const { data: abierto } = await supabase
    .from("extractos_caja")
    .select("id")
    .eq("caja_id", body.caja_id)
    .eq("estado", "abierto")
    .maybeSingle()
  if (abierto) return apiError("Esta caja ya tiene un extracto abierto", 409)

  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_extracto", { p_sucursal: caja.sucursal || "" })
  if (rpcErr) return dbError(rpcErr)

  const { data: extracto, error: eIns } = await supabase
    .from("extractos_caja")
    .insert({
      numero,
      caja_id: body.caja_id,
      caja_nombre: caja.nombre,
      sucursal: caja.sucursal,
      responsable_nombre: body.responsable_nombre || null,
      estado: "abierto",
    })
    .select("id, numero, caja_id, caja_nombre, sucursal, responsable_nombre, fecha_apertura, estado")
    .single()
  if (eIns) return dbError(eIns)

  // Inicializar saldos por valor (saldo_apertura = último saldo_cierre del valor).
  const { data: valores } = await supabase
    .from("caja_valores")
    .select("id, codigo, nombre, moneda")
    .eq("caja_id", body.caja_id)
    .eq("activo", true)

  if (valores && valores.length > 0) {
    const saldosCierre: Record<string, number> = {}
    const { data: lastExt } = await supabase
      .from("extractos_caja")
      .select("id")
      .eq("caja_id", body.caja_id)
      .eq("estado", "cerrado")
      .order("fecha_cierre", { ascending: false })
      .limit(1)
    if (lastExt && lastExt.length > 0) {
      const { data: lastSaldos } = await supabase
        .from("extracto_saldos")
        .select("valor_id, saldo_cierre_ingresado")
        .eq("extracto_id", lastExt[0].id)
      for (const s of lastSaldos ?? []) {
        saldosCierre[s.valor_id as string] = (s.saldo_cierre_ingresado as number) ?? 0
      }
    }

    const filas = valores.map(v => ({
      extracto_id: (extracto as { id: string }).id,
      valor_id: v.id,
      valor_nombre: v.nombre,
      valor_codigo: (v as any).codigo,
      moneda: v.moneda,
      saldo_apertura: saldosCierre[v.id as string] ?? 0,
    }))
    const { error: eSal } = await supabase.from("extracto_saldos").insert(filas)
    if (eSal) return dbError(eSal)
  }

  return NextResponse.json(extracto, { status: 201 })
}
