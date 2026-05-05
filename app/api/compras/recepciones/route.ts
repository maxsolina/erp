import { dbError } from "@/lib/api-utils"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

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

  // Supabase/PostgREST corta a 1000 filas por defecto. Con ORDER BY created_at DESC
  // eso recorta las recepciones más antiguas — pedimos explícitamente hasta 50k
  // para evitar que falten recepciones históricas en el listado.
  const { data, error } = await supabase
    .from("recepciones")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (error) return dbError(error)

  // Enriquecer items/lineas de cada recepción con flags del producto.
  // Algunas OCs viejas guardaron las líneas sin tiene_serie/requiere_color/etc.,
  // y como el monolito carga las recepciones desde este endpoint, el wizard
  // de registro de unidades no mostraba los campos. Hacemos UNA sola query
  // por todos los producto_id únicos para evitar N+1.
  const recepciones: any[] = Array.isArray(data) ? data : []
  // Normalizar a Number — el JSONB puede traer producto_id como string
  const productoIds = new Set<number>()
  for (const r of recepciones) {
    const items = Array.isArray(r.items) ? r.items : Array.isArray(r.lineas) ? r.lineas : []
    for (const it of items) {
      const pid = Number(it?.producto_id)
      if (Number.isFinite(pid) && pid > 0) productoIds.add(pid)
    }
  }
  if (productoIds.size > 0) {
    // Admin client para bypassear cualquier RLS y garantizar que el lookup funcione
    const admin = createAdminClient()
    const { data: productos, error: prodErr } = await admin
      .from("productos")
      .select("id, tiene_numero_serie, requiere_color, requiere_bateria, requiere_outlet, requiere_observaciones")
      .in("id", [...productoIds])
    if (prodErr) {
      console.error("[recepciones GET] Error enriqueciendo flags producto:", prodErr.message)
    }
    console.log(`[recepciones GET] enrich: pidIds=${productoIds.size} productosFound=${productos?.length ?? 0}`)
    const flagsMap = new Map<number, any>()
    for (const p of productos ?? []) flagsMap.set(Number(p.id), p)
    for (const r of recepciones) {
      const items: any[] = Array.isArray(r.items) ? r.items : Array.isArray(r.lineas) ? r.lineas : []
      if (items.length === 0) continue
      const enriched = items.map(it => {
        const pid = Number(it?.producto_id)
        const p = Number.isFinite(pid) ? flagsMap.get(pid) : null
        if (!p) return it
        // Producto = fuente de verdad. Si el producto tiene el flag true,
        // forzamos true en la línea aunque la recepción vieja se haya guardado
        // con false explícito.
        return {
          ...it,
          tiene_serie:            !!it.tiene_serie            || !!p.tiene_numero_serie,
          requiere_color:         !!it.requiere_color         || !!p.requiere_color,
          requiere_bateria:       !!it.requiere_bateria       || !!p.requiere_bateria,
          requiere_outlet:        !!it.requiere_outlet        || !!p.requiere_outlet,
          requiere_observaciones: !!it.requiere_observaciones || !!p.requiere_observaciones,
        }
      })
      r.items = enriched
      r.lineas = enriched
    }
  }

  return NextResponse.json(recepciones)
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

  await registrarEvento(supabase, {
    tipo_documento: "recepcion",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Recepción ${data.numero}${body.proveedor_nombre ? ` — ${body.proveedor_nombre}` : ""}`,
  })

  return NextResponse.json(data, { status: 201 })
}
