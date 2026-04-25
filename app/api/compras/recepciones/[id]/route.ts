import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabase.from("recepciones").update(body).eq("id", id).select().single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { error } = await supabase.from("recepciones").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ success: true })
}
