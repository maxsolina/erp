import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notas_debito_compra")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("notas_debito_compra")
    .insert([body])
    .select()
    .single()

  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: "nota_debito_compra",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Nota de Débito Compra ${data.numero ?? `#${data.id}`}${body.proveedor_nombre ? ` — ${body.proveedor_nombre}` : ""}`,
  })

  return NextResponse.json(data, { status: 201 })
}
