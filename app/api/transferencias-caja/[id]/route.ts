import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, sucursal, caja_desde_id, caja_desde_nombre, caja_hasta_id, caja_hasta_nombre, importe, concepto, fecha, observaciones, estado, comprobante_salida_id, comprobante_entrada_id"

interface ValorLinea {
  valor_id?: string | null
  valor_nombre?: string | null
  importe?: number
  moneda?: string | null
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("transferencias_caja").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Transferencia no encontrada", 404)

  const { data: valores } = await supabase
    .from("transferencia_caja_valores")
    .select("id, valor_id, valor_nombre, importe, moneda")
    .eq("transferencia_id", id)

  return NextResponse.json({ ...data, valores: valores ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("transferencias_caja").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Transferencia no encontrada", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar en borrador", 409)

  const valores: ValorLinea[] | undefined = Array.isArray(body.valores) ? body.valores : undefined

  const update: Record<string, unknown> = {}
  if (body.caja_desde_id !== undefined) {
    update.caja_desde_id = body.caja_desde_id
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_desde_id).maybeSingle()
    if (c) update.caja_desde_nombre = c.nombre
  }
  if (body.caja_hasta_id !== undefined) {
    update.caja_hasta_id = body.caja_hasta_id
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_hasta_id).maybeSingle()
    if (c) update.caja_hasta_nombre = c.nombre
  }
  for (const f of ["sucursal", "concepto", "fecha", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (valores) {
    update.importe = valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)
  }

  const { data, error } = await supabase.from("transferencias_caja").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)

  // Reemplazar las líneas si vinieron en el body
  if (valores) {
    await supabase.from("transferencia_caja_valores").delete().eq("transferencia_id", id)
    if (valores.length > 0) {
      const valorIds = valores.map(v => v.valor_id!).filter(Boolean)
      const { data: cvs } = await supabase
        .from("caja_valores")
        .select("id, nombre, moneda")
        .in("id", valorIds)
      const cvMap = new Map((cvs ?? []).map((c: any) => [c.id, c]))
      const filas = valores.map(v => {
        const cv = cvMap.get(v.valor_id as string) as any
        return {
          transferencia_id: id,
          valor_id: v.valor_id,
          valor_nombre: cv?.nombre ?? v.valor_nombre ?? null,
          importe: Number(v.importe),
          moneda: cv?.moneda ?? v.moneda ?? null,
        }
      })
      const { error: e2 } = await supabase.from("transferencia_caja_valores").insert(filas)
      if (e2) return dbError(e2)
    }
  }

  return NextResponse.json(data)
}
