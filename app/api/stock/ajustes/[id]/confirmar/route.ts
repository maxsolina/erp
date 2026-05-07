import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generarAsientoAjuste } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — pendiente → confirmado.
//
// Aplica el ajuste físicamente:
//   POSITIVO + producto con IMEI:
//     - Crea una nueva fila en stock_unidades por línea (estado=disponible)
//     - Persiste stock_unidad_id en la línea para trazabilidad
//     - Registra movimiento en movimientos_stock (tipo=ajuste_positivo, origen=ajuste)
//   POSITIVO sin IMEI:
//     - Suma cantidad en stock_cantidades para esa ubicación
//     - Registra movimiento en movimientos_stock (cantidad=N)
//   NEGATIVO + producto con IMEI:
//     - Marca la unidad existente (stock_unidad_id de la línea) como dado_de_baja
//     - Registra movimiento (tipo=ajuste_negativo)
//   NEGATIVO sin IMEI:
//     - Resta cantidad en stock_cantidades
//     - Registra movimiento
//
// Después genera el asiento contable (DR/CR según tipo). Si el asiento falla,
// igualmente queda confirmado el stock — devolvemos 207 con _advertencia_contable.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // 1. Leer ajuste + líneas
  const { data: aj } = await supabase.from("ajustes_stock").select("*").eq("id", Number(id)).maybeSingle()
  if (!aj) return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 })
  if (aj.estado !== "pendiente") {
    return NextResponse.json({
      error: `Sólo se puede confirmar un ajuste en estado "pendiente". Estado actual: "${aj.estado}".`,
    }, { status: 422 })
  }

  const { data: lineas } = await supabase
    .from("ajustes_stock_lineas")
    .select("*")
    .eq("ajuste_id", aj.id)
    .order("orden")
  if (!lineas || lineas.length === 0) {
    return NextResponse.json({ error: "El ajuste no tiene líneas" }, { status: 422 })
  }

  // 2. Cargar flags + costo contable de productos.
  // El asiento se valúa con `productos.costo_contable` (con fallback a
  // `costo_manual` si el contable está en 0). Si el producto no tiene
  // ningún costo cargado, queda en 0 y no se genera asiento (queda
  // advertencia contable). El form valida esto en frontend para ajustes
  // positivos, pero lo recheckeamos acá por las dudas.
  const productoIds = [...new Set(lineas.map(l => l.producto_id).filter((x): x is number => x != null))]
  const flagsPorProd = new Map<number, { tiene_numero_serie: boolean; costo: number }>()
  if (productoIds.length > 0) {
    const { data: prods } = await supabase
      .from("productos")
      .select("id, tiene_numero_serie, costo_contable, costo_manual")
      .in("id", productoIds)
    for (const p of prods ?? []) {
      const costo = Number(p.costo_contable ?? 0) || Number(p.costo_manual ?? 0) || 0
      flagsPorProd.set(p.id, {
        tiene_numero_serie: !!p.tiene_numero_serie,
        costo,
      })
    }
  }

  const errores: string[] = []
  let importeTotal = 0

  // 3. Aplicar cada línea
  for (const l of lineas) {
    const flags = l.producto_id != null ? flagsPorProd.get(l.producto_id) : null
    const tieneSerie = !!flags?.tiene_numero_serie
    // El costo del asiento sale del costo contable del producto.
    // Lo persistimos en la línea (costo_unitario) para que la ficha muestre el
    // costo que se usó al confirmar (snapshot histórico).
    const costoUnit = Number(flags?.costo ?? 0)
    const cant = Number(l.cantidad ?? 1)
    importeTotal += costoUnit * cant
    if (costoUnit > 0) {
      await supabase.from("ajustes_stock_lineas").update({ costo_unitario: costoUnit }).eq("id", l.id)
    }

    if (aj.tipo === "positivo") {
      if (tieneSerie) {
        // Crear stock_unidades
        const { data: nueva, error: insErr } = await supabase
          .from("stock_unidades")
          .insert({
            producto_id: l.producto_id,
            ubicacion_id: aj.ubicacion_id,
            deposito_id: aj.deposito_id,
            nro_serie: l.nro_serie,
            color: l.color,
            bateria_pct: l.bateria_pct,
            es_outlet: l.es_outlet,
            observaciones: l.observaciones,
            estado: "disponible",
            origen_tipo: "ajuste_positivo",
            origen_id: aj.id,
            origen_numero: aj.numero,
          })
          .select("id")
          .single()
        if (insErr) {
          errores.push(`Línea ${l.orden}: ${insErr.message}`)
          continue
        }
        // Linkear la línea con la nueva unidad
        await supabase.from("ajustes_stock_lineas").update({ stock_unidad_id: nueva!.id }).eq("id", l.id)
        // Registrar movimiento — chequeamos error y propagamos como advertencia.
        const { error: movErr } = await supabase.from("movimientos_stock").insert({
          tipo: "ajuste_positivo",
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          ubicacion_destino_id: aj.ubicacion_id,
          deposito_destino_id: aj.deposito_id,
          cantidad: 1,
          stock_unidad_id: nueva!.id,
          nro_serie: l.nro_serie,
          origen_tipo: "ajuste",
          origen_id: aj.id,
          origen_numero: aj.numero,
          usuario: body.usuario ?? "sistema",
          observaciones: aj.concepto ?? null,
        })
        if (movErr) errores.push(`Línea ${l.orden}: error al registrar movimiento: ${movErr.message}`)
      } else {
        // Sin serie: sumar a stock_cantidades
        const { data: sc } = await supabase
          .from("stock_cantidades")
          .select("id, cantidad")
          .eq("producto_id", l.producto_id)
          .eq("ubicacion_id", aj.ubicacion_id)
          .maybeSingle()
        if (sc) {
          const { error: updScErr } = await supabase.from("stock_cantidades")
            .update({ cantidad: Number(sc.cantidad) + cant, updated_at: new Date().toISOString() })
            .eq("id", sc.id)
          if (updScErr) {
            errores.push(`Línea ${l.orden}: error sumando stock: ${updScErr.message}`)
            continue
          }
        } else {
          const { error: insScErr } = await supabase.from("stock_cantidades").insert({
            producto_id: l.producto_id,
            ubicacion_id: aj.ubicacion_id,
            deposito_id: aj.deposito_id,
            cantidad: cant,
          })
          if (insScErr) {
            errores.push(`Línea ${l.orden}: error creando registro de stock: ${insScErr.message}`)
            continue
          }
        }
        const { error: movErr } = await supabase.from("movimientos_stock").insert({
          tipo: "ajuste_positivo",
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          ubicacion_destino_id: aj.ubicacion_id,
          deposito_destino_id: aj.deposito_id,
          cantidad: cant,
          nro_serie: null,
          origen_tipo: "ajuste",
          origen_id: aj.id,
          origen_numero: aj.numero,
          usuario: body.usuario ?? "sistema",
          observaciones: aj.concepto ?? null,
        })
        if (movErr) errores.push(`Línea ${l.orden}: error al registrar movimiento: ${movErr.message}`)
      }
    } else {
      // NEGATIVO
      if (tieneSerie) {
        if (!l.stock_unidad_id) {
          errores.push(`Línea ${l.orden}: falta seleccionar la unidad a dar de baja`)
          continue
        }
        const { error: upErr } = await supabase
          .from("stock_unidades")
          .update({ estado: "dado_de_baja", updated_at: new Date().toISOString() })
          .eq("id", l.stock_unidad_id)
        if (upErr) {
          errores.push(`Línea ${l.orden}: ${upErr.message}`)
          continue
        }
        const { error: movErr } = await supabase.from("movimientos_stock").insert({
          tipo: "ajuste_negativo",
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          ubicacion_origen_id: aj.ubicacion_id,
          deposito_origen_id: aj.deposito_id,
          cantidad: 1,
          stock_unidad_id: l.stock_unidad_id,
          nro_serie: l.nro_serie,
          origen_tipo: "ajuste",
          origen_id: aj.id,
          origen_numero: aj.numero,
          usuario: body.usuario ?? "sistema",
          observaciones: aj.concepto ?? null,
        })
        if (movErr) errores.push(`Línea ${l.orden}: error al registrar movimiento: ${movErr.message}`)
      } else {
        // Sin serie: descontar de stock_cantidades
        const { data: sc } = await supabase
          .from("stock_cantidades")
          .select("id, cantidad")
          .eq("producto_id", l.producto_id)
          .eq("ubicacion_id", aj.ubicacion_id)
          .maybeSingle()
        if (!sc || Number(sc.cantidad) < cant) {
          errores.push(`Línea ${l.orden}: stock insuficiente para ${l.producto_nombre}`)
          continue
        }
        const { error: updScErr } = await supabase.from("stock_cantidades")
          .update({ cantidad: Number(sc.cantidad) - cant, updated_at: new Date().toISOString() })
          .eq("id", sc.id)
        if (updScErr) {
          errores.push(`Línea ${l.orden}: error descontando stock: ${updScErr.message}`)
          continue
        }
        const { error: movErr } = await supabase.from("movimientos_stock").insert({
          tipo: "ajuste_negativo",
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          ubicacion_origen_id: aj.ubicacion_id,
          deposito_origen_id: aj.deposito_id,
          cantidad: cant,
          nro_serie: null,
          origen_tipo: "ajuste",
          origen_id: aj.id,
          origen_numero: aj.numero,
          usuario: body.usuario ?? "sistema",
          observaciones: aj.concepto ?? null,
        })
        if (movErr) errores.push(`Línea ${l.orden}: error al registrar movimiento: ${movErr.message}`)
      }
    }
  }

  if (errores.length > 0) {
    return NextResponse.json({ ok: false, errores, importe_total: importeTotal }, { status: 207 })
  }

  // 4. Generar asiento contable
  let asientoId: string | null = null
  let advertenciaContable: string | null = null
  if (importeTotal > 0) {
    const res = await generarAsientoAjuste(supabase, {
      id: aj.id,
      numero: aj.numero,
      tipo: aj.tipo,
      fecha: aj.fecha,
      sucursal_id: aj.sucursal_id ?? null,
      deposito_nombre: aj.deposito_nombre ?? null,
      concepto: aj.concepto ?? null,
      importe_total: importeTotal,
    })
    if (res.ok) {
      asientoId = res.asiento_id
    } else {
      advertenciaContable = res.error
    }
  } else {
    advertenciaContable = "Sin asiento contable: importe total = 0 (sin costo_unitario en líneas o sin costo del producto)"
  }

  // 5. Marcar el ajuste como confirmado
  const { error: confErr } = await supabase
    .from("ajustes_stock")
    .update({
      estado: "confirmado",
      asiento_id: asientoId,
      aprobado_por: body.aprobado_por ?? null,
      aprobado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", aj.id)
  if (confErr) return dbError(confErr)

  await registrarEvento(supabase, {
    tipo_documento: "ajuste_stock",
    documento_id: aj.id,
    tipo_evento: "cambio_estado",
    valor_anterior: "pendiente",
    valor_nuevo: "confirmado",
    usuario: body.aprobado_por ?? null,
  })

  return NextResponse.json({
    ok: true,
    importe_total: importeTotal,
    asiento_id: asientoId,
    _advertencia_contable: advertenciaContable,
  })
}
