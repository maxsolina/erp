/**
 * delete-extracto-3009.js
 * Borra el extracto 3009 y sus registros dependientes via Supabase REST API.
 * Uso: node scripts/delete-extracto-3009.js
 */
const SUPABASE_URL = "https://kzzosxnycphmoxzwpesm.supabase.co"
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6em9zeG55Y3BobW94endwZXNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2NTA1OCwiZXhwIjoyMDg5OTQxMDU4fQ.OjL-_HAEDpBGXG7FhzCqKsdcUCA5HuAfXzd-T-Rgbqc"

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  Prefer: "return=representation",
}

async function del(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method: "DELETE", headers })
  const text = await res.text()
  const data = text ? JSON.parse(text) : []
  if (!res.ok) { console.error(`✗ ${table}:`, data); return 0 }
  const n = Array.isArray(data) ? data.length : 1
  console.log(`✓ Eliminado de ${table}: ${n} registros`)
  return n
}

;(async () => {
  // Buscar extracto por numero parcial
  const target = "3011"
  const res = await fetch(`${SUPABASE_URL}/rest/v1/extractos_caja?numero=like.*${target}*&select=id,numero,estado,fecha_apertura`, { headers })
  const rows = await res.json()
  console.log("Extractos encontrados:", JSON.stringify(rows, null, 2))
  if (!rows || rows.length === 0) { console.log("No se encontr\u00f3 extracto con numero que contenga "+target); return }
  const uuid = rows[0].id
  console.log(`\nBorrando ${rows[0].numero} (${uuid})...\n`)
  await del("movimientos_caja",  `extracto_id=eq.${uuid}`)
  await del("extracto_saldos",   `extracto_id=eq.${uuid}`)
  await del("extractos_caja",    `id=eq.${uuid}`)
  console.log("\nExtracto eliminado correctamente.")
})()
