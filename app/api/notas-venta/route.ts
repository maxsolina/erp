import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar NVs con sus líneas (dos queries separadas, sin FK PostgREST)
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get("numero")

  // 1. Cabeceras
  let nvQuery = supabase
    .from("notas_venta")
    .select("*")
    .order("created_at", { ascending: false })
  if (numero) nvQuery = nvQuery.eq("numero", numero)

  const { data: nvs, error: nvErr } = await nvQuery
  if (nvErr) return NextResponse.json({ error: nvErr.message }, { status: 500 })
  if (!nvs || nvs.length === 0) return NextResponse.json([])

  // 2. Líneas de todas las NVs
  const nvIds = nvs.map((n: any) => n.id)
  const { data: lineas, error: lineasErr } = await supabase
    .from("notas_venta_lineas")
    .select("*")
    .in("nota_venta_id", nvIds)

  if (lineasErr) return NextResponse.json({ error: lineasErr.message }, { status: 500 })

  // 3. Enriquecer con datos de clientes
  const clienteIds = [...new Set(nvs.map((n: any) => n.cliente_id).filter(Boolean))]
  let clientesMap: Record<number, any> = {}
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nombre, codigo")
      .in("id", clienteIds)
    ;(clientes ?? []).forEach((c: any) => { clientesMap[c.id] = c })
  }

  // 4. Combinar líneas
  const lineasPorNV: Record<number, any[]> = {}
  ;(lineas ?? []).forEach((l: any) => {
    if (!lineasPorNV[l.nota_venta_id]) lineasPorNV[l.nota_venta_id] = []
    lineasPorNV[l.nota_venta_id].push(l)
  })

  const result = nvs.map((nv: any) => ({
    ...nv,
    cliente_nombre: clientesMap[nv.cliente_id]?.nombre ?? nv.cliente_nombre ?? "",
    cliente_codigo: clientesMap[nv.cliente_id]?.codigo ?? "",
    notas_venta_lineas: lineasPorNV[nv.id] ?? [],
  }))

  return NextResponse.json(result)
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

  // Mapear estado al enum válido de Supabase
  const ESTADOS_VALIDOS = ["abierta", "facturada", "cancelada", "parcial"]
  const estadoNormalizado = ESTADOS_VALIDOS.includes(estado) ? estado : "abierta"

  // Insertar cabecera de NV
  const { data: nv, error: nvErr } = await supabase
    .from("notas_venta")
    .insert({
      numero,
      cliente_id: cliente_id ?? null,
      vendedor_id: vendedor_id ?? null,
      sucursal_id: sucursal_id ?? null,
      moneda: moneda ?? "ARS",
      estado: estadoNormalizado,
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
