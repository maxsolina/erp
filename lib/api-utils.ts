import { NextResponse } from "next/server"

export function apiError(msg: string, status: number): NextResponse {
  return NextResponse.json({ error: msg }, { status })
}

export function dbError(err: unknown, status = 500): NextResponse {
  console.error("[db error]", err)
  const detail =
    err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : null
  return NextResponse.json({
    error: detail ?? "Error interno del servidor",
    detail,
  }, { status })
}
