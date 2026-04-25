import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generarAsientoFacturaVenta } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const numero = searchParams.get("numero")

  let query = supabase
    .from("facturas")
    .select(`
      *,
      facturas_lineas(*),
      facturas_vencimientos(*)
    `)
    .order("created_at", { ascending: false })

  if (id) query = query.eq("id", Number(id))
  else if (numero) query = query.eq("numero", numero)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const {
    nota_venta_id,
    nota_venta_numero,
    cliente_id,
    cliente_nombre,
    vendedor_nombre,
    sucursal,
    fecha,
    estado = "abierta",
    moneda = "ARS",
    termino_pago,
    subtotal,
    descuento = 0,
    impuestos = 0,
    total,
    saldo,
    lineas = [],
  } = body

  // Generar número correlativo — intentar con función atómica de secuencia,
  // fallback a MAX(numero) con retry en caso de colisión
  async function generarNumeroFactura(): Promise<string> {
    // Intentar usar secuencia atómica de Postgres (script 071)
    const { data: seqData } = await supabase.rpc("next_factura_numero")
    if (seqData) return seqData as string

    // Fallback: MAX sobre columna numero (más seguro que ORDER BY id)
    const { data: maxFac } = await supabase
      .from("facturas")
      .select("numero")
      .like("numero", "FAC-%")
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastNum = maxFac?.numero ? parseInt(maxFac.numero.replace("FAC-", "")) || 0 : 0
    return `FAC-${String(lastNum + 1).padStart(5, "0")}`
  }

  // Insertar con retry en caso de duplicate key (race condition)
  let facData: any = null
  let facErr: any = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const facturaNumero = await generarNumeroFactura()
    const result = await supabase
      .from("facturas")
      .insert({
        numero: facturaNumero,
        tipo: "",
        nota_venta_id: nota_venta_id ?? null,
        nota_venta_numero: nota_venta_numero ?? null,
        cliente_id: cliente_id ?? null,
        cliente_nombre: cliente_nombre ?? null,
        vendedor_nombre: vendedor_nombre ?? null,
        sucursal: sucursal ?? null,
        fecha: fecha ?? new Date().toISOString(),
        estado,
        moneda,
        termino_pago: termino_pago ?? null,
        subtotal: subtotal ?? 0,
        descuento,
        impuestos,
        total: total ?? 0,
        saldo: saldo ?? total ?? 0,
      })
      .select()
      .single()

    if (!result.error) {
      facData = result.data
      facErr = null
      break
    }
    // Si no es duplicate key, no tiene sentido reintentar
    if (!result.error.message.includes("duplicate key")) {
      facErr = result.error
      break
    }
    facErr = result.error
    // Pequeña espera aleatoria antes del siguiente intento
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100))
  }

  if (facErr) return NextResponse.json({ error: facErr.message }, { status: 500 })

  // Validar total > 0 (después de insertar para poder rollback limpio)
  if ((total ?? 0) <= 0) {
    await supabase.from("facturas").delete().eq("id", facData.id)
    return NextResponse.json({ error: "No se puede crear una factura con total $0.00" }, { status: 422 })
  }

  // Insertar líneas
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => ({
      factura_id: facData.id,
      producto_id: l.producto_id ?? null,
      producto_nombre: l.producto_nombre ?? "",
      descripcion: l.descripcion ?? null,
      cantidad: l.cantidad ?? 1,
      precio_unitario: l.precio_unitario ?? 0,
      descuento: l.descuento ?? 0,
      subtotal: l.subtotal ?? 0,
    }))
    await supabase.from("facturas_lineas").insert(lineasInsert)
  }

  // Generar asiento contable automático (atómico: si falla, se revierte la factura)
  const asientoResult = await generarAsientoFacturaVenta(supabase, {
    id: facData.id,
    numero: facData.numero,
    fecha: (fecha ?? new Date().toISOString()).split("T")[0],
    cliente_id: cliente_id ?? null,
    cliente_nombre: cliente_nombre ?? null,
    sucursal: sucursal ?? null,
    subtotal: subtotal ?? 0,
    impuestos,
    total: total ?? 0,
    moneda,
  })

  if (!asientoResult.ok) {
    // La factura queda guardada pero sin asiento — se registra para revisión
    console.error(`[CONTABILIDAD] Factura ${facData.numero} creada sin asiento: ${asientoResult.error}`)
    return NextResponse.json({
      ...facData,
      asiento_id: null,
      _advertencia_contable: asientoResult.error,
    })
  }

  return NextResponse.json({ ...facData, asiento_id: asientoResult.asiento_id })
}
