import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/** Endpoint de diagnóstico para el flujo de asiento de factura de compra.
 *  GET /api/debug-factura/[id]
 *  Retorna toda la información relevante sin modificar datos.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // 1. Factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas_compra")
    .select("id, numero, proveedor_id, proveedor_nombre, estado, asiento_id")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada", facErr }, { status: 404 })
  }

  // 2. Proveedor
  const { data: prov, error: provErr } = await supabase
    .from("proveedores")
    .select("id, nombre_completo, razon_social, categoria_proveedor")
    .eq("id", factura.proveedor_id)
    .maybeSingle()

  // 3. Categoría por nombre exacto
  const { data: catExacta, error: catErr } = prov?.categoria_proveedor
    ? await supabase
        .from("categorias_proveedor")
        .select("id, nombre, cuenta_pagar_id")
        .eq("nombre", prov.categoria_proveedor)
        .maybeSingle()
    : { data: null, error: null }

  // 4. Todas las categorías (para comparar nombres)
  const { data: todasCats } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre, cuenta_pagar_id")
    .order("nombre")

  // 5. Cuenta contable de la categoría (si hay ID)
  const { data: cuenta } = catExacta?.cuenta_pagar_id
    ? await supabase
        .from("contabilidad_plan_cuentas")
        .select("id, codigo, nombre")
        .eq("id", catExacta.cuenta_pagar_id)
        .maybeSingle()
    : { data: null }

  // 6. Asientos existentes para esta factura
  const { data: asientos } = await supabase
    .from("contabilidad_asientos")
    .select("id, numero, estado, referencia")
    .eq("referencia", factura.numero)
    .eq("comprobante_tipo", "factura_compra")

  return NextResponse.json({
    factura,
    proveedor: prov ?? { error: provErr?.message ?? "No encontrado" },
    categoria_por_nombre_exacto: catExacta ?? { error: catErr?.message ?? "No encontrada — el nombre no matchea" },
    cuenta_contable: cuenta ?? null,
    asientos_existentes: asientos ?? [],
    categorias_disponibles: (todasCats ?? []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      tiene_cuenta_pagar: !!c.cuenta_pagar_id,
      nombre_igual_prov: c.nombre === prov?.categoria_proveedor,
    })),
  })
}
