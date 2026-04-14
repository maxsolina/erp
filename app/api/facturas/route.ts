import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const numero = searchParams.get("numero")

  let query = supabase
    .from("facturas")
    .select(`
      *,
      facturas_lineas(*),
      facturas_vencimientos(*)
    `)
    .order("created_at", { ascending: false })

  if (id) query = query.eq("id", Number(id))
  else if (numero) query = query.eq("numero", numero)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const {
    nota_venta_id,
    nota_venta_numero,
    cliente_id,
    cliente_nombre,
    vendedor_nombre,
    sucursal,
    fecha,
    estado = "abierta",
    moneda = "ARS",
    termino_pago,
    subtotal,
    descuento = 0,
    impuestos = 0,
    total,
    saldo,
    lineas = [],
  } = body

  // Generar número correlativo
  const { data: lastFac } = await supabase
    .from("facturas")
    .select("numero")
    .like("numero", "FAC-%")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastNum = lastFac?.numero ? parseInt(lastFac.numero.replace("FAC-", "")) || 0 : 0
  const facturaNumero = `FAC-${String(lastNum + 1).padStart(5, "0")}`

  const { data: facData, error: facErr } = await supabase
    .from("facturas")
    .insert({
      numero: facturaNumero,
      tipo: "",
      nota_venta_id: nota_venta_id ?? null,
      nota_venta_numero: nota_venta_numero ?? null,
      cliente_id: cliente_id ?? null,
      cliente_nombre: cliente_nombre ?? null,
      vendedor_nombre: vendedor_nombre ?? null,
      sucursal: sucursal ?? null,
      fecha: fecha ?? new Date().toISOString(),
      estado,
      moneda,
      termino_pago: termino_pago ?? null,
      subtotal: subtotal ?? 0,
      descuento,
      impuestos,
      total: total ?? 0,
      saldo: saldo ?? total ?? 0,
    })
    .select()
    .single()

  if (facErr) return NextResponse.json({ error: facErr.message }, { status: 500 })

  // Insertar líneas
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => ({
      factura_id: facData.id,
      producto_id: l.producto_id ?? null,
      producto_nombre: l.producto_nombre ?? "",
      descripcion: l.descripcion ?? null,
      cantidad: l.cantidad ?? 1,
      precio_unitario: l.precio_unitario ?? 0,
      descuento: l.descuento ?? 0,
      subtotal: l.subtotal ?? 0,
    }))
    await supabase.from("facturas_lineas").insert(lineasInsert)
  }

  return NextResponse.json({ ...facData, numero: facturaNumero })
}
