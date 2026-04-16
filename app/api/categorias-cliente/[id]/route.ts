import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PUT — actualizar categoría de cliente
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const body = await req.json()
  const id = Number(params.id)

  const { error } = await supabase
    .from("categorias_cliente")
    .update({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lista_precios_defecto_id: body.lista_precios_defecto_id ?? null,
      cuenta_cobrar_id: body.cuenta_cobrar_id ?? null,
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
