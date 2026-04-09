// Script para ejecutar SQL de cajas via Supabase Management API
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  // Ejecutar las statements una por una via la API de queries
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'public' }
  })

  const statements = [
    // Tabla cajas
    `CREATE TABLE IF NOT EXISTS cajas (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      codigo VARCHAR(20),
      sucursal VARCHAR(50) NOT NULL,
      cierre_diario_obligatorio BOOLEAN DEFAULT true,
      no_valida_cierre_sabados BOOLEAN DEFAULT false,
      no_valida_cierre_domingos BOOLEAN DEFAULT false,
      no_valida_cierre_feriados BOOLEAN DEFAULT false,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    // Tabla caja_valores
    `CREATE TABLE IF NOT EXISTS caja_valores (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
      codigo VARCHAR(20) NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('efectivo', 'banco_cheques')),
      moneda VARCHAR(10) DEFAULT 'ARS',
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    // Tabla caja_usuarios
    `CREATE TABLE IF NOT EXISTS caja_usuarios (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
      usuario_id UUID,
      usuario_nombre VARCHAR(100),
      es_cobrador BOOLEAN DEFAULT false,
      es_vendedor BOOLEAN DEFAULT false,
      para_transferencias BOOLEAN DEFAULT false
    )`,
    // Tabla caja_bancos_permitidos
    `CREATE TABLE IF NOT EXISTS caja_bancos_permitidos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
      banco_nombre VARCHAR(100) NOT NULL,
      codigo VARCHAR(20),
      tipo VARCHAR(30) DEFAULT 'banco_cheques',
      moneda VARCHAR(10) DEFAULT 'ARS'
    )`,
  ]

  // Use raw SQL endpoint
  const projectRef = 'kzzosxnycphmoxzwpesm'
  const allSQL = statements.join(';\n') + ';'

  // Try the SQL API 
  const resp = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: allSQL }),
  })

  if (resp.ok) {
    console.log('Tables created via pg/query!')
    await seedData(supabase)
    return
  }

  console.log('pg/query not available:', resp.status)
  
  // Fallback: try the migrate endpoint approach
  const migrateResp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const tables = await migrateResp.json()
  console.log('Available tables check...')
  
  // Check if the project has a migrate endpoint
  const appMigrateResp = await fetch('http://localhost:3000/api/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: allSQL }),
  })

  if (appMigrateResp.ok) {
    const result = await appMigrateResp.json()
    console.log('Tables created via /api/migrate!', result)
    await seedData(supabase)
  } else {
    console.log('migrate status:', appMigrateResp.status, await appMigrateResp.text())
    console.log('\n=== MANUAL ACTION NEEDED ===')
    console.log('Please run the SQL in scripts/create-cajas.sql in the Supabase SQL Editor')
    console.log('URL: https://supabase.com/dashboard/project/kzzosxnycphmoxzwpesm/sql')
  }
}

async function seedData(supabase) {
  // Check if already seeded
  const { data: existing } = await supabase.from('cajas').select('id').limit(1)
  if (existing && existing.length > 0) {
    console.log('Cajas already seeded, skipping...')
    return
  }

  const cajasData = [
    { nombre: 'CC- Caja fuerte', codigo: 'CF', sucursal: 'Casa Central', cierre_diario_obligatorio: true },
    { nombre: 'CC- Recepcion', codigo: 'REC', sucursal: 'Casa Central', cierre_diario_obligatorio: true },
    { nombre: 'CC- Adm', codigo: 'ADM', sucursal: 'Casa Central', cierre_diario_obligatorio: true },
    { nombre: 'CC- Transferencias', codigo: 'TRF', sucursal: 'Casa Central', cierre_diario_obligatorio: false },
    { nombre: 'PN- Caja fuerte', codigo: 'PNCF', sucursal: 'Puerto Norte', cierre_diario_obligatorio: true },
    { nombre: 'PN- Invitados', codigo: 'PNINV', sucursal: 'Puerto Norte', cierre_diario_obligatorio: true },
    { nombre: 'CS- Caja fuerte', codigo: 'CSCF', sucursal: 'Casilda', cierre_diario_obligatorio: true },
    { nombre: 'CS- Recepcion', codigo: 'CSREC', sucursal: 'Casilda', cierre_diario_obligatorio: true },
  ]

  const { data: cajas, error } = await supabase.from('cajas').insert(cajasData).select()
  if (error) { console.log('Seed error:', error.message); return }
  console.log(`Inserted ${cajas.length} cajas`)

  const cfCaja = cajas.find(c => c.nombre === 'CC- Caja fuerte')
  if (cfCaja) {
    const { error: vErr } = await supabase.from('caja_valores').insert([
      { caja_id: cfCaja.id, codigo: 'CHCCF', nombre: 'Cheques de Terceros - CC Caja fuerte', tipo: 'banco_cheques', moneda: 'ARS' },
      { caja_id: cfCaja.id, codigo: 'EFE00-CF', nombre: 'Efectivo - CF', tipo: 'efectivo', moneda: 'ARS' },
      { caja_id: cfCaja.id, codigo: 'USDCF', nombre: 'Dólares - CF', tipo: 'efectivo', moneda: 'USD' },
    ])
    if (vErr) console.log('Valores seed error:', vErr.message)
    else console.log('Inserted 3 valores for CC- Caja fuerte')
  }
}

run().catch(e => console.error(e))
