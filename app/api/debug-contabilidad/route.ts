import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/debug-contabilidad
 * Diagnóstico de la factory de asientos. NO inserta nada, solo verifica.
 */
export async function GET() {
  const supabase = getSupabase()
  const resultado: Record<string, unknown> = {}

  // 1. Leer mapeo
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo,
      diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "factura_venta")
    .eq("activo", true)

  resultado.mapeoError = mapeoErr?.message ?? null
  resultado.mapeo = mapeo ?? []
  resultado.mapeoOk = !mapeoErr && Array.isArray(mapeo) && mapeo.length > 0

  if (mapeoErr || !mapeo || mapeo.length === 0) {
    return NextResponse.json({ paso: "mapeo", ...resultado })
  }

  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))
  resultado.pm_deudores = pm["deudores"] ?? null
  resultado.pm_ventas   = pm["ventas"]   ?? null
  resultado.pm_iva      = pm["iva_debito"] ?? null
  resultado.diario_id   = pm["deudores"]?.diario_id ?? pm["ventas"]?.diario_id ?? null

  // 2. Verificar RPC periodo
  const fechaHoy = new Date().toISOString().split("T")[0]
  const { data: periodo_id, error: periodoErr } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaHoy })

  resultado.periodoError  = periodoErr?.message ?? null
  resultado.periodo_id    = periodo_id ?? null
  resultado.periodoOk     = !periodoErr

  // 3. Verificar RPC numero
  const diario_id = resultado.diario_id as string | null
  if (diario_id) {
    const { data: numero, error: numeroErr } = await supabase
      .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaHoy })

    resultado.numeroError = numeroErr?.message ?? null
    resultado.numero      = numero ?? null
    resultado.numeroOk    = !numeroErr
  } else {
    resultado.numeroError = "diario_id es null — no se puede generar número"
    resultado.numeroOk    = false
  }

  // 4. Verificar que el diario VTA existe
  const { data: diario, error: diarioErr } = await supabase
    .from("contabilidad_diarios")
    .select("id, codigo, nombre, tipo")
    .eq("codigo", "VTA")
    .maybeSingle()

  resultado.diarioVTA      = diario ?? null
  resultado.diarioVTAError = diarioErr?.message ?? null

  // 5. Contar asientos existentes
  const { count, error: countErr } = await supabase
    .from("contabilidad_asientos")
    .select("id", { count: "exact", head: true })

  resultado.totalAsientos      = count ?? 0
  resultado.totalAsientosError = countErr?.message ?? null

  // 6. Últimas 3 facturas y si tienen asiento
  const { data: facturas, error: facErr } = await supabase
    .from("facturas")
    .select("id, numero, total, created_at")
    .order("created_at", { ascending: false })
    .limit(3)

  resultado.ultimasFacturas      = facturas ?? []
  resultado.ultimasFacturasError = facErr?.message ?? null

  // 7. Test INSERT real de asiento (para verificar que el INSERT funciona)
  const testDiarioId = resultado.diario_id as string | null
  const testPeriodoId = resultado.periodo_id as string | null
  const testCuentaId = (resultado.pm_deudores as any)?.cuenta_debe?.id as string | null

  if (testDiarioId && testCuentaId) {
    const { data: testAsiento, error: testAsientoErr } = await supabase
      .from("contabilidad_asientos")
      .insert({
        numero:           "TEST-DEBUG-DELETE",
        diario_id:        testDiarioId,
        periodo_id:       testPeriodoId ?? null,
        fecha:            fechaHoy,
        concepto:         "TEST DEBUG - BORRAR",
        comprobante_tipo: "test",
        es_manual:        false,
        estado:           "publicado",
        moneda_original:  "ARS",
      })
      .select("id")
      .single()

    if (testAsientoErr) {
      resultado.testInsertAsientoError = testAsientoErr.message
      resultado.testInsertAsientoOk    = false
    } else {
      resultado.testInsertAsientoOk = true
      resultado.testInsertAsientoId = testAsiento.id

      // Test línea
      const { error: testLineaErr } = await supabase
        .from("contabilidad_asientos_lineas")
        .insert({
          asiento_id:    testAsiento.id,
          cuenta_id:     testCuentaId,
          cuenta_codigo: "11030101",
          cuenta_nombre: "TEST",
          debe:          100,
          haber:         0,
          orden:         0,
        })

      resultado.testInsertLineaError = testLineaErr?.message ?? null
      resultado.testInsertLineaOk    = !testLineaErr

      // Borrar el asiento de prueba
      await supabase.from("contabilidad_asientos").delete().eq("id", testAsiento.id)
      resultado.testInsertBorrado = true
    }
  } else {
    resultado.testInsertAsientoOk    = false
    resultado.testInsertAsientoError = "No hay diario_id o cuenta_id para probar"
  }

  return NextResponse.json(resultado)
}
