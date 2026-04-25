import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/taller/ordenes/[id]/transicion
// Body: { nuevo_estado, usuario, nota?, motivo_cierre_id?, tecnico_id? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase.rpc("taller_transicionar_estado", {
    p_ot_id: id,
    p_nuevo_estado: body.nuevo_estado,
    p_usuario: body.usuario ?? "Sistema",
    p_nota: body.nota ?? null,
    p_motivo_cierre_id: body.motivo_cierre_id ?? null,
    p_tecnico_id: body.tecnico_id ?? null,
  })

  if (error) return dbError(error)

  const result = typeof data === "string" ? JSON.parse(data) : data
  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
