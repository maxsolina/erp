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

  // Generar número correlativo según tipo
  const prefix = body.tipo === "nota_debito" ? "ND-A" : "NC-A"
  const { count } = await supabase
    .from("ajustes_clientes")
    .select("*", { count: "exact", head: true })
    .eq("tipo", body.tipo ?? "nota_credito")
  const seq = (count ?? 0) + 1
  const numero = `${prefix}-${String(seq).padStart(5, "0")}`

  const { data, error } = await supabase
    .from("ajustes_clientes")
    .insert({ ...body, numero })
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
