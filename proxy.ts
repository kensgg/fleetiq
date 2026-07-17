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

  // Guard: si no hay credenciales de Supabase, pasar el request sin tocar cookies
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protección de rutas ───────────────────────────────────────────────
  // Usuario NO autenticado intenta acceder al dashboard → redirigir a login
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado intenta acceder a login/register → redirigir al dashboard
  // COMENTADO: Evita un loop infinito si el perfil de DB fue borrado pero la sesión Auth sigue viva
  // if (user && (pathname === '/login' || pathname === '/register')) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url));
  // }

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
