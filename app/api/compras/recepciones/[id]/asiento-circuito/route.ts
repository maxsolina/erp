import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoRecepcionCircuito } from "@/lib/contabilidad-asiento-factory"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  // Admin necesario: lee contabilidad_cotizaciones/monedas (RLS restrictivo cross-contexto)
  // y generarAsientoRecepcionCircuito inserta en contabilidad_asientos con service_role.
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la recepción
  const { data: rec, error: recErr } = await supabase
    .from("recepciones")
    .select("*")
    .eq("id", id)
    .single()

  if (recErr || !rec) return NextResponse.json({ error: "Recepción no encontrada" }, { status: 404 })

  // 2. Solo procesar recepciones confirmadas que vengan de una OC con circuito
  if (!rec.orden_compra_id && !rec.documento_origen_id) {
    return NextResponse.json({ error: "La recepción no está vinculada a una OC" }, { status: 400 })
  }

  // 3. Verificar que el proveedor tiene el circuito activado
  if (!rec.proveedor_id) {
    return NextResponse.json(
      { ok: false, skip: true, reason: "La recepción no tiene proveedor asignado" },
      { status: 200 }
    )
  }
  const { data: prov } = await supabase
    .from("proveedores")
    .select("aplica_circuito_compras")
    .eq("id", rec.proveedor_id)
    .maybeSingle()

  if (!prov?.aplica_circuito_compras) {
    return NextResponse.json(
      { ok: false, skip: true, reason: "El proveedor no tiene el circuito de compras activado" },
      { status: 200 }
    )
  }

  // 4. Calcular total recibido en moneda original (desde los items de la recepción)
  const items: any[] = Array.isArray(rec.items) ? rec.items : Array.isArray(rec.lineas) ? rec.lineas : []
  const totalRecibido = items.reduce(
    (s: number, l: any) => s + (l.cantidad_recibida ?? 0) * (l.precio_unitario ?? 0),
    0
  )

  if (totalRecibido <= 0) {
    return NextResponse.json(
      { error: "El total recibido debe ser mayor a 0 para generar el asiento" },
      { status: 400 }
    )
  }

  // 5. Obtener moneda y tipo_cotizacion de la OC vinculada
  const ocId = rec.orden_compra_id ?? rec.documento_origen_id
  const { data: oc } = await adminClient
    .from("ordenes_compra")
    .select("moneda, tipo_cotizacion")
    .eq("id", ocId)
    .maybeSingle()

  const monedaOC: string = oc?.moneda ?? "ARS"
  let tipoCambio = 1
  let tipoCotizacion: string | null = null

  if (monedaOC !== "ARS") {
    const fechaRec = (rec.fecha ?? new Date().toISOString()).split("T")[0]

    // Usar tipo_cotizacion de la OC; si no tiene, buscar el default de la moneda
    let tipoAUsar: string = oc?.tipo_cotizacion ?? ""

    if (!tipoAUsar) {
      const { data: monedaRow } = await adminClient
        .from("contabilidad_monedas")
        .select("id, tipo_cotizacion_defecto")
        .eq("codigo", monedaOC)
        .maybeSingle()
      if (!monedaRow) {
        return NextResponse.json(
          { error: `Moneda ${monedaOC} no configurada en el sistema contable.` },
          { status: 400 }
        )
      }
      tipoAUsar = monedaRow.tipo_cotizacion_defecto ?? "oficial"
    }

    tipoCotizacion = tipoAUsar

    // Buscar la cotización más reciente hasta la fecha de la recepción
    const { data: monedaRow } = await adminClient
      .from("contabilidad_monedas")
      .select("id")
      .eq("codigo", monedaOC)
      .maybeSingle()

    const { data: cotizacionRow } = await adminClient
      .from("contabilidad_cotizaciones")
      .select("tasa")
      .eq("moneda_id", monedaRow?.id)
      .eq("tipo", tipoCotizacion)
      .lte("fecha", fechaRec)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!cotizacionRow?.tasa) {
      return NextResponse.json(
        {
          error: `No se encontró cotización ${tipoCotizacion} de ${monedaOC} para la fecha ${fechaRec}. Cargue la cotización del día en Contabilidad → Monedas antes de generar el asiento.`,
        },
        { status: 400 }
      )
    }

    tipoCambio = Number(cotizacionRow.tasa)
  }

  // Total convertido a ARS (redondeo a 2 decimales)
  const totalARS = Math.round(totalRecibido * tipoCambio * 100) / 100

  // 6. Generar asiento
  const resultado = await generarAsientoRecepcionCircuito(adminClient, {
    id:               rec.id,
    numero:           rec.numero,
    fecha:            rec.fecha ?? new Date().toISOString().split("T")[0],
    proveedor_nombre: rec.proveedor_nombre ?? null,
    sucursal:         rec.sucursal ?? null,
    total:            totalARS,
    moneda:           monedaOC,
    tipo_cambio:      tipoCambio,
    tipo_cotizacion:  tipoCotizacion,
    total_moneda_original: monedaOC !== "ARS" ? totalRecibido : undefined,
  })

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 500 })
  }

  // 6. Guardar asiento_id en la recepción (si la columna existe; ignorar error si no)
  await supabase
    .from("recepciones")
    .update({ asiento_id: resultado.asiento_id } as any)
    .eq("id", id)

  return NextResponse.json({ asiento_id: resultado.asiento_id })
}
