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

  // Obtener categoría del proveedor para cuenta_pagar_id
  let proveedor_categoria_id: number | null = null
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
      proveedor_categoria_id = cat?.id ?? null
    }
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

  // Marcar factura como publicada y guardar referencia al asiento
  await supabase
    .from("facturas_compra")
    .update({ estado: "pendiente", asiento_id: resultado.asiento_id })
    .eq("id", id)

  return NextResponse.json({ asiento_id: resultado.asiento_id })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Obtener la factura y su asiento
  const { data: factura, error: facErr } = await supabase
    .from("facturas_compra")
    .select("asiento_id, numero")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json(
      { error: "Factura de compra no encontrada" },
      { status: 404 }
    )
  }

  if (!factura.asiento_id) {
    return NextResponse.json(
      { error: "Esta factura no tiene asiento contable registrado." },
      { status: 422 }
    )
  }

  const resultado = await generarAsientoReversa(
    supabase,
    factura.asiento_id,
    `Anulación Factura Compra ${factura.numero ?? id}`
  )

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 422 })
  }

  // Revertir factura a borrador (limpia asiento_id para poder re-publicar)
  await supabase
    .from("facturas_compra")
    .update({ estado: "borrador", asiento_id: null })
    .eq("id", id)

  return NextResponse.json({ asiento_reversa_id: resultado.asiento_id })
}
