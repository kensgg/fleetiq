import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea un cliente de Supabase para uso en Server Components, Route Handlers
 * y Server Actions. Gestiona la sesión a través de cookies de Next.js.
 *
 * IMPORTANTE: Esta función es async porque `cookies()` es async en Next.js 16.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` puede fallar en Server Components (solo lectura).
            // Esto es seguro ignorar si el middleware de refresh de sesión
            // está configurado correctamente.
          }
        },
      },
    },
  );
}
