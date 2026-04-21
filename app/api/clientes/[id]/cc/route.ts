import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/clientes/[id]/cc
 * Devuelve el saldo de cuenta corriente bimonetaria del cliente.
 * Calcula dinámicamente desde ventas_cc_movimientos.
 * Si la tabla no existe todavía, devuelve saldos en 0 sin error.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const clienteId = parseInt(params.id, 10)
  if (isNaN(clienteId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    // Saldo ARS
    const { data: arsData, error: arsError } = await supabase
      .from("ventas_cc_movimientos")
      .select("sentido, importe")
      .eq("cliente_id", clienteId)
      .eq("moneda", "ARS")

    // Saldo USD
    const { data: usdData, error: usdError } = await supabase
      .from("ventas_cc_movimientos")
      .select("sentido, importe")
      .eq("cliente_id", clienteId)
      .eq("moneda", "USD")

    // Si la tabla no existe aún (42P01), devolver 0s
    if (arsError?.code === "42P01" || usdError?.code === "42P01") {
      return NextResponse.json({ saldo_ars: 0, saldo_usd: 0 })
    }

    if (arsError) throw arsError
    if (usdError) throw usdError

    const calcSaldo = (rows: { sentido: string; importe: number }[]) =>
      (rows ?? []).reduce(
        (acc, r) => acc + (r.sentido === "debe" ? Number(r.importe) : -Number(r.importe)),
        0
      )

    const saldo_ars = calcSaldo(arsData ?? [])
    const saldo_usd = calcSaldo(usdData ?? [])

    // Tipo cotización del cliente (para mostrar en el UI)
    const { data: cliente } = await supabase
      .from("clientes")
      .select("tipo_cotizacion_usd")
      .eq("id", clienteId)
      .single()

    return NextResponse.json({
      saldo_ars,
      saldo_usd,
      tipo_cotizacion_usd: cliente?.tipo_cotizacion_usd ?? "blue",
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
