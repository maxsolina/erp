import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const tecnico_id = searchParams.get("tecnico_id")
  const area_id = searchParams.get("area_id")

  let query = supabase
    .from("taller_ordenes_trabajo")
    .select(`
      *,
      taller_areas_reparacion(nombre),
      taller_tipos_ot(nombre, codigo),
      taller_equipos(nombre, marca, modelo),
      taller_fallas!taller_ordenes_trabajo_falla_principal_id_fkey(nombre),
      taller_categorias_reparacion(nombre),
      taller_tecnicos(nombre, tipo),
      taller_motivos_cierre(nombre)
    `)
    .order("fecha_creacion", { ascending: false })

  if (estado) query = query.eq("estado", estado)
  if (tecnico_id) query = query.eq("tecnico_id", tecnico_id)
  if (area_id) query = query.eq("area_id", area_id)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Generar número de OT
  const { data: numData, error: numErr } = await supabase.rpc("generar_numero_ot")
  if (numErr) return NextResponse.json({ error: numErr.message }, { status: 500 })

  // Calcular tiempo teórico
  const fallas_sec_ids = body.fallas_secundarias ?? []
  const { data: tiempoData } = await supabase.rpc("taller_calcular_tiempo_teorico", {
    p_equipo_id: body.equipo_id,
    p_falla_principal_id: body.falla_principal_id,
    p_fallas_secundarias: fallas_sec_ids,
  })

  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .insert([{
      numero: numData,
      sucursal_id: body.sucursal_id ?? null,
      area_id: body.area_id,
      tipo_ot_id: body.tipo_ot_id,
      tipo_tecnico: body.tipo_tecnico ?? null,
      cliente_id: body.cliente_id,
      categoria_cliente: body.categoria_cliente ?? null,
      celular_contacto: body.celular_contacto,
      factura_origen_id: body.factura_origen_id ?? null,
      ot_origen_id: body.ot_origen_id ?? null,
      equipo_id: body.equipo_id,
      falla_principal_id: body.falla_principal_id,
      categoria_reparacion_id: body.categoria_reparacion_id ?? null,
      imei: body.imei ?? null,
      serial_number: body.serial_number ?? null,
      codigo_desbloqueo: body.codigo_desbloqueo ?? null,
      ingresa_apagado: body.ingresa_apagado ?? false,
      ingresa_mojado: body.ingresa_mojado ?? false,
      deja_cargador: body.deja_cargador ?? false,
      requerido_mkt: body.requerido_mkt ?? false,
      presupuesto_estimado: body.presupuesto_estimado ?? null,
      descripcion: body.descripcion ?? null,
      tiempo_reparacion_teorico: tiempoData ?? 0,
      estado: "borrador",
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insertar fallas secundarias
  if (fallas_sec_ids.length && data) {
    const rows = fallas_sec_ids.map((fid: string) => ({
      ot_id: data.id,
      falla_id: fid,
    }))
    await supabase.from("taller_ot_fallas_secundarias").insert(rows)
  }

  // Registrar historial
  if (data) {
    await supabase.from("taller_ot_historial").insert([{
      ot_id: data.id,
      usuario: body.usuario ?? "Sistema",
      estado_anterior: null,
      estado_nuevo: "borrador",
      nota: "OT creada",
    }])
  }

  return NextResponse.json(data, { status: 201 })
}
