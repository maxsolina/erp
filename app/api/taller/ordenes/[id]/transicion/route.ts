import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

// POST /api/taller/ordenes/[id]/transicion
// Body: { nuevo_estado, usuario, nota?, motivo_cierre_id?, tecnico_id? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase.rpc("taller_transicionar_estado", {
    p_ot_id: id,
    p_nuevo_estado: body.nuevo_estado,
    p_usuario: body.usuario ?? "Sistema",
    p_nota: body.nota ?? null,
    p_motivo_cierre_id: body.motivo_cierre_id ?? null,
    p_tecnico_id: body.tecnico_id ?? null,
  })

  if (error) return dbError(error)

  const result = typeof data === "string" ? JSON.parse(data) : data
  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  await registrarEvento(supabase, {
    tipo_documento: "orden_taller",
    documento_id: id,
    tipo_evento: "cambio_estado",
    valor_anterior: result?.estado_anterior ?? "",
    valor_nuevo: body.nuevo_estado,
    usuario: body.usuario ?? null,
  })

  // ─── Post-procesamiento: cancelación de OT ────────────────────────────
  // Si se cancela la OT, cancelar la NV vinculada (si está editable).
  // Si ya hay factura emitida, no la tocamos — el operador tiene que
  // emitir Nota de Crédito manualmente desde el módulo de Ventas.
  // Los recibos de seña/cobros quedan sin imputación → saldo a favor del
  // cliente (queda en cuenta corriente).
  if (body.nuevo_estado === "cancelada") {
    const { data: nv } = await supabase
      .from("notas_venta")
      .select("id, numero, estado")
      .eq("ot_id", id)
      .neq("estado", "cancelada")
      .maybeSingle()

    if (nv) {
      const estadosCancelables = ["borrador", "abierta", "a_facturar"]
      if (estadosCancelables.includes(nv.estado)) {
        const { error: cancelErr } = await supabase
          .from("notas_venta")
          .update({ estado: "cancelada", updated_at: new Date().toISOString() })
          .eq("id", nv.id)
        if (!cancelErr) {
          await registrarEvento(supabase, {
            tipo_documento: "nota_venta",
            documento_id: nv.id,
            tipo_evento: "cambio_estado",
            valor_anterior: nv.estado,
            valor_nuevo: "cancelada",
            usuario: body.usuario ?? null,
          })
          await registrarEvento(supabase, {
            tipo_documento: "orden_taller",
            documento_id: id,
            tipo_evento: "nota",
            usuario: body.usuario ?? null,
            descripcion: `NV ${nv.numero} cancelada automáticamente al cancelar la OT`,
          })
        }
      } else {
        // NV ya facturada — alertar al operador via seguimiento
        await registrarEvento(supabase, {
          tipo_documento: "orden_taller",
          documento_id: id,
          tipo_evento: "nota",
          usuario: body.usuario ?? null,
          descripcion: `⚠️ NV ${nv.numero} ya estaba en estado "${nv.estado}". Hay que emitir Nota de Crédito manualmente desde Ventas.`,
        })
      }
    }
  }

  return NextResponse.json(result)
}
