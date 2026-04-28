import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// In-memory sliding window rate limiter (20 req/min per IP, per worker).
// No Upstash available — state is per-worker-instance.
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, number[]>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMITED_METHODS = new Set(["POST", "PUT", "DELETE"])
const RATE_LIMITED_PREFIXES = ["/api/compras", "/api/recibos"]

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => t > windowStart)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const retryAfterMs = timestamps[0] + RATE_LIMIT_WINDOW_MS - now
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) }
  }

  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return { allowed: true, retryAfterSec: 0 }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Apply rate limiting only to mutating methods under target prefixes
  if (
    RATE_LIMITED_METHODS.has(method) &&
    RATE_LIMITED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown"

    const { allowed, retryAfterSec } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      )
    }
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: ["/api/((?!auth/).*)"],
}
