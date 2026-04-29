import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ajustes_clientes")
    .select("*, sucursales(nombre)")
    .order("created_at", { ascending: false })
  if (error) return dbError(error)

  const mapped = (data ?? []).map((a: any) => ({
    ...a,
    sucursal: a.sucursales?.nombre ?? a.sucursal ?? "",
    // saldo_disponible: si la columna existe la usa; si no, cae a total
    saldo_disponible: a.saldo_disponible ?? a.total,
    sucursales: undefined,
  }))
  return NextResponse.json(mapped)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  // tipo es solo metadata del front para elegir prefijo (NC/ND).
  // No es una columna de la tabla.
  const tipo = body.tipo === "nota_debito" ? "nota_debito" : "nota_credito"
  const prefix = tipo === "nota_debito" ? "ND-A" : "NC-A"

  // Generar correlativo contando por prefijo de número (no por columna `tipo`)
  const { count } = await supabase
    .from("ajustes_clientes")
    .select("*", { count: "exact", head: true })
    .like("numero", `${prefix}-%`)
  const seq = (count ?? 0) + 1
  const numero = `${prefix}-${String(seq).padStart(5, "0")}`

  // Sólo columnas que realmente existen en la tabla
  const insertData: Record<string, any> = {
    numero,
    fecha: body.fecha,
    cliente_id: body.cliente_id,
    cliente_nombre: body.cliente_nombre,
    estado: body.estado ?? "publicado",
    concepto: body.concepto,
    moneda: body.moneda ?? "ARS",
    categoria: body.categoria ?? null,
    nota_venta_numero: body.nota_venta_numero ?? null,
    toma_equipo_id: body.toma_equipo_id ?? null,
    sucursal_id: body.sucursal_id ?? null,
    lineas: body.lineas ?? [],
    total: body.total ?? 0,
  }

  const { data, error } = await supabase
    .from("ajustes_clientes")
    .insert(insertData)
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
