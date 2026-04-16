import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("facturas_compra")
    .select("numero")
    .like("numero", "FC-%")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  let siguiente = 1
  if (data?.numero) {
    const partes = data.numero.split("-")
    const ultimo = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(ultimo)) siguiente = ultimo + 1
  }

  const numero = `FC-${String(siguiente).padStart(7, "0")}`
  return NextResponse.json({ numero })
}
