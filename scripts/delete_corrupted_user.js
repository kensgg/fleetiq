const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase credentials');
}

const admin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const userId = '082b12d5-e344-4205-9f18-18b1d7836594';
  
  const { data, error } = await admin.auth.admin.deleteUser(userId);
  
  if (error) {
    console.error('Error deleting user:', error);
  } else {
    console.log('User deleted successfully');
  }
}

main();
