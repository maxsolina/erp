import { dbError } from "@/lib/api-utils"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoNCTomaEquipo } from "@/lib/contabilidad-asiento-factory"

// GET — listar todas las tomas
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tomas_equipo")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST — crear nueva toma + ajuste_cliente + recepcion_toma
export async function POST(req: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const body = await req.json()

  const {
    cliente_id,
    cliente_nombre,
    modelo_equipo,
    producto_id,
    precio_base,
    descuentos,
    precio_final,
    sucursal_id,
    evaluacion,
  } = body

  // 1. Generar número de toma
  const { count } = await supabase
    .from("tomas_equipo")
    .select("*", { count: "exact", head: true })
  const seq = (count ?? 0) + 1
  const numero = `TE-${String(seq).padStart(5, "0")}`
  const recepcionNumero = `REC-TE-${String(seq).padStart(5, "0")}`
  const notaCreditoNumero = `NC-A-${String(seq).padStart(5, "0")}`

  // 2. Insertar toma
  const { data: toma, error: tomaErr } = await supabase
    .from("tomas_equipo")
    .insert({
      numero,
      cliente_id,
      cliente_nombre,
      modelo_equipo,
      precio_base,
      descuentos,
      precio_final,
      estado: "confirmado",
      estado_recepcion: "pendiente",
      recepcion_numero: recepcionNumero,
      nota_credito_numero: notaCreditoNumero,
      sucursal_id: sucursal_id ?? null,
      evaluacion: evaluacion ?? [],
    })
    .select()
    .single()

  if (tomaErr) return NextResponse.json({ error: tomaErr.message }, { status: 500 })

  // Guardar producto_id si la columna ya existe (migración opcional)
  if (producto_id) {
    await supabase
      .from("tomas_equipo")
      .update({ producto_id })
      .eq("id", toma.id)
      .then(() => {}) // ignorar error si columna no existe todavía
  }

  // 3. Insertar ajuste de cliente (nota de crédito) — es_automatica = true
  const { data: ajusteInsertado, error: ajusteErr } = await supabase
    .from("ajustes_clientes")
    .insert({
      numero: notaCreditoNumero,
      cliente_id,
      cliente_nombre,
      concepto: `Toma de equipo: ${modelo_equipo}`,
      motivo: `Toma de equipo: ${modelo_equipo}`,
      moneda: "ARS",
      categoria: "Equipos en parte de pago",
      lineas: [{
        descripcion: `Toma de equipo usado: ${modelo_equipo}`,
        importe: precio_final,
        fecha_vencimiento: new Date().toISOString(),
      }],
      total: precio_final,
      estado: "activo",
      toma_equipo_id: toma.id,
      es_automatica: true,
      nota_venta_numero: null,
      sucursal_id: sucursal_id ?? null,
    })
    .select("id")
    .single()

  if (ajusteErr) console.error("[tomas-equipo] ajuste error:", ajusteErr.message)

  // 4. Generar asiento contable de la NC
  let asientoNcError: string | null = null
  if (!ajusteErr && ajusteInsertado) {
    const sucursalNombre = sucursal_id
      ? (await supabase.from("sucursales").select("nombre").eq("id", sucursal_id).maybeSingle()).data?.nombre ?? null
      : null
    const asientoNC = await generarAsientoNCTomaEquipo(adminClient, {
      id: ajusteInsertado.id,
      numero: notaCreditoNumero,
      fecha: new Date().toISOString().split("T")[0],
      cliente_nombre,
      sucursal: sucursalNombre,
      total: precio_final,
    })
    if (asientoNC.ok) {
      await adminClient
        .from("ajustes_clientes")
        .update({ asiento_id: asientoNC.asiento_id })
        .eq("id", ajusteInsertado.id)
    } else {
      asientoNcError = asientoNC.error ?? "Error desconocido al generar asiento NC"
      console.error("[tomas-equipo] asiento NC error:", asientoNcError)
    }
  } else if (ajusteErr) {
    asientoNcError = `Ajuste no creado: ${ajusteErr.message}`
  }

  // 5. Insertar recepción de toma en borrador
  const { error: recepErr } = await supabase
    .from("recepciones_toma")
    .insert({
      numero: recepcionNumero,
      toma_equipo_id: toma.id,
      toma_equipo_numero: numero,
      cliente_id,
      cliente_nombre,
      estado: "pendiente",  // se confirma cuando el equipo llega físicamente con su nro de serie
      observaciones: `Equipo: ${modelo_equipo}. Valor acordado: $${precio_final.toLocaleString("es-AR")}`,
      sucursal_id: sucursal_id ?? null,
    })

  if (recepErr) console.error("[tomas-equipo] recepcion error:", recepErr.message)

  return NextResponse.json({
    ok: true,
    id: toma.id,
    numero,
    recepcion_numero: recepcionNumero,
    nota_credito_numero: notaCreditoNumero,
    ...(asientoNcError ? { _asiento_nc_error: asientoNcError } : {}),
  })
}
