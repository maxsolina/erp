import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const activo = searchParams.get("activo")

  let query = supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false })

  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%,email.ilike.%${busqueda}%`
    )
  }

  if (activo !== null && activo !== "") {
    query = query.eq("activo", activo === "true")
  }

  const { data, error } = await query

  if (error) {
    return dbError(error)
  }

  // Enriquecer con nombre de categoría — el front lo usa en NV form, ficha cliente, etc.
  const categoriaIds = [...new Set((data ?? []).map((c: any) => c.categoria_id).filter(Boolean))]
  let categoriasMap: Record<number, string> = {}
  if (categoriaIds.length > 0) {
    const { data: cats } = await supabase
      .from("categorias_cliente")
      .select("id, nombre")
      .in("id", categoriaIds)
    ;(cats ?? []).forEach((c: any) => { categoriasMap[c.id] = c.nombre })
  }
  const enriched = (data ?? []).map((c: any) => ({
    ...c,
    categoria_nombre: c.categoria_id ? categoriasMap[c.categoria_id] ?? null : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Si el body NO trae código, generarlo en el server con MAX(codigo) sobre la
  // tabla. El cálculo basado en .length() del front colisiona si hay códigos no
  // consecutivos. Reintentar hasta 5 veces si hay duplicate key (race condition).
  async function generarCodigo(): Promise<string> {
    const { data: ult } = await supabase
      .from("clientes")
      .select("codigo")
      .like("codigo", "C0%")
      .order("codigo", { ascending: false })
      .limit(1)
      .maybeSingle()
    const last = ult?.codigo
      ? parseInt(String(ult.codigo).replace(/\D/g, ""), 10) || 15517
      : 15517
    return `C0${String(last + 1).padStart(5, "0")}`
  }

  // Sanitizar FKs: si son 0 o inválidos enviar null para evitar FK violations
  const sanitizar = (b: any) => ({
    ...b,
    termino_pago_id: b.termino_pago_id && b.termino_pago_id > 0 ? b.termino_pago_id : null,
    vendedor_id: b.vendedor_id && b.vendedor_id > 0 ? b.vendedor_id : null,
    lista_precios_id: b.lista_precios_id && b.lista_precios_id > 0 ? b.lista_precios_id : null,
  })

  let payload = sanitizar(body)
  if (!payload.codigo) payload.codigo = await generarCodigo()

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("clientes")
      .insert([payload])
      .select()
      .single()

    if (!error) return NextResponse.json(data, { status: 201 })

    // Reintentar solo si es duplicate key sobre el código
    const isDup = error.message?.includes("duplicate key") && error.message?.includes("clientes_codigo_key")
    if (!isDup) return dbError(error)

    // Esperar un poco y regenerar el código
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100))
    payload = sanitizar({ ...body, codigo: await generarCodigo() })
  }

  return NextResponse.json(
    { error: "No se pudo generar un código único después de 5 intentos. Probá de nuevo." },
    { status: 500 }
  )
}
