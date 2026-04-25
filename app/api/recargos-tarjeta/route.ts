import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/recargos-tarjeta?tarjeta_id=1&grupo_id=1
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)

  let query = supabase
    .from("recargos_tarjeta")
    .select("*")
    .eq("activo", true)
    .order("desde_cuota")

  const tarjetaId = searchParams.get("tarjeta_id")
  const grupoId = searchParams.get("grupo_id")
  if (tarjetaId) query = query.eq("tarjeta_id", tarjetaId)
  if (grupoId) query = query.eq("grupo_id", grupoId)

  const { data, error } = await query
  if (error) return dbError(error)

  const result = (data ?? []).map((r: any) => ({
    ...r,
    dias: {
      lun: r.dia_lun, mar: r.dia_mar, mie: r.dia_mie,
      jue: r.dia_jue, vie: r.dia_vie, sab: r.dia_sab, dom: r.dia_dom,
    },
  }))

  return NextResponse.json(result)
}
