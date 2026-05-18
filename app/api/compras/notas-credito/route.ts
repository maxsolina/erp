import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const proveedorId = searchParams.get("proveedor_id")
  const conSaldo = searchParams.get("con_saldo") === "true"

  let query = supabase
    .from("notas_credito_compra")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (proveedorId) query = query.eq("proveedor_id", Number(proveedorId))
  if (conSaldo) {
    // Filtra NCs con saldo_disponible > 0 — usado por el form de OP para mostrar
    // los créditos del proveedor disponibles para aplicar.
    query = query.gt("saldo_disponible", 0)
  }

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Generar número correlativo (NC-YYYY-XXXX) si no viene uno limpio.
  // El form envía un placeholder con timestamp largo — lo reemplazamos.
  if (!body.numero || /^NC-\d{10,}$/.test(body.numero)) {
    const { data: numData } = await supabase.rpc("generar_numero_nc_compra")
    if (numData) body.numero = numData
  }

  const { data, error } = await supabase
    .from("notas_credito_compra")
    .insert([body])
    .select()
    .single()

  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: "nota_credito_compra",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Nota de Crédito Compra ${data.numero ?? `#${data.id}`}${body.proveedor_nombre ? ` — ${body.proveedor_nombre}` : ""}`,
  })

  return NextResponse.json(data, { status: 201 })
}
