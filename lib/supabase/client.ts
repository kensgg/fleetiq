'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Crea un cliente de Supabase para uso en componentes del lado del cliente.
 * Usa las claves públicas (anon key) — seguras para el navegador.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
