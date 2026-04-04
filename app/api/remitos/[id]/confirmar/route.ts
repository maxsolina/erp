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
    lineas: lineasBody,
  } = body

  // ── 1. Resolver líneas ──────────────────────────────────────────────────────
  // Usar las lineas del body si vienen con producto_id; si no, buscar en la DB
  let lineas: any[] = Array.isArray(lineasBody)
    ? lineasBody.filter((l: any) => l?.producto_id)
    : []

  if (lineas.length === 0 && nv_numero) {
    // Buscar la NV por número
    const { data: nv } = await supabase
      .from("notas_venta")
      .select("id")
      .eq("numero", nv_numero)
      .single()

    if (nv?.id) {
      const { data: nvLineas } = await supabase
        .from("notas_venta_lineas")
        .select("producto_id, producto_nombre, cantidad")
        .eq("nota_venta_id", nv.id)

      if (nvLineas && nvLineas.length > 0) {
        // Determinar cuáles productos requieren serie
        const productIds = nvLineas.map((l: any) => l.producto_id)
        const { data: productos } = await supabase
          .from("productos")
          .select("id, tiene_numero_serie")
          .in("id", productIds)

        const prodMap: Record<number, boolean> = {}
        productos?.forEach((p: any) => { prodMap[p.id] = p.tiene_numero_serie ?? false })

        // Para productos con serie, buscar las unidades disponibles en esa ubicación
        lineas = await Promise.all(
          nvLineas.map(async (l: any) => {
            const requiereSerie = prodMap[l.producto_id] ?? false
            let series_seleccionadas: { id: number; serie: string }[] = []

            if (requiereSerie) {
              const query = supabase
                .from("stock_unidades")
                .select("id, nro_serie")
                .eq("producto_id", l.producto_id)
                .eq("estado", "disponible")
                .limit(Number(l.cantidad))

              if (ubicacion_id) query.eq("ubicacion_id", ubicacion_id)

              const { data: unidades } = await query
              series_seleccionadas = (unidades ?? []).map((u: any) => ({
                id: u.id,
                serie: u.nro_serie ?? `ID:${u.id}`,
              }))
            }

            return {
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre ?? "",
              cantidad: Number(l.cantidad),
              requiere_serie: requiereSerie,
              series_seleccionadas,
            }
          })
        )
      }
    }
  }

  if (lineas.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron líneas para el remito" },
      { status: 400 }
    )
  }

  // ── 2. Procesar cada línea ──────────────────────────────────────────────────
  const errores: string[] = []
  const movimientos: any[] = []
  const obs = `Entrega confirmada. NV: ${nv_numero ?? "-"} | OE: ${oe_numero ?? "-"}`

  for (const linea of lineas) {
    const {
      producto_id,
      producto_nombre,
      cantidad,
      requiere_serie,
      series_seleccionadas = [],
    } = linea

    if (requiere_serie) {
      // ── Con serie: marcar cada unidad como entregado ───────────────
      // Si no vienen series del body, buscarlas ahora
      let series = series_seleccionadas
      if (series.length === 0) {
        const query = supabase
          .from("stock_unidades")
          .select("id, nro_serie")
          .eq("producto_id", producto_id)
          .eq("estado", "disponible")
          .limit(cantidad)
        if (ubicacion_id) query.eq("ubicacion_id", ubicacion_id)
        const { data: unidades } = await query
        series = (unidades ?? []).map((u: any) => ({
          id: u.id,
          serie: u.nro_serie ?? `ID:${u.id}`,
        }))
      }

      if (series.length === 0) {
        errores.push(`Sin stock disponible para ${producto_nombre}`)
        continue
      }

      for (const s of series) {
        const { error: uErr } = await supabase
          .from("stock_unidades")
          .update({ estado: "entregado", updated_at: new Date().toISOString() })
          .eq("id", s.id)

        if (uErr) {
          errores.push(`Error actualizando unidad ${s.serie}: ${uErr.message}`)
          continue
        }

        movimientos.push({
          tipo: "egreso",
          producto_id,
          producto_nombre: producto_nombre ?? "",
          cantidad: 1,
          nro_serie: s.serie,
          deposito_id: deposito_id ?? null,
          deposito_nombre: deposito_nombre ?? null,
          ubicacion_id: ubicacion_id ?? null,
          ubicacion_nombre: ubicacion_nombre ?? null,
          documento_tipo: "remito",
          documento_numero: remito_numero ?? null,
          nv_numero: nv_numero ?? null,
          oe_numero: oe_numero ?? null,
          remito_numero: remito_numero ?? null,
          usuario: usuario ?? "sistema",
          observaciones: obs,
        })
      }
    } else {
      // ── Sin serie: descontar de stock_cantidades ───────────────────
      const scQuery = supabase
        .from("stock_cantidades")
        .select("id, cantidad")
        .eq("producto_id", producto_id)
      if (ubicacion_id) scQuery.eq("ubicacion_id", ubicacion_id)
      const { data: sc } = await scQuery.single()

      if (!sc) {
        errores.push(`Sin registro de stock para ${producto_nombre}`)
      } else {
        const nuevaCantidad = Math.max(0, Number(sc.cantidad) - Number(cantidad))
        const { error: updErr } = await supabase
          .from("stock_cantidades")
          .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
          .eq("id", sc.id)

        if (updErr) {
          errores.push(`Error descontando stock de ${producto_nombre}: ${updErr.message}`)
        }
      }

      movimientos.push({
        tipo: "egreso",
        producto_id,
        producto_nombre: producto_nombre ?? "",
        cantidad,
        nro_serie: null,
        deposito_id: deposito_id ?? null,
        deposito_nombre: deposito_nombre ?? null,
        ubicacion_id: ubicacion_id ?? null,
        ubicacion_nombre: ubicacion_nombre ?? null,
        documento_tipo: "remito",
        documento_numero: remito_numero ?? null,
        nv_numero: nv_numero ?? null,
        oe_numero: oe_numero ?? null,
        remito_numero: remito_numero ?? null,
        usuario: usuario ?? "sistema",
        observaciones: obs,
      })
    }
  }

  // ── 3. Insertar movimientos en bloque ───────────────────────────────────────
  if (movimientos.length > 0) {
    const { error: mErr } = await supabase
      .from("stock_movimientos")
      .insert(movimientos)

    if (mErr) {
      errores.push(`Error registrando movimientos: ${mErr.message}`)
    }
  }

  if (errores.length > 0) {
    return NextResponse.json({ ok: false, errores, movimientos_registrados: movimientos.length }, { status: 207 })
  }

  return NextResponse.json({ ok: true, movimientos_registrados: movimientos.length })
}
