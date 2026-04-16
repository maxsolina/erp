import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const { motivo, descripcion } = await req.json()

  // 1. Obtener la factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas")
    .select("id, numero, estado, total, subtotal, impuestos, fecha, sucursal, moneda")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (factura.estado === "cancelada") {
    return NextResponse.json({ error: "La factura ya está cancelada" }, { status: 422 })
  }

  // 2. Marcar factura como cancelada
  const { error: updateErr } = await supabase
    .from("facturas")
    .update({ estado: "cancelada", saldo: 0, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 3. Buscar el asiento original vinculado a esta factura
  const { data: asientoOriginal } = await supabase
    .from("contabilidad_asientos")
    .select("id, numero, diario_id, periodo_id, fecha, lineas:contabilidad_asientos_lineas(*)")
    .eq("comprobante_tipo", "factura")
    .eq("referencia", factura.numero)
    .neq("estado", "cancelado")
    .maybeSingle()

  if (!asientoOriginal) {
    // Factura cancelada pero sin asiento original — OK, no hay reversión que hacer
    return NextResponse.json({
      ok: true,
      asiento_reversion_id: null,
      _advertencia: "Factura cancelada sin asiento de reversión (no existía asiento original)",
    })
  }

  // 4. Obtener período activo para la fecha de hoy
  const fechaHoy = new Date().toISOString().split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaHoy })

  // 5. Generar número para el asiento de reversión
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", {
      p_diario_id: asientoOriginal.diario_id,
      p_fecha: fechaHoy,
    })

  // 6. Crear el asiento de reversión (líneas invertidas)
  const { data: asientoReversion, error: revErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:              numero ?? null,
      diario_id:           asientoOriginal.diario_id,
      periodo_id:          periodo_id ?? asientoOriginal.periodo_id,
      fecha:               fechaHoy,
      concepto:            `Cancelación ${factura.numero} — ${motivo ?? "Sin motivo"}`,
      referencia:          factura.numero,
      comprobante_tipo:    "cancelacion_factura",
      asiento_reversion_id: asientoOriginal.id,
      moneda_original:     factura.moneda ?? "ARS",
      es_manual:           false,
      estado:              "publicado",
    })
    .select("id")
    .single()

  if (revErr) {
    return NextResponse.json({
      ok: true,
      asiento_reversion_id: null,
      _advertencia: `Factura cancelada pero falló el asiento de reversión: ${revErr.message}`,
    })
  }

  // 7. Insertar líneas invertidas (debe ↔ haber)
  const lineasReversion = (asientoOriginal.lineas as any[]).map((l: any) => ({
    asiento_id:    asientoReversion.id,
    cuenta_id:     l.cuenta_id,
    cuenta_codigo: l.cuenta_codigo,
    cuenta_nombre: l.cuenta_nombre,
    debe:          l.haber,   // invertido
    haber:         l.debe,    // invertido
    descripcion:   `Rev. ${l.descripcion ?? factura.numero}`,
    orden:         l.orden,
  }))

  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasReversion)

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoReversion.id)
    return NextResponse.json({
      ok: true,
      asiento_reversion_id: null,
      _advertencia: `Factura cancelada pero falló al insertar líneas de reversión: ${lineasErr.message}`,
    })
  }

  // 8. Actualizar el asiento original apuntando a su reversión
  await supabase
    .from("contabilidad_asientos")
    .update({ asiento_reversion_id: asientoReversion.id })
    .eq("id", asientoOriginal.id)

  return NextResponse.json({
    ok: true,
    asiento_reversion_id: asientoReversion.id,
    numero_reversion: numero,
  })
}
