import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // 1. Buscar el número de recepción para buscar asientos por referencia
  const { data: recepcion } = await supabase
    .from("recepciones")
    .select("numero")
    .eq("id", id)
    .maybeSingle()

  if (!recepcion?.numero) {
    return NextResponse.json({ asientos: [] })
  }

  // 2. Obtener todos los asientos vinculados: el original (referencia = numero)
  //    y la reversa (referencia = 'ANULA ' + numero)
  const { data: asientos } = await supabase
    .from("contabilidad_asientos")
    .select("id, numero, fecha, concepto, estado, referencia, asiento_reversion_id")
    .in("referencia", [recepcion.numero, `ANULA ${recepcion.numero}`])
    .order("fecha", { ascending: true })

  if (!asientos || asientos.length === 0) {
    return NextResponse.json({ asientos: [] })
  }

  // 3. Obtener líneas de todos los asientos
  const asientoIds = asientos.map((a: any) => a.id)
  const { data: todasLineas } = await supabase
    .from("contabilidad_asientos_lineas")
    .select("id, asiento_id, cuenta_codigo, cuenta_nombre, debe, haber, descripcion")
    .in("asiento_id", asientoIds)
    .order("orden", { ascending: true })

  const lineasPorAsiento = (todasLineas ?? []).reduce((acc: Record<string, any[]>, l: any) => {
    if (!acc[l.asiento_id]) acc[l.asiento_id] = []
    acc[l.asiento_id].push(l)
    return acc
  }, {})

  const resultado = asientos.map((a: any) => ({
    ...a,
    lineas: lineasPorAsiento[a.id] ?? [],
  }))

  return NextResponse.json({ asientos: resultado })
}
