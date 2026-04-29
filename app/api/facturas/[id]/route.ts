import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
