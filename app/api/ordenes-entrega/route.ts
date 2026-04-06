import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("ordenes_entrega")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Garantizar que productos y seguimiento siempre sean arrays
  const mapped = (data ?? []).map((oe: any) => ({
    ...oe,
    productos: Array.isArray(oe.productos) ? oe.productos : [],
    seguimiento: Array.isArray(oe.seguimiento) ? oe.seguimiento : [],
  }))
  return NextResponse.json(mapped)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  // Generar número en el servidor de forma atómica
  let numero = body.numero
  if (!numero) {
    const { data: last } = await supabase
      .from("ordenes_entrega")
      .select("numero")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastNum = last?.numero
      ? parseInt(last.numero.replace(/\D/g, "").slice(-8), 10)
      : 1050
    numero = `OE X 10000-${String(lastNum + 1).padStart(8, "0")}`
  }
  // Verificar que no exista ya ese número
  const { data: existing } = await supabase
    .from("ordenes_entrega")
    .select("id")
    .eq("numero", numero)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `Ya existe una OE con el número ${numero}` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from("ordenes_entrega")
    .insert({
      numero,
      nota_venta_id: body.nota_venta_id ?? null,
      nota_venta_numero: body.nota_venta_numero ?? null,
      cliente_id: body.cliente_id ?? null,
      cliente_nombre: body.cliente_nombre ?? null,
      estado: body.estado ?? "confirmada",
      fecha: body.fecha ?? null,
      fecha_entrega_programada: body.fecha_entrega_programada ?? null,
      tipo: body.tipo ?? null,
      deposito_origen: body.deposito_origen ?? null,
      ubicacion_origen: body.ubicacion_origen ?? null,
      total_productos: Number(body.total_productos ?? 0),
      productos_entregados: Number(body.productos_entregados ?? 0),
      productos: body.productos ?? [],
      seguimiento: body.seguimiento ?? [],
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
