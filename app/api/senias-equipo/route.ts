import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar todas las señas
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("senias_equipo")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST — crear nueva seña + documentos vinculados en cascada
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    cliente_id,
    cliente_nombre,
    stock_item_id,
    equipo_nombre,
    equipo_imei,
    equipo_color,
    equipo_bateria,
    precio_venta,
    descuento,
    precio_final,
    fecha_limite,
    vendedor_id,
    sucursal_id,
    moneda = 'ARS',
    cotizacion = 1,
    lista_precios_id = null,
  } = body

  const errors: Record<string, string> = {}

  /** Parsea el numero correlativo de un comprobante de forma segura */
  const parseNum = (numero: string | null | undefined, fallback: number): number => {
    if (!numero) return fallback
    const n = parseInt(numero.replace(/\D/g, "").slice(-8), 10)
    return isNaN(n) || n < fallback ? fallback : n
  }

  // 1. Número de seña
  const { count } = await supabase
    .from("senias_equipo")
    .select("*", { count: "exact", head: true })
  const seq = (count ?? 0) + 1
  const numero = `SE-${String(seq).padStart(5, "0")}`

  // 2. Nota de Venta
  let nvNumero = ""
  let nvId: number | null = null
  const { data: lastNV } = await supabase
    .from("notas_venta")
    .select("numero")
    .like("numero", "NV X %")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  nvNumero = `NV X 10000-${String(parseNum(lastNV?.numero, 10000) + 1).padStart(8, "0")}`
  const { data: nvData, error: nvErr } = await supabase
    .from("notas_venta")
    .insert({
      numero: nvNumero,
      cliente_id,
      estado: "abierta",
      fecha: new Date().toISOString(),
      sucursal_id: sucursal_id ?? null,
      vendedor_id: vendedor_id ?? null,
      moneda,
      lista_precios_id: lista_precios_id ?? null,
      subtotal: precio_final,
      impuestos: 0,
      total: precio_final,
    })
    .select()
    .single()
  if (nvErr) errors.nv = nvErr.message
  else if (nvData) {
    nvId = nvData.id
    // Insertar línea del producto en la NV
    await supabase.from("notas_venta_lineas").insert({
      nota_venta_id: nvData.id,
      producto_id: stock_item_id ?? null,
      producto_nombre: equipo_nombre,
      descripcion: [equipo_color, equipo_imei ? `IMEI: ${equipo_imei}` : null, equipo_bateria ? `Bat: ${equipo_bateria}%` : null].filter(Boolean).join(" · ") || null,
      cantidad: 1,
      precio_unitario: precio_final,
      descuento: descuento ?? 0,
      subtotal: precio_final,
      iva: 0,
    })
  }

  // 3. Orden de Entrega
  let oeNumero = ""
  let oeId: number | null = null
  const { data: lastOE } = await supabase
    .from("ordenes_entrega")
    .select("numero")
    .not("numero", "ilike", "%NaN%")
    .like("numero", "OE X %")   // solo OEs con formato válido
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  oeNumero = `OE X 10000-${String(parseNum(lastOE?.numero, 1050) + 1).padStart(8, "0")}`
  const { data: oeData, error: oeErr } = await supabase
    .from("ordenes_entrega")
    .insert({
      numero: oeNumero,
      nota_venta_id: nvId,
      nota_venta_numero: nvNumero,
      cliente_id,
      cliente_nombre,
      estado: "confirmada",
      fecha: new Date().toISOString(),
      fecha_entrega_programada: new Date().toISOString(),
      tipo: "venta",
      deposito_origen: "",
      total_productos: 1,
      productos_entregados: 0,
      productos: [{ nombre: equipo_nombre, imei: equipo_imei, cantidad: 1, estado: "reservado" }],
      seguimiento: [],
    })
    .select()
    .single()
  if (oeErr) errors.oe = oeErr.message
  else if (oeData) oeId = oeData.id

  // 4. Insertar la seña (remito y factura se crean al confirmar cierre)
  const { data: senia, error: seniaErr } = await supabase
    .from("senias_equipo")
    .insert({
      numero,
      fecha: new Date().toISOString(),
      vendedor_id: vendedor_id ?? null,
      sucursal_id: sucursal_id ?? null,
      fecha_limite,
      estado: "en_curso",
      cliente_id,
      cliente_nombre,
      stock_item_id: stock_item_id ?? null,
      equipo_nombre,
      equipo_imei: equipo_imei ?? null,
      equipo_color: equipo_color ?? null,
      equipo_bateria: equipo_bateria ?? null,
      precio_venta,
      descuento: descuento ?? 0,
      precio_final,
      monto_senia: 0,
      estado_senia: "sin_senia",
      moneda,
      cotizacion,
      nota_venta_id: nvId,
      nota_venta_numero: nvNumero,
      oe_id: oeId,
      oe_numero: oeNumero,
      remito_id: null,
      remito_numero: null,
      factura_id: null,
      factura_numero: null,
      medios_pago_cierre: [],
      seguimiento: [{
        fecha: new Date().toISOString(),
        usuario: "Sistema",
        accion: "Seña creada",
        detalle: `Equipo: ${equipo_nombre}. Fecha límite: ${fecha_limite}`,
      }],
    })
    .select()
    .single()

  if (seniaErr) return NextResponse.json({ error: seniaErr.message }, { status: 500 })

  // 5. Reservar la unidad de stock específica (stock_item_id = id en stock_unidades)
  if (stock_item_id) {
    // Paso 5a: marcar estado = 'reservado' (columna siempre existente)
    const { error: reservaErr } = await supabase
      .from("stock_unidades")
      .update({ estado: "reservado" })
      .eq("id", stock_item_id)
      .eq("estado", "disponible") // solo si sigue disponible (idempotente)
    if (reservaErr) {
      console.error("[senias] reserva stock error:", reservaErr.message)
      errors.stock = reservaErr.message
    } else {
      // Paso 5b: vincular NV (columnas opcionales — script 064; error silencioso si no existen aún)
      await supabase
        .from("stock_unidades")
        .update({ nota_venta_id: nvId, nota_venta_numero: nvNumero })
        .eq("id", stock_item_id)
    }
  }

  return NextResponse.json({
    ok: true,
    id: senia.id,
    numero,
    nota_venta_id: nvId,
    nota_venta_numero: nvNumero,
    oe_id: oeId,
    oe_numero: oeNumero,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  })
}
