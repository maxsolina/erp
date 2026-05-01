import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabase()
  const body = await req.json()
  const id = Number(params.id)
  const { error } = await supabase
    .from("nc_categorias")
    .update({ nombre: body.nombre, activa: body.activa })
    .eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
