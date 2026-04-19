import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  generarAsientoFacturaCompra,
  generarAsientoReversa,
} from "@/lib/contabilidad-asiento-factory"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Obtener la factura de compra
  const { data: factura, error: facErr } = await supabase
    .from("facturas_compra")
    .select("*")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json(
      { error: "Factura de compra no encontrada" },
      { status: 404 }
    )
  }

  // Obtener categoría del proveedor — obligatorio para publicar
  let proveedor_categoria_id: string | null = null
  if (factura.proveedor_id) {
    const { data: prov, error: provErr } = await supabase
      .from("proveedores")
      .select("categoria_proveedor")
      .eq("id", factura.proveedor_id)
      .maybeSingle()

    if (provErr) {
      return NextResponse.json(
        { error: "No se pudo obtener los datos del proveedor." },
        { status: 500 }
      )
    }

    if (!prov?.categoria_proveedor) {
      return NextResponse.json(
        { error: `El proveedor "${factura.proveedor_nombre ?? factura.proveedor_id}" no tiene categoría asignada. Asigne una categoría antes de publicar la factura.` },
        { status: 422 }
      )
    }

    const { data: cat } = await supabase
      .from("categorias_proveedor")
      .select("id")
      .eq("nombre", prov.categoria_proveedor)
      .maybeSingle()

    if (!cat?.id) {
      return NextResponse.json(
        { error: `La categoría "${prov.categoria_proveedor}" del proveedor no existe en el sistema. Verifique la configuración.` },
        { status: 422 }
      )
    }

    proveedor_categoria_id = cat.id
  }

  // Obtener líneas de detalle de la factura (cuenta contable por línea)
  const { data: lineasDB } = await supabase
    .from("compras_facturas_lineas")
    .select("cuenta_contable_id, cuenta_codigo, cuenta_nombre, cantidad, precio_unitario, descuento_pct")
    .eq("factura_id", factura.id)
    .order("orden", { ascending: true })

  const lineas_detalle = (lineasDB ?? []).map((l: any) => ({
    cuenta_id:    l.cuenta_contable_id ?? null,
    cuenta_codigo: l.cuenta_codigo ?? "",
    cuenta_nombre: l.cuenta_nombre ?? "",
    subtotal:     Number(l.cantidad) * Number(l.precio_unitario) * (1 - Number(l.descuento_pct ?? 0) / 100),
  })).filter((l: any) => l.subtotal !== 0)

  const resultado = await generarAsientoFacturaCompra(supabase, {
    id: factura.id,
    numero: factura.numero ?? String(factura.id),
    fecha: factura.fecha ?? factura.created_at,
    proveedor_id: factura.proveedor_id ?? null,
    proveedor_nombre: factura.proveedor_nombre ?? null,
    proveedor_categoria_id,
    sucursal: factura.sucursal ?? null,
    subtotal: Number(factura.subtotal ?? 0),
    impuestos: Number(factura.impuestos ?? 0),
    total: Number(factura.total ?? 0),
    moneda: factura.moneda ?? "ARS",
    lineas_detalle,
  })

  // Log de debug para diagnóstico
  console.log("[asiento/route] proveedor_id:", factura.proveedor_id, "proveedor_categoria_id:", proveedor_categoria_id, "resultado:", resultado)

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error },
      { status: 422 }
    )
  }

  // Marcar factura como publicada (intentar también guardar asiento_id si la columna existe)
  const updatePayload: Record<string, unknown> = { estado: "pendiente" }
  try { updatePayload.asiento_id = resultado.asiento_id } catch { /* columna puede no existir */ }

  const { error: updErr } = await supabase
    .from("facturas_compra")
    .update(updatePayload)
    .eq("id", id)

  if (updErr) {
    // Reintentar solo con estado (por si asiento_id no existe en schema)
    await supabase.from("facturas_compra").update({ estado: "pendiente" }).eq("id", id)
  }

  return NextResponse.json({ asiento_id: resultado.asiento_id })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Obtener número de factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas_compra")
    .select("numero")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json(
      { error: "Factura de compra no encontrada" },
      { status: 404 }
    )
  }

  // Buscar asiento publicado por comprobante_tipo + referencia (número de factura)
  const { data: asientoExistente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "factura_compra")
    .eq("referencia", factura.numero)
    .eq("estado", "publicado")
    .maybeSingle()

  if (!asientoExistente) {
    return NextResponse.json(
      { error: "Esta factura no tiene asiento contable publicado." },
      { status: 422 }
    )
  }

  const resultado = await generarAsientoReversa(
    supabase,
    asientoExistente.id,
    `Anulación Factura Compra ${factura.numero ?? id}`
  )

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 422 })
  }

  // Marcar factura como cancelada
  const { error: revertErr } = await supabase
    .from("facturas_compra")
    .update({ estado: "cancelada" })
    .eq("id", id)

  if (revertErr) {
    await supabase.from("facturas_compra").update({ estado: "cancelada" }).eq("id", id)
  }

  return NextResponse.json({ asiento_reversa_id: resultado.asiento_id })
}
