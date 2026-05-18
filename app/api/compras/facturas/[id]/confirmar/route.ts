import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"
import { generarAsientoFacturaCompra } from "@/lib/contabilidad-asiento-factory"

// Confirma una Factura de Compra en estado borrador:
// 1. Genera el asiento contable (DEBE Compras + IVA / HABER Acreedores)
// 2. Actualiza el estado a "pendiente" y guarda el asiento_id
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  // Admin necesario: contabilidad_asientos tiene RLS restrictivo
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas_compra")
    .select("*")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (factura.estado !== "borrador") {
    return NextResponse.json(
      { error: "Solo se puede confirmar una factura en estado borrador" },
      { status: 400 },
    )
  }

  // 2. Obtener líneas de detalle (para asiento cuenta por cuenta si las tiene)
  const { data: lineas } = await supabase
    .from("compras_facturas_lineas")
    .select("*")
    .eq("factura_id", id)
    .order("orden", { ascending: true })

  const lineasDetalle = (lineas ?? [])
    .filter((l: any) => l.cuenta_contable_id)
    .map((l: any) => ({
      cuenta_id: l.cuenta_contable_id,
      cuenta_codigo: l.cuenta_codigo ?? "",
      cuenta_nombre: l.cuenta_nombre ?? "",
      subtotal: Number(l.subtotal ?? 0),
    }))

  // 2b. Si la factura está en moneda extranjera sin cotización, intentar levantarla
  //     de contabilidad_cotizaciones (último valor para la moneda + tipo).
  const monedaFc = factura.moneda ?? "ARS"
  let cotizacionFc = Number(factura.cotizacion ?? 0)
  if (monedaFc !== "ARS" && (!cotizacionFc || cotizacionFc <= 0)) {
    const tipoCot = factura.tipo_cotizacion ?? "oficial"
    const { data: ultimaCot } = await supabase
      .from("contabilidad_cotizaciones")
      .select("tasa, contabilidad_monedas!inner(codigo)")
      .eq("contabilidad_monedas.codigo", monedaFc)
      .eq("tipo", tipoCot)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ultimaCot?.tasa) {
      cotizacionFc = Number(ultimaCot.tasa)
      await supabase.from("facturas_compra").update({ cotizacion: cotizacionFc }).eq("id", id)
    }
  }
  if (monedaFc !== "ARS" && (!cotizacionFc || cotizacionFc <= 0)) {
    return NextResponse.json(
      { error: `La factura está en ${monedaFc} pero no hay cotización cargada. Cargá una en Contabilidad → Cotizaciones para ${monedaFc}/${factura.tipo_cotizacion ?? "oficial"}.` },
      { status: 400 },
    )
  }

  // 3. Obtener categoría del proveedor para el mapeo de cuenta acreedora
  let proveedorCategoriaId: string | number | null = null
  if (factura.proveedor_id) {
    const { data: prov } = await supabase
      .from("proveedores")
      .select("categoria_proveedor")
      .eq("id", factura.proveedor_id)
      .maybeSingle()
    if (prov?.categoria_proveedor) {
      const { data: cat } = await supabase
        .from("categorias_proveedor")
        .select("id")
        .eq("nombre", prov.categoria_proveedor)
        .maybeSingle()
      proveedorCategoriaId = cat?.id ?? null
    }
  }

  // 4. Generar asiento contable
  const resultado = await generarAsientoFacturaCompra(adminClient, {
    id: factura.id,
    numero: factura.numero,
    fecha: factura.fecha,
    proveedor_id: factura.proveedor_id,
    proveedor_nombre: factura.proveedor_nombre,
    proveedor_categoria_id: proveedorCategoriaId,
    sucursal: factura.sucursal ?? null,
    subtotal: Number(factura.subtotal ?? 0),
    impuestos: Number(factura.impuestos ?? 0),
    total: Number(factura.total ?? 0),
    moneda: monedaFc,
    cotizacion: cotizacionFc || null,
    lineas_detalle: lineasDetalle.length > 0 ? lineasDetalle : undefined,
  })

  if (!resultado.ok) {
    return NextResponse.json(
      { error: `Error al generar asiento: ${resultado.error}` },
      { status: 500 },
    )
  }

  // 5. Actualizar factura → estado pendiente + asiento_id
  const { data: facturaActualizada, error: updErr } = await supabase
    .from("facturas_compra")
    .update({
      estado: "pendiente",
      asiento_id: resultado.asiento_id,
      saldo: Number(factura.total ?? 0),
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) {
    return NextResponse.json(
      { error: `Asiento generado pero falló al actualizar factura: ${updErr.message}` },
      { status: 500 },
    )
  }

  await registrarEvento(supabase, {
    tipo_documento: "factura_compra",
    documento_id: factura.id,
    tipo_evento: "cambio_estado",
    valor_anterior: "borrador",
    valor_nuevo: "pendiente",
    usuario: null,
  })

  return NextResponse.json({
    factura: facturaActualizada,
    asiento_id: resultado.asiento_id,
  })
}
