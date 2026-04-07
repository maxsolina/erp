import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recepciones_toma")
    .select(`
      id,
      numero,
      fecha,
      estado,
      observaciones,
      imei,
      color,
      bateria_pct,
      outlet,
      sucursal_id,
      ubicacion_id,
      toma_equipo_id,
      toma_equipo_numero,
      cliente_id,
      cliente_nombre,
      tomas_equipo (
        modelo_equipo,
        precio_final,
        evaluacion,
        producto_id
      )
    `)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolver ubicaciones y depósitos
  const ubicacionIds = [...new Set((data ?? []).map((r: any) => r.ubicacion_id).filter(Boolean))]
  const sucursalIds  = [...new Set((data ?? []).map((r: any) => r.sucursal_id).filter(Boolean))]

  const ubicacionesMap: Record<number, any> = {}
  const depositosMap:   Record<number, any> = {}
  const sucursalesMap:  Record<number, any> = {}

  if (ubicacionIds.length > 0) {
    const { data: ubicaciones } = await supabase
      .from("ubicaciones")
      .select("id, nombre, codigo, deposito_id")
      .in("id", ubicacionIds)
    for (const u of ubicaciones ?? []) ubicacionesMap[u.id] = u

    const depositoIds = [...new Set((ubicaciones ?? []).map((u: any) => u.deposito_id).filter(Boolean))]
    if (depositoIds.length > 0) {
      const { data: depositos } = await supabase
        .from("depositos")
        .select("id, nombre, codigo")
        .in("id", depositoIds)
      for (const d of depositos ?? []) depositosMap[d.id] = d
    }
  }

  if (sucursalIds.length > 0) {
    const { data: sucursales } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .in("id", sucursalIds)
    for (const s of sucursales ?? []) sucursalesMap[s.id] = s
  }

  // Mapear al formato Recepcion que espera modulo-compras-v2
  const mapped = (data ?? []).map((r: any) => {
    const ubicacion = r.ubicacion_id ? ubicacionesMap[r.ubicacion_id] : null
    const deposito  = ubicacion?.deposito_id ? depositosMap[ubicacion.deposito_id] : null
    const sucursal  = r.sucursal_id ? sucursalesMap[r.sucursal_id] : null

    return {
      id: r.id,
      numero: r.numero,
      fecha: r.fecha,
      sucursal: sucursal?.nombre ?? "",
      sucursal_id: r.sucursal_id,
      proveedor_id: r.cliente_id,
      proveedor_nombre: `${r.cliente_nombre} (toma de equipo)`,
      deposito_destino: deposito?.nombre ?? "",
      deposito_destino_id: deposito?.id ?? null,
      ubicacion_destino: ubicacion?.nombre ?? "",
      ubicacion_destino_id: r.ubicacion_id ?? null,
      ubicacion: ubicacion?.nombre ?? "",
      documento_origen_tipo: "toma_equipo" as const,
      documento_origen_id: r.toma_equipo_id,
      documento_origen_ref: r.toma_equipo_numero,
      observaciones: r.observaciones ?? "",
      estado: r.estado === "pendiente" ? "esperando_recepcion" : r.estado === "recibido" ? "recibida" : "cancelada",
      lineas: [
        {
          producto_id: r.tomas_equipo?.producto_id ?? 0,
          producto_nombre: r.tomas_equipo?.modelo_equipo ?? "Equipo",
          producto_sku: "",
          tiene_serie: true,
          requiere_color: true,
          requiere_bateria: true,
          requiere_outlet: true,
          requiere_observaciones: true,
          cantidad_pedida: 1,
          cantidad_recibida: r.estado === "recibido" ? 1 : 0,
          udm: "un",
          precio_unitario: r.tomas_equipo?.precio_final ?? 0,
          estado_linea: r.estado === "recibido" ? "recibido" : "pendiente",
          unidades_serie: r.estado === "recibido" && r.imei ? [{
            nro_serie: r.imei,
            color: r.color,
            bateria_pct: r.bateria_pct,
            outlet: r.outlet,
          }] : [],
        },
      ],
    }
  })

  return NextResponse.json(mapped)
}
