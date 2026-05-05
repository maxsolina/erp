import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("compras_ordenes_pago")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Generar número si no viene
  if (!body.numero) {
    const { data: numData } = await supabase.rpc("generar_numero_op")
    if (numData) body.numero = numData
    else body.numero = `OP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
  }

  // Calcular periodo
  if (body.fecha) {
    const d = new Date(body.fecha)
    body.periodo = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  }

  const { medios_pago, comprobantes, ...opData } = body

  const { data, error } = await supabase
    .from("compras_ordenes_pago")
    .insert([opData])
    .select()
    .single()

  if (error) return dbError(error)

  // Insertar medios de pago
  if (Array.isArray(medios_pago) && medios_pago.length > 0) {
    const mediosConOp = medios_pago.map((m: Record<string, unknown>) => ({ ...m, op_id: data.id }))
    const { error: medErr } = await supabase.from("compras_op_medios_pago").insert(mediosConOp)
    if (medErr) {
      return NextResponse.json(
        { error: `OP creada (id:${data.id}) pero error al insertar medios de pago: ${medErr.message}` },
        { status: 207 }
      )
    }
  }

  // Insertar comprobantes
  if (Array.isArray(comprobantes) && comprobantes.length > 0) {
    const compConOp = comprobantes.map((c: Record<string, unknown>) => ({ ...c, op_id: data.id }))
    const { error: compErr } = await supabase.from("compras_op_comprobantes").insert(compConOp)
    if (compErr) {
      return NextResponse.json(
        { error: `OP creada (id:${data.id}) pero error al insertar comprobantes: ${compErr.message}` },
        { status: 207 }
      )
    }
  }

  await registrarEvento(supabase, {
    tipo_documento: "orden_pago",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Orden de Pago ${data.numero ?? `#${data.id}`}${body.proveedor_nombre ? ` — ${body.proveedor_nombre}` : ""}`,
  })

  return NextResponse.json(data, { status: 201 })
}
