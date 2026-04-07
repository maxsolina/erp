// Script para verificar acceso a Supabase
const projectRef = 'kzzosxnycphmoxzwpesm';
const supabaseUrl = `https://${projectRef}.supabase.co`;

console.log('🔍 Verificando acceso a Supabase...');
console.log(`📍 Project URL: ${supabaseUrl}`);
console.log(`📍 Project Ref: ${projectRef}`);

// Intentamos obtener información del proyecto
fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})
.then(response => {
  console.log(`\n✅ Conexión establecida`);
  console.log(`📊 Status: ${response.status}`);
  return response.json();
})
.then(data => {
  console.log(`\n✅ Datos recibidos:`, JSON.stringify(data, null, 2));
})
.catch(error => {
  console.log(`\n❌ Error: ${error.message}`);
  console.log(`\nPara acceso completo necesito las credenciales de Supabase:`);
  console.log(`  - NEXT_PUBLIC_SUPABASE_URL`);
  console.log(`  - NEXT_PUBLIC_SUPABASE_ANON_KEY`);
});
