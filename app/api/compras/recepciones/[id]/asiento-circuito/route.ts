import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoRecepcionCircuito } from "@/lib/contabilidad-asiento-factory"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
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

  // 4. Calcular total recibido (desde los items de la recepción)
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

  // 5. Generar asiento
  const resultado = await generarAsientoRecepcionCircuito(adminClient, {
    id:               rec.id,
    numero:           rec.numero,
    fecha:            rec.fecha ?? new Date().toISOString().split("T")[0],
    proveedor_nombre: rec.proveedor_nombre ?? null,
    sucursal:         rec.sucursal ?? null,
    total:            totalRecibido,
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
