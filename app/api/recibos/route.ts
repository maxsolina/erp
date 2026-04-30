import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  let query = supabase.from("recibos").select("*").order("created_at", { ascending: false })
  if (id) query = query.eq("id", id)
  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
