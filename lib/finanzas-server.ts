// Helpers compartidos para endpoints de Finanzas (server-side).
//
// Las operaciones tipo "publicar/confirmar" sobre Depósitos, Extracciones,
// Transferencias, Conversiones, Ajustes Caja, etc. requieren:
//   - Verificar que la caja tenga un extracto en estado "abierto".
//   - Verificar que la caja tenga un valor (caja_valores) en la moneda/tipo
//     necesario antes de meter el movimiento.
// Acá centralizamos esas validaciones para no duplicarlas por endpoint.

import { SupabaseClient } from "@supabase/supabase-js"

export interface ExtractoCheckResult {
  ok: true
  extractoId: string
}

export interface ExtractoCheckError {
  ok: false
  error: string
}

/** Devuelve `{ ok, extractoId }` si la caja tiene un extracto abierto. */
export async function getExtractoAbierto(
  supabase: SupabaseClient,
  cajaId: string,
  cajaNombre?: string,
): Promise<ExtractoCheckResult | ExtractoCheckError> {
  const { data: extracto } = await supabase
    .from("extractos_caja")
    .select("id")
    .eq("caja_id", cajaId)
    .eq("estado", "abierto")
    .maybeSingle()
  if (!extracto) {
    return { ok: false, error: `No hay extracto abierto para la caja${cajaNombre ? ` "${cajaNombre}"` : ""}.` }
  }
  return { ok: true, extractoId: (extracto as { id: string }).id }
}

export interface ValorCheckResult {
  ok: true
  valorId: string
  valorNombre: string
}

export interface ValorCheckError {
  ok: false
  error: string
}

/** Verifica que una caja tenga un caja_valor activo en `moneda` + `tipo`. */
export async function getValorEnCaja(
  supabase: SupabaseClient,
  cajaId: string,
  moneda: string,
  tipo: string,
): Promise<ValorCheckResult | ValorCheckError> {
  const { data } = await supabase
    .from("caja_valores")
    .select("id, nombre")
    .eq("caja_id", cajaId)
    .eq("moneda", moneda)
    .eq("tipo", tipo)
    .eq("activo", true)
    .maybeSingle()
  if (!data) {
    return {
      ok: false,
      error: `La caja no tiene un valor en ${moneda} de tipo ${tipo}. Configuralo en Configuración → Cajas → Valores Permitidos.`,
    }
  }
  const v = data as { id: string; nombre: string }
  return { ok: true, valorId: v.id, valorNombre: v.nombre }
}

/**
 * Genera la grilla de cuotas de un préstamo según el sistema de amortización.
 * Sistemas soportados:
 *  - frances: cuota fija (capital + interés varían).
 *  - aleman: capital constante, interés decreciente.
 *  - americano: solo interés cada cuota; capital al final.
 *  - bullet: capital + intereses acumulados al final.
 */
export interface CuotaGenerada {
  prestamo_id: string
  numero_cuota: number
  fecha_vencimiento: string
  capital: number
  interes: number
  iva: number
  percepciones: number
  total: number
  saldo: number
  estado: "pendiente"
  fecha_pago: null
}

export function generarCuotasPrestamo(input: {
  prestamo_id: string
  capital: number
  tasa_porcentaje: number
  cantidad_cuotas: number
  fecha_primera_cuota: string
  sistema_amortizacion: string
}): CuotaGenerada[] {
  const { prestamo_id, capital, tasa_porcentaje, cantidad_cuotas, fecha_primera_cuota, sistema_amortizacion } = input
  const cuotas: CuotaGenerada[] = []
  const tasaMensual = (tasa_porcentaje || 0) / 100 / 12
  let saldoCapital = capital
  let fechaCuota = new Date(fecha_primera_cuota)

  for (let i = 1; i <= cantidad_cuotas; i++) {
    let capitalCuota = 0
    let interesCuota = 0
    let totalCuota = 0

    switch (sistema_amortizacion) {
      case "frances": {
        const cuotaFija = tasaMensual > 0
          ? capital * (tasaMensual * Math.pow(1 + tasaMensual, cantidad_cuotas)) /
            (Math.pow(1 + tasaMensual, cantidad_cuotas) - 1)
          : capital / cantidad_cuotas
        interesCuota = saldoCapital * tasaMensual
        capitalCuota = cuotaFija - interesCuota
        totalCuota = cuotaFija
        break
      }
      case "aleman":
        capitalCuota = capital / cantidad_cuotas
        interesCuota = saldoCapital * tasaMensual
        totalCuota = capitalCuota + interesCuota
        break
      case "americano":
        interesCuota = capital * tasaMensual
        capitalCuota = i === cantidad_cuotas ? capital : 0
        totalCuota = capitalCuota + interesCuota
        break
      case "bullet":
        capitalCuota = i === cantidad_cuotas ? capital : 0
        interesCuota = i === cantidad_cuotas ? capital * tasaMensual * cantidad_cuotas : 0
        totalCuota = capitalCuota + interesCuota
        break
    }

    saldoCapital -= capitalCuota
    cuotas.push({
      prestamo_id,
      numero_cuota: i,
      fecha_vencimiento: fechaCuota.toISOString().split("T")[0],
      capital: Math.round(capitalCuota * 100) / 100,
      interes: Math.round(interesCuota * 100) / 100,
      iva: 0,
      percepciones: 0,
      total: Math.round(totalCuota * 100) / 100,
      saldo: Math.round(Math.max(saldoCapital, 0) * 100) / 100,
      estado: "pendiente",
      fecha_pago: null,
    })

    fechaCuota = new Date(fechaCuota)
    const mesesAvance = sistema_amortizacion === "bullet" ? 0 : 1
    fechaCuota.setMonth(fechaCuota.getMonth() + (mesesAvance || 1))
  }
  return cuotas
}
