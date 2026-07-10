import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withAuth, type AuthenticatedRequest } from './auth';
import type { RolUsuario } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Middleware de autorización por rol
// ─────────────────────────────────────────────────────────────

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

/**
 * HOF que combina autenticación + autorización por rol.
 *
 * Primero autentica al usuario (via `withAuth`), luego verifica que su rol
 * esté dentro de los roles permitidos. Si no, retorna 403.
 *
 * @param allowedRoles - Lista de roles que tienen acceso al endpoint.
 * @returns Un wrapper que se aplica al Route Handler.
 *
 * @example
 * // Solo administradores y gerentes
 * export const DELETE = withRole(
 *   'administrador',
 *   'gerente_operaciones',
 * )(async ({ request, user }) => {
 *   // user.rol está garantizado ser 'administrador' o 'gerente_operaciones'
 *   return successResponse(null, 'Eliminado');
 * });
 *
 * @example
 * // Todos los roles autenticados
 * export const GET = withRole(
 *   'administrador',
 *   'gerente_operaciones',
 *   'supervisor',
 *   'conductor',
 *   'capturista',
 * )(async ({ request, user }) => {
 *   return successResponse({ perfil: user });
 * });
 */
export function withRole(
  ...allowedRoles: RolUsuario[]
): (handler: AuthenticatedHandler) => RouteHandler {
  return (handler: AuthenticatedHandler): RouteHandler => {
    // Reutiliza withAuth para la autenticación, luego agrega la capa de roles
    return withAuth(async (ctx) => {
      try {
        if (!allowedRoles.includes(ctx.user.rol)) {
          return errorResponse(
            `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`,
            403,
          );
        }

        return await handler(ctx);
      } catch (error) {
        return handleApiError(error);
      }
    });
  };
}
