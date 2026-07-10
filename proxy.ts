import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy de Next.js a nivel de request (antes "middleware").
 *
 * Su única responsabilidad actual es refrescar la sesión de Supabase Auth
 * en cada request, manteniendo las cookies sincronizadas.
 *
 * Se ejecuta ANTES de que el request llegue al Route Handler o Server Component.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: No remover esta línea.
  // Provoca que Supabase refresque la sesión si el token está por expirar.
  // El resultado se descarta intencionalmente — el efecto secundario son las cookies.
  await supabase.auth.getUser();

  return supabaseResponse;
}

/**
 * Matcher: rutas donde se ejecuta el proxy.
 * Excluye archivos estáticos y assets de Next.js.
 */
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap.xml, robots.txt (archivos del root)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
