import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generarAsientoFacturaVenta } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"

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
  const clienteId = searchParams.get("cliente_id")
  const saldoMin = searchParams.get("saldo_min") // ej: "0" para facturas con saldo > 0
  const notaVentaId = searchParams.get("nota_venta_id")

  let query = supabase
    .from("facturas")
    .select(`
      *,
      facturas_lineas(*),
      facturas_vencimientos(*),
      factura_medios_pago(*, tarjeta:tarjeta_id(id, nombre, tipo))
    `)
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (id) query = query.eq("id", Number(id))
  else if (numero) query = query.eq("numero", numero)

  if (clienteId) query = query.eq("cliente_id", Number(clienteId))
  if (saldoMin !== null) query = query.gt("saldo", Number(saldoMin))
  if (notaVentaId) query = query.eq("nota_venta_id", Number(notaVentaId))

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
    tipo_cotizacion = "blue",
    cotizacion = 1,
    termino_pago,
    subtotal,
    descuento = 0,
    lineas = [],
  } = body

  // Modelo "todo en negro": al crear la factura no se calcula IVA. El IVA y los
  // recargos se generan al confirmar (POST /api/facturas/[id]/confirmar) según
  // los medios de pago elegidos. Por eso forzamos impuestos=0 y total=subtotal.
  const impuestos = 0
  const total = subtotal ?? 0
  const saldo  = total

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
        tipo_cotizacion,
        cotizacion,
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

  // Asiento "en negro": DEBE Deudores / HABER Ventas Mercadería (por subtotal).
  // No se discrimina IVA — eso se hace al confirmar con medios de pago.
  const asientoResult = await generarAsientoFacturaVenta(supabase, {
    id: facData.id,
    numero: facData.numero,
    fecha: (fecha ?? new Date().toISOString()).split("T")[0],
    cliente_id: cliente_id ?? null,
    cliente_nombre: cliente_nombre ?? null,
    sucursal: sucursal ?? null,
    subtotal,
    impuestos: 0,
    total,
    moneda,
    cotizacion: moneda && moneda !== "ARS" ? Number(cotizacion ?? 0) : null,
  })

  if (!asientoResult.ok) {
    console.error(`[CONTABILIDAD] Factura ${facData.numero} creada sin asiento: ${asientoResult.error}`)
    return NextResponse.json({
      ...facData,
      asiento_id: null,
      _advertencia_contable: asientoResult.error,
    })
  }

  // Vincular el asiento "negro" a la factura
  await supabase
    .from("facturas")
    .update({ asiento_id: asientoResult.asiento_id })
    .eq("id", facData.id)

  await registrarEvento(supabase, {
    tipo_documento: "factura",
    documento_id: facData.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Factura ${facData.numero}${cliente_nombre ? ` — ${cliente_nombre}` : ""}`,
  })

  return NextResponse.json({ ...facData, asiento_id: asientoResult.asiento_id })
}
