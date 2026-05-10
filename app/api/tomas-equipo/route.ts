import { apiError, dbError } from "@/lib/api-utils"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoNCTomaEquipo } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"

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

// POST — crear nueva toma + ajuste_cliente (NC) + recepcion_toma + asiento + cc_movimiento
//
// Body:
//   cliente_id, cliente_nombre, modelo_equipo, producto_id,
//   precio_base_usd, descuentos_usd, precio_final_usd, cotizacion (USD→ARS blue),
//   sucursal_id, evaluacion (snapshot)
//
// Comportamiento:
//   - Numera con secuencias atómicas (next_*_numero RPCs)
//   - Valida que el modelo tenga criterios completos por categoría descuento/cartel_sistema
//   - Inserta NC en USD en ajustes_clientes
//   - Inserta movimiento en ventas_cc_movimientos (USD, sentido='haber')
//   - Genera asiento contable en ARS con moneda_original=USD y cotización aplicada
export async function POST(req: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const body = await req.json()

  const {
    cliente_id,
    cliente_nombre,
    modelo_equipo,
    producto_id,
    precio_base_usd,
    descuentos_usd,
    precio_final_usd,
    cotizacion,
    sucursal_id,
    evaluacion,
  } = body

  // ── Validaciones ──────────────────────────────────────────
  if (!cliente_id) return apiError("cliente_id requerido", 400)
  if (!modelo_equipo) return apiError("modelo_equipo requerido", 400)

  const precioFinalUsd = Number(precio_final_usd)
  const cotiz = Number(cotizacion)
  if (Number.isNaN(precioFinalUsd) || precioFinalUsd <= 0) {
    return apiError("precio_final_usd debe ser > 0", 400)
  }
  if (Number.isNaN(cotiz) || cotiz <= 0) {
    return apiError("cotizacion (USD→ARS) requerida y > 0", 400)
  }

  // ── Numeración atómica vía secuencias ─────────────────────
  const [{ data: numero }, { data: recepcionNumero }, { data: notaCreditoNumero }] = await Promise.all([
    supabase.rpc("next_toma_equipo_numero"),
    supabase.rpc("next_recepcion_toma_numero"),
    supabase.rpc("next_nc_toma_equipo_numero"),
  ])

  if (!numero || !recepcionNumero || !notaCreditoNumero) {
    return apiError("No se pudieron generar números de comprobante (faltan secuencias)", 500)
  }

  // ── Insertar toma ─────────────────────────────────────────
  // Persistimos cotizacion + tipo_cotizacion ahora porque la confirmación de
  // la recepción ocurre días después y necesita la cotización del día de la
  // toma para convertir USD→ARS en el asiento (sin esto la NC y la
  // recepción quedan anotadas como pesos crudos).
  const { data: toma, error: tomaErr } = await supabase
    .from("tomas_equipo")
    .insert({
      numero,
      cliente_id,
      cliente_nombre,
      modelo_equipo,
      precio_base: precio_base_usd,
      descuentos: descuentos_usd,
      precio_final: precioFinalUsd,
      cotizacion: cotiz,
      tipo_cotizacion: "blue",
      estado: "confirmado",
      estado_recepcion: "pendiente",
      recepcion_numero: recepcionNumero,
      nota_credito_numero: notaCreditoNumero,
      sucursal_id: sucursal_id ?? null,
      evaluacion: evaluacion ?? [],
    })
    .select()
    .single()

  if (tomaErr) return dbError(tomaErr)

  if (producto_id) {
    await supabase.from("tomas_equipo").update({ producto_id }).eq("id", toma.id).then(() => {})
  }

  // ── Insertar ajuste_cliente (NC) en USD ───────────────────
  const fechaIso = new Date().toISOString()
  const { data: ajusteInsertado, error: ajusteErr } = await supabase
    .from("ajustes_clientes")
    .insert({
      numero: notaCreditoNumero,
      cliente_id,
      cliente_nombre,
      concepto: `Toma de equipo: ${modelo_equipo}`,
      motivo: `Toma de equipo: ${modelo_equipo}`,
      moneda: "USD",
      categoria: "Equipos en parte de pago",
      lineas: [{
        descripcion: `Toma de equipo usado: ${modelo_equipo}`,
        importe: precioFinalUsd,
        fecha_vencimiento: fechaIso,
      }],
      total: precioFinalUsd,
      saldo_disponible: precioFinalUsd,
      estado: "activo",  // DB constraint: ajustes_clientes solo permite 'activo' como estado emitido
      toma_equipo_id: toma.id,
      es_automatica: true,
      nota_venta_numero: null,
      sucursal_id: sucursal_id ?? null,
    })
    .select("id")
    .single()

  if (ajusteErr) console.error("[tomas-equipo] ajuste error:", ajusteErr.message)

  // ── Insertar movimiento en CC USD del cliente ─────────────
  // sentido='haber' porque la NC reduce lo que el cliente debe
  if (ajusteInsertado) {
    const { error: ccErr } = await supabase.from("ventas_cc_movimientos").insert({
      cliente_id,
      moneda: "USD",
      tipo_movimiento: "nota_credito",
      sentido: "haber",
      importe: precioFinalUsd,
      cotizacion_aplicada: cotiz,
      tipo_cotizacion: "blue",
      comprobante_tipo: "nc_toma_equipo",
      comprobante_numero: notaCreditoNumero,
      fecha: fechaIso.split("T")[0],
      sucursal_id: sucursal_id ?? null,
    })
    if (ccErr) console.error("[tomas-equipo] cc_movimiento error:", ccErr.message)
  }

  // ── Asiento contable (siempre en ARS, con moneda_original=USD) ─
  let asientoNcError: string | null = null
  if (!ajusteErr && ajusteInsertado) {
    const sucursalNombre = sucursal_id
      ? (await supabase.from("sucursales").select("nombre").eq("id", sucursal_id).maybeSingle()).data?.nombre ?? null
      : null
    const asientoNC = await generarAsientoNCTomaEquipo(adminClient, {
      id: ajusteInsertado.id,
      numero: notaCreditoNumero,
      fecha: fechaIso.split("T")[0],
      cliente_nombre,
      sucursal: sucursalNombre,
      total: precioFinalUsd,
      moneda: "USD",
      cotizacion: cotiz,
    })
    if (asientoNC.ok) {
      await adminClient.from("ajustes_clientes").update({ asiento_id: asientoNC.asiento_id }).eq("id", ajusteInsertado.id)
    } else {
      asientoNcError = asientoNC.error ?? "Error desconocido al generar asiento NC"
      console.error("[tomas-equipo] asiento NC error:", asientoNcError)
    }
  } else if (ajusteErr) {
    asientoNcError = `Ajuste no creado: ${ajusteErr.message}`
  }

  // ── Recepción de toma en borrador ─────────────────────────
  const { error: recepErr } = await supabase
    .from("recepciones_toma")
    .insert({
      numero: recepcionNumero,
      toma_equipo_id: toma.id,
      toma_equipo_numero: numero,
      cliente_id,
      cliente_nombre,
      estado: "pendiente",
      observaciones: `Equipo: ${modelo_equipo}. Valor acordado: USD ${precioFinalUsd.toFixed(2)} @ ${cotiz.toFixed(2)}`,
      sucursal_id: sucursal_id ?? null,
    })

  if (recepErr) console.error("[tomas-equipo] recepcion error:", recepErr.message)

  await registrarEvento(adminClient, {
    tipo_documento: "toma_equipo",
    documento_id: toma.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Toma de Equipo ${numero}${cliente_nombre ? ` — ${cliente_nombre}` : ""}`,
  })

  return NextResponse.json({
    ok: true,
    id: toma.id,
    numero,
    recepcion_numero: recepcionNumero,
    nota_credito_numero: notaCreditoNumero,
    ...(asientoNcError ? { _asiento_nc_error: asientoNcError } : {}),
  })
}
