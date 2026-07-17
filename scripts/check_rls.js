const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Verificamos si existe el perfil directamente con el admin client (que ignora RLS)
  const userId = '47b88e14-168a-47bc-b720-89853b0fe058';
  
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (profileError) {
    console.log('Admin query: Profile not found:', profileError);
  } else {
    console.log('Admin query: Profile exists!', profile);
  }

  // Ahora intentamos hacer una query genérica para ver las políticas RLS
  // Como no podemos consultar pg_policies directo desde la API de rest de Supabase
  // podemos intentar ver si el RLS está bloqueando las lecturas haciendo una llamada al RPC si existe,
  // o simplemente confirmamos si el perfil existe con admin. Si existe, es 100% RLS.
}

main();
