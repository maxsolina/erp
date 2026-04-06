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
      sucursal_id,
      toma_equipo_id,
      toma_equipo_numero,
      cliente_id,
      cliente_nombre,
      tomas_equipo (
        modelo_equipo,
        precio_final,
        evaluacion
      )
    `)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mapear al formato Recepcion que espera modulo-compras-v2
  const mapped = (data ?? []).map((r: any) => ({
    id: r.id,
    numero: r.numero,
    fecha: r.fecha,
    sucursal: "",
    proveedor_id: r.cliente_id,
    proveedor_nombre: `${r.cliente_nombre} (toma de equipo)`,
    deposito_destino: "",
    deposito_destino_id: null,
    documento_origen_tipo: "toma_equipo" as const,
    documento_origen_id: r.toma_equipo_id,
    documento_origen_ref: r.toma_equipo_numero,
    observaciones: r.observaciones ?? "",
    estado: r.estado === "pendiente" ? "esperando_recepcion" : r.estado === "recibido" ? "recibida" : "cancelada",
    lineas: [
      {
        producto_id: 0,
        producto_nombre: r.tomas_equipo?.modelo_equipo ?? "Equipo",
        producto_sku: "",
        tiene_serie: true,
        requiere_color: false,
        requiere_bateria: true,
        requiere_outlet: false,
        requiere_observaciones: true,
        cantidad_pedida: 1,
        cantidad_recibida: r.estado === "recibido" ? 1 : 0,
        udm: "un",
        precio_unitario: r.tomas_equipo?.precio_final ?? 0,
        estado_linea: r.estado === "recibido" ? "recibido" : "pendiente",
        unidades_serie: [],
      },
    ],
  }))

  return NextResponse.json(mapped)
}
