import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id: remitoId } = await params

  const body = await req.json()
  const {
    remito_numero,
    nv_numero,
    oe_numero,
    deposito_id,
    deposito_nombre,
    ubicacion_id,
    ubicacion_nombre,
    usuario,
    lineas,   // Array<{ producto_id, producto_nombre, cantidad, requiere_serie, series_seleccionadas }>
  } = body

  console.log("[v0] confirmar remito - id:", remitoId, "lineas recibidas:", JSON.stringify(lineas))
  if (!lineas || !Array.isArray(lineas) || lineas.length === 0) {
    console.log("[v0] confirmar remito - RECHAZADO: lineas vacías o no array")
    return NextResponse.json({ error: "Se requieren líneas del remito" }, { status: 400 })
  }

  const errores: string[] = []
  const movimientos: any[] = []

  for (const linea of lineas) {
    const {
      producto_id,
      producto_nombre,
      cantidad,
      requiere_serie,
      series_seleccionadas = [],
    } = linea

    if (requiere_serie) {
      // ── Productos CON número de serie ──────────────────────────────
      for (const serie of series_seleccionadas) {
        // Marcar unidad como entregada
        const { error: uErr } = await supabase
          .from("stock_unidades")
          .update({ estado: "entregado", updated_at: new Date().toISOString() })
          .eq("id", serie.id)
          .eq("estado", "disponible")

        if (uErr) {
          errores.push(`Error al actualizar unidad ${serie.serie}: ${uErr.message}`)
          continue
        }

        // Registrar movimiento por unidad
        movimientos.push({
          tipo: "egreso",
          producto_id,
          producto_nombre,
          cantidad: 1,
          nro_serie: serie.serie,
          deposito_id: deposito_id ?? null,
          deposito_nombre: deposito_nombre ?? null,
          ubicacion_id: ubicacion_id ?? null,
          ubicacion_nombre: ubicacion_nombre ?? null,
          documento_tipo: "remito",
          documento_numero: remito_numero,
          nv_numero: nv_numero ?? null,
          oe_numero: oe_numero ?? null,
          remito_numero,
          usuario: usuario ?? "sistema",
          observaciones: `Entrega confirmada. NV: ${nv_numero ?? "-"} | OE: ${oe_numero ?? "-"}`,
        })
      }
    } else {
      // ── Productos SIN número de serie ──────────────────────────────
      // Descontar de stock_cantidades
      const { data: sc, error: scErr } = await supabase
        .from("stock_cantidades")
        .select("id, cantidad")
        .eq("producto_id", producto_id)
        .eq("ubicacion_id", ubicacion_id)
        .single()

      if (scErr || !sc) {
        errores.push(`No se encontró stock para producto ${producto_nombre}`)
      } else {
        const nuevaCantidad = Math.max(0, (sc.cantidad ?? 0) - cantidad)
        const { error: updErr } = await supabase
          .from("stock_cantidades")
          .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
          .eq("id", sc.id)

        if (updErr) {
          errores.push(`Error al descontar stock de ${producto_nombre}: ${updErr.message}`)
        }
      }

      // Registrar movimiento por cantidad
      movimientos.push({
        tipo: "egreso",
        producto_id,
        producto_nombre,
        cantidad,
        nro_serie: null,
        deposito_id: deposito_id ?? null,
        deposito_nombre: deposito_nombre ?? null,
        ubicacion_id: ubicacion_id ?? null,
        ubicacion_nombre: ubicacion_nombre ?? null,
        documento_tipo: "remito",
        documento_numero: remito_numero,
        nv_numero: nv_numero ?? null,
        oe_numero: oe_numero ?? null,
        remito_numero,
        usuario: usuario ?? "sistema",
        observaciones: `Entrega confirmada. NV: ${nv_numero ?? "-"} | OE: ${oe_numero ?? "-"}`,
      })
    }
  }

  // Insertar todos los movimientos en bloque
  if (movimientos.length > 0) {
    const { error: mErr } = await supabase
      .from("stock_movimientos")
      .insert(movimientos)

    if (mErr) {
      errores.push(`Error al registrar movimientos: ${mErr.message}`)
    }
  }

  if (errores.length > 0) {
    return NextResponse.json({ ok: false, errores }, { status: 207 })
  }

  return NextResponse.json({ ok: true, movimientos_registrados: movimientos.length })
}
