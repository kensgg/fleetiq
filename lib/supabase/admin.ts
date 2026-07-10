import { createClient } from '@supabase/supabase-js';

/**
 * Cliente administrativo de Supabase.
 * Usa la clave `service_role` que bypasea Row Level Security (RLS).
 *
 * ⚠️  SOLO usar en código server-side (Route Handlers, Server Actions, scripts).
 * NUNCA exponer en el cliente.
 *
 * Se crea como singleton para evitar múltiples instancias.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
      'Revisa tu archivo .env.local.',
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
