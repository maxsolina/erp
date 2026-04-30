import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PUT — reemplazar cabecera + líneas de una factura en estado "borrador".
// No toca medios de pago (esos se generan al confirmar).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: `ID inválido: ${id}` }, { status: 400 })
  }

  const body = await req.json()
  const {
    cliente_id,
    cliente_nombre,
    vendedor_nombre,
    sucursal,
    moneda,
    cotizacion,
    termino_pago,
    subtotal,
    descuento,
    lineas = [],
  } = body

  const { data: actual, error: actualErr } = await supabase
    .from("facturas")
    .select("estado")
    .eq("id", idNum)
    .single()
  if (actualErr || !actual) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (actual.estado !== "borrador") {
    return NextResponse.json(
      { error: `No se puede editar una factura en estado '${actual.estado}'. Solo borradores son editables.` },
      { status: 422 }
    )
  }

  const total = Number(subtotal ?? 0)
  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      cliente_id: cliente_id ?? null,
      cliente_nombre: cliente_nombre ?? null,
      vendedor_nombre: vendedor_nombre ?? null,
      sucursal: sucursal ?? null,
      moneda: moneda ?? "ARS",
      cotizacion: cotizacion ?? 1,
      termino_pago: termino_pago ?? null,
      subtotal: total,
      descuento: Number(descuento ?? 0),
      impuestos: 0,
      total,
      saldo: total,
    })
    .eq("id", idNum)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const { error: delErr } = await supabase
    .from("facturas_lineas")
    .delete()
    .eq("factura_id", idNum)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => {
      const cant = Number(l.cantidad ?? 1)
      const precio = Number(l.precio_unitario ?? 0)
      const desc = Number(l.descuento ?? 0)
      const sub = Number(l.subtotal ?? (cant * precio * (1 - desc / 100)))
      return {
        factura_id: idNum,
        producto_id: l.producto_id ?? null,
        producto_nombre: String(l.producto_nombre ?? ""),
        descripcion: l.descripcion ?? null,
        cantidad: cant,
        precio_unitario: precio,
        descuento: desc,
        subtotal: isNaN(sub) ? 0 : sub,
        iva: Number(l.iva ?? 0),
      }
    })
    const { error: insErr } = await supabase
      .from("facturas_lineas")
      .insert(lineasInsert)
    if (insErr) {
      return NextResponse.json(
        { error: `Cabecera actualizada pero error en líneas: ${insErr.message}` },
        { status: 207 }
      )
    }
  }

  return NextResponse.json({ ok: true, id: idNum })
}

// Suprime definitivamente una factura — solo permitido si está en estado "borrador".
// Borra también líneas, vencimientos y medios de pago asociados.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  const idNum = Number(id)
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: `ID inválido: ${id}` }, { status: 400 })
  }

  const { data: factura, error: facErr } = await supabase
    .from("facturas")
    .select("id, estado")
    .eq("id", idNum)
    .maybeSingle()

  if (facErr) {
    return NextResponse.json({ error: `Error consultando factura: ${facErr.message}` }, { status: 500 })
  }
  // Idempotente: si la factura no existe (p. ej. borrador solo en memoria del front), devolvemos OK.
  if (!factura) {
    return NextResponse.json({ ok: true, ya_no_existia: true })
  }
  if (factura.estado !== "borrador") {
    return NextResponse.json(
      { error: "Solo se pueden suprimir facturas en estado borrador" },
      { status: 422 }
    )
  }

  await supabase.from("factura_medios_pago").delete().eq("factura_id", idNum)
  await supabase.from("facturas_lineas").delete().eq("factura_id", idNum)
  await supabase.from("facturas_vencimientos").delete().eq("factura_id", idNum)

  const { error: delErr } = await supabase.from("facturas").delete().eq("id", idNum)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
