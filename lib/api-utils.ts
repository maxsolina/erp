import { NextResponse } from "next/server"

export function apiError(msg: string, status: number): NextResponse {
  return NextResponse.json({ error: msg }, { status })
}

export function dbError(err: unknown, status = 500): NextResponse {
  console.error("[db error]", err)
  return NextResponse.json({ error: "Error interno del servidor" }, { status })
}
