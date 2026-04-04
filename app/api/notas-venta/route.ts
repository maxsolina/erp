import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar NVs
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get("numero")

  let query = supabase
    .from("notas_venta")
    .select("*, notas_venta_lineas(*)")
    .order("created_at", { ascending: false })

  if (numero) query = query.eq("numero", numero)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crear NV con sus líneas
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    numero,
    cliente_id,
    vendedor_id,
    sucursal_id,
    moneda,
    estado,
    total,
    notas,
    lineas = [],
  } = body

  if (!numero) {
    return NextResponse.json({ error: "numero es requerido" }, { status: 400 })
  }

  // Insertar cabecera de NV
  const { data: nv, error: nvErr } = await supabase
    .from("notas_venta")
    .insert({
      numero,
      cliente_id: cliente_id ?? null,
      vendedor_id: vendedor_id ?? null,
      sucursal_id: sucursal_id ?? null,
      moneda: moneda ?? "ARS",
      estado: estado ?? "abierta",
      total: Number(total ?? 0),
      notas: notas ?? null,
    })
    .select()
    .single()

  if (nvErr) return NextResponse.json({ error: nvErr.message }, { status: 500 })

  // Insertar líneas si las hay
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => {
      const cant = Number(l.cantidad ?? 1)
      const precio = Number(l.precio_unitario ?? 0)
      const desc = Number(l.descuento ?? 0)
      const sub = Number(l.subtotal ?? (cant * precio))
      return {
        nota_venta_id: nv.id,
        producto_id: l.producto_id ?? null,
        producto_nombre: String(l.producto_nombre ?? ""),
        descripcion: l.descripcion ?? null,
        cantidad: cant,
        precio_unitario: precio,
        descuento: desc,
        subtotal: isNaN(sub) ? 0 : sub,
      }
    })

    const { error: lineasErr } = await supabase
      .from("notas_venta_lineas")
      .insert(lineasInsert)

    if (lineasErr) {
      return NextResponse.json(
        { error: `NV creada (id:${nv.id}) pero error en líneas: ${lineasErr.message}` },
        { status: 207 }
      )
    }
  }

  return NextResponse.json({ ok: true, id: nv.id, numero: nv.numero })
}
