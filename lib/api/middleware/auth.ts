import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import type { UserProfile } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/**
 * Extiende el contexto del request con los datos del usuario autenticado.
 */
export interface AuthenticatedRequest {
  request: NextRequest;
  params: Promise<Record<string, string>>;
  user: UserProfile;
}

/**
 * Firma de un Route Handler protegido por autenticación.
 */
type AuthenticatedHandler = (
  ctx: AuthenticatedRequest,
) => Promise<Response> | Response;

/**
 * Firma estándar de un Route Handler de Next.js.
 */
type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

// ─────────────────────────────────────────────────────────────
// Middleware de autenticación
// ─────────────────────────────────────────────────────────────

/**
 * HOF que envuelve un Route Handler para requerir autenticación.
 *
 * 1. Verifica el token JWT de Supabase Auth (via cookies/header).
 * 2. Consulta la tabla `profiles` para obtener rol y sede del usuario.
 * 3. Si es válido, inyecta `user: UserProfile` en el handler.
 * 4. Si no, retorna 401.
 *
 * @example
 * // app/api/camiones/route.ts
 * import { withAuth } from '@/lib/api';
 *
 * export const GET = withAuth(async ({ request, user }) => {
 *   // `user` tiene id, rol, sede_id, nombre_completo, estado
 *   return successResponse({ sede: user.sede_id });
 * });
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (request, context) => {
    try {
      const supabase = await createClient();

      // Obtener el usuario autenticado desde la sesión
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return errorResponse('No autenticado. Token inválido o expirado.', 401);
      }

      // Obtener el perfil del usuario (rol, sede, estado)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, sede_id, nombre_completo, rol, estado')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        return errorResponse(
          'Perfil de usuario no encontrado. Contacta al administrador.',
          401,
        );
      }

      // Verificar que el usuario esté activo
      if (!profile.estado) {
        return errorResponse(
          'Tu cuenta está desactivada. Contacta al administrador.',
          403,
        );
      }

      // Ejecutar el handler con el contexto autenticado
      return await handler({
        request,
        params: context.params,
        user: profile as UserProfile,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
