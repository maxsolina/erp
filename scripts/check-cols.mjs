import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.cjs'
const s = createClient(
  'https://kzzosxnycphmoxzwpesm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6em9zeG55Y3BobW94endwZXNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2NTA1OCwiZXhwIjoyMDg5OTQxMDU4fQ.OjL-_HAEDpBGXG7FhzCqKsdcUCA5HuAfXzd-T-Rgbqc'
)

const tables = ['notas_venta', 'facturas', 'ordenes_entrega', 'remitos', 'senias_equipo']
for (const t of tables) {
  const { data, error } = await s.from(t).select().limit(1)
  if (error) { console.log(`${t}: ERROR - ${error.message}`); continue }
  if (data && data.length > 0) {
    console.log(`\n${t} columns:`, Object.keys(data[0]).join(', '))
  } else {
    console.log(`\n${t}: empty table`)
    // Try to get schema by inserting dummy
    const { error: e2 } = await s.from(t).insert({ __dummy_nonexistent_col__: 1 })
    if (e2) console.log(`  schema hint: ${e2.message}`)
  }
}
