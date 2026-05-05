import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listado de ajustes (filtra por tipo, estado).
//   ?tipo=positivo|negativo
//   ?estado=borrador|pendiente|confirmado|cancelado
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")
  const estado = searchParams.get("estado")

  let query = supabase
    .from("ajustes_stock")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 4999)

  if (tipo) query = query.eq("tipo", tipo)
  if (estado) query = query.eq("estado", estado)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST — crear nuevo ajuste en estado 'borrador'.
// Body:
//   tipo: 'positivo' | 'negativo'
//   fecha?: ISO date (default hoy)
//   deposito_id, deposito_nombre, ubicacion_id, ubicacion_nombre
//   sucursal_id (opcional)
//   concepto, observaciones
//   lineas: array de líneas
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  if (!body.tipo || !["positivo", "negativo"].includes(body.tipo)) {
    return NextResponse.json({ error: "tipo inválido (positivo|negativo)" }, { status: 422 })
  }

  // Generar número via RPC
  const { data: numeroRpc } = await supabase.rpc("next_ajuste_stock_numero", { p_tipo: body.tipo })
  const numero = numeroRpc ?? `${body.tipo === "positivo" ? "AJP" : "AJN"}-${Date.now()}`

  const cabecera: Record<string, unknown> = {
    numero,
    tipo: body.tipo,
    fecha: body.fecha ? body.fecha.split("T")[0] : new Date().toISOString().split("T")[0],
    deposito_id: body.deposito_id ?? null,
    deposito_nombre: body.deposito_nombre ?? null,
    ubicacion_id: body.ubicacion_id ?? null,
    ubicacion_nombre: body.ubicacion_nombre ?? null,
    sucursal_id: body.sucursal_id ?? null,
    concepto: body.concepto ?? null,
    observaciones: body.observaciones ?? null,
    estado: "borrador",
    created_by: body.created_by ?? null,
  }

  const { data: aj, error: ajErr } = await supabase
    .from("ajustes_stock")
    .insert(cabecera)
    .select()
    .single()
  if (ajErr) return dbError(ajErr)

  // Insertar líneas
  const lineas = Array.isArray(body.lineas) ? body.lineas : []
  if (lineas.length > 0) {
    const lineasInsert = lineas.map((l: any, idx: number) => ({
      ajuste_id: aj.id,
      producto_id: l.producto_id ?? null,
      producto_nombre: l.producto_nombre ?? null,
      producto_codigo: l.producto_codigo ?? null,
      cantidad: Number(l.cantidad ?? 1),
      stock_unidad_id: l.stock_unidad_id ?? null,
      nro_serie: l.nro_serie ?? null,
      color: l.color ?? null,
      bateria_pct: l.bateria_pct ?? null,
      es_outlet: !!l.es_outlet,
      observaciones: l.observaciones ?? null,
      costo_unitario: l.costo_unitario != null ? Number(l.costo_unitario) : null,
      orden: idx,
    }))
    const { error: lErr } = await supabase.from("ajustes_stock_lineas").insert(lineasInsert)
    if (lErr) {
      // rollback de cabecera huérfana
      await supabase.from("ajustes_stock").delete().eq("id", aj.id)
      return dbError(lErr)
    }
  }

  await registrarEvento(supabase, {
    tipo_documento: "ajuste_stock",
    documento_id: aj.id,
    tipo_evento: "creacion",
    usuario: body.created_by ?? null,
    descripcion: `Ajuste ${body.tipo === "positivo" ? "positivo" : "negativo"} ${aj.numero}${body.concepto ? ` — ${body.concepto}` : ""}`,
  })

  return NextResponse.json({ ok: true, id: aj.id, numero: aj.numero })
}
