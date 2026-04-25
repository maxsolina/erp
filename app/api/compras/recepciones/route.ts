import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // ?siguiente_numero=1 → devuelve el próximo número REC disponible
  if (searchParams.get("siguiente_numero") === "1") {
    const { data, error } = await supabase
      .from("recepciones")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1)
    if (error) return dbError(error)
    const ultimo = data?.[0]?.numero ?? "REC-00000"
    const match = ultimo.match(/REC-(\d+)/)
    const siguiente = match ? Number(match[1]) + 1 : 1
    return NextResponse.json({ siguiente_numero: String(siguiente).padStart(5, "0") })
  }

  const { data, error } = await supabase
    .from("recepciones")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Si no viene número, generarlo atómicamente en el servidor para evitar race conditions
  if (!body.numero) {
    const { data: ultimaRec } = await supabase
      .from("recepciones")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1)
    const ultimo = ultimaRec?.[0]?.numero ?? "REC-00000"
    const match = ultimo.match(/REC-(\d+)/)
    const siguiente = match ? Number(match[1]) + 1 : 1
    body.numero = `REC-${String(siguiente).padStart(5, "0")}`
  }

  const { data, error } = await supabase
    .from("recepciones")
    .insert([body])
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
