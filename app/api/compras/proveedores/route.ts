import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const estado = searchParams.get("estado") || ""

  let query = supabase
    .from("proveedores")
    .select("*")
    .order("id", { ascending: false })
    .range(0, 49999)

  if (busqueda) {
    query = query.or(
      `razon_social.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%,cuit.ilike.%${busqueda}%`
    )
  }
  if (estado) {
    query = query.eq("estado", estado)
  }

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data)
}

// Genera el próximo código "PROV-XXX" disponible buscando el MAX existente.
// Itera hasta `maxRetry` veces por si hay race conditions concurrentes.
async function generarCodigoProveedor(supabase: any, intento: number = 0): Promise<string> {
  const { data: ultimo } = await supabase
    .from("proveedores")
    .select("codigo")
    .like("codigo", "PROV-%")
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle()
  const num = ultimo?.codigo
    ? Number(String(ultimo.codigo).replace("PROV-", "")) || 0
    : 0
  // Si llamamos con `intento>0` (después de una colisión), sumamos para saltar.
  return `PROV-${String(num + 1 + intento).padStart(3, "0")}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Si el cliente mandó un código vacío o auto-generado, lo regeneramos.
  // Si mandó uno explícito (el usuario lo escribió), lo respetamos.
  const codigoOriginal = body.codigo
  const debeAutogenerar = !codigoOriginal || /^PROV-\d+$/.test(codigoOriginal)

  let intento = 0
  while (intento < 5) {
    const payload = { ...body }
    if (debeAutogenerar) {
      payload.codigo = await generarCodigoProveedor(supabase, intento)
    }
    const { data, error } = await supabase
      .from("proveedores")
      .insert([payload])
      .select()
      .single()

    if (!error) {
      await registrarEvento(supabase, {
        tipo_documento: "proveedor",
        documento_id: data.id,
        tipo_evento: "creacion",
        usuario: body.usuario ?? null,
        descripcion: `Proveedor ${data.codigo ?? ""} ${data.nombre ?? ""}`.trim(),
      })
      return NextResponse.json(data, { status: 201 })
    }

    // Si es violación de unique key y estamos autogenerando, retry con número +1
    const errStr = String(error?.message ?? "")
    const esColision = error?.code === "23505" || errStr.includes("duplicate key") || errStr.includes("unique constraint")
    if (esColision && debeAutogenerar) {
      intento++
      continue
    }
    return dbError(error)
  }

  return NextResponse.json(
    { error: "No se pudo generar un código único para el proveedor después de 5 intentos. Recargá la página e intentá de nuevo." },
    { status: 500 },
  )
}
