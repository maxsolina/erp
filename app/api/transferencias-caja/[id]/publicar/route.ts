import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/transferencias-caja/[id]/publicar
//
// Workflow (multi-valor):
//   1. Verifica extractos abiertos en caja origen y destino.
//   2. Por cada valor en transferencia_caja_valores:
//      - Mapea el valor origen al equivalente en destino por (tipo + moneda).
//      - Inserta movimiento_caja egreso confirmado en origen.
//      - Inserta movimiento_caja ingreso pendiente en destino.
//   3. Transferencia: borrador → pendiente.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase.from("transferencias_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "borrador") return apiError("Solo se pueden publicar transferencias en borrador", 409)

  const { data: lineas } = await supabase
    .from("transferencia_caja_valores")
    .select("id, valor_id, valor_nombre, importe, moneda")
    .eq("transferencia_id", id)
  if (!lineas || lineas.length === 0) return apiError("La transferencia no tiene valores cargados", 422)

  const extOrigen = await getExtractoAbierto(supabase, tr.caja_desde_id, tr.caja_desde_nombre)
  if (!extOrigen.ok) return apiError(extOrigen.error, 409)
  const extDestino = await getExtractoAbierto(supabase, tr.caja_hasta_id, tr.caja_hasta_nombre)
  if (!extDestino.ok) return apiError(extDestino.error, 409)

  // Resolver los valores origen y sus equivalentes en destino (por tipo+moneda).
  const valorIdsOrigen = lineas.map((l: any) => l.valor_id).filter(Boolean)
  const { data: valoresOrigen } = await supabase
    .from("caja_valores")
    .select("id, tipo, moneda, nombre")
    .in("id", valorIdsOrigen)
  const cvOrigenById = new Map((valoresOrigen ?? []).map((v: any) => [v.id, v]))

  // Para cada combinación (tipo, moneda) buscamos el valor equivalente en destino.
  const equivalencias = new Map<string, { id: string; nombre: string }>()
  for (const linea of lineas as any[]) {
    const cvOr = cvOrigenById.get(linea.valor_id) as any
    if (!cvOr) return apiError(`Valor de origen ${linea.valor_id} no encontrado`, 404)
    const key = `${cvOr.tipo}|${cvOr.moneda}`
    if (equivalencias.has(key)) continue
    const { data: vd } = await supabase
      .from("caja_valores")
      .select("id, nombre")
      .eq("caja_id", tr.caja_hasta_id)
      .eq("tipo", cvOr.tipo)
      .eq("moneda", cvOr.moneda)
      .is("banco_permitido_id", null)
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (!vd) {
      return apiError(
        `La caja destino "${tr.caja_hasta_nombre}" no tiene un valor de tipo "${cvOr.tipo}" en moneda "${cvOr.moneda}" (necesario para "${linea.valor_nombre}").`,
        422,
      )
    }
    equivalencias.set(key, vd)
  }

  // Insertar movimientos por cada línea
  const movsIds: { lineaId: string; salida: string; entrada: string }[] = []
  for (const linea of lineas as any[]) {
    const cvOr = cvOrigenById.get(linea.valor_id) as any
    const vd = equivalencias.get(`${cvOr.tipo}|${cvOr.moneda}`)!

    const { data: movSalida, error: e1 } = await supabase
      .from("movimientos_caja")
      .insert({
        extracto_id: extOrigen.extractoId,
        valor_id: linea.valor_id,
        valor_nombre: linea.valor_nombre,
        tipo_movimiento: "egreso",
        importe: linea.importe,
        moneda: linea.moneda,
        concepto: `Transf. a ${tr.caja_hasta_nombre}`,
        documento_origen_tipo: "transferencia_caja_salida",
        documento_origen_id: tr.id,
        documento_origen_numero: tr.numero,
        estado_movimiento: "confirmado",
      })
      .select("id")
      .single()
    if (e1) return dbError(e1)

    const { data: movEntrada, error: e2 } = await supabase
      .from("movimientos_caja")
      .insert({
        extracto_id: extDestino.extractoId,
        valor_id: vd.id,
        valor_nombre: vd.nombre,
        tipo_movimiento: "ingreso",
        importe: linea.importe,
        moneda: linea.moneda,
        concepto: `Transf. desde ${tr.caja_desde_nombre}`,
        documento_origen_tipo: "transferencia_caja_entrada",
        documento_origen_id: tr.id,
        documento_origen_numero: tr.numero,
        estado_movimiento: "pendiente",
      })
      .select("id")
      .single()
    if (e2) return dbError(e2)

    movsIds.push({ lineaId: linea.id, salida: movSalida!.id, entrada: movEntrada!.id })
  }

  // Persistir los ids de movs en cada línea (para que el "recibir" sepa cuál confirmar)
  for (const m of movsIds) {
    await supabase
      .from("transferencia_caja_valores")
      .update({ comprobante_salida_id: m.salida, comprobante_entrada_id: m.entrada })
      .eq("id", m.lineaId)
  }

  // Compatibilidad: dejamos también el primer salida/entrada en la cabecera.
  const { error: eUpd } = await supabase
    .from("transferencias_caja")
    .update({
      estado: "pendiente",
      comprobante_salida_id: movsIds[0]?.salida,
      comprobante_entrada_id: movsIds[0]?.entrada,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
