import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/api/middleware/auth';

// ─────────────────────────────────────────────────────────────
// GET /api/notificaciones/no-leidas — Contar notificaciones no leídas
// ─────────────────────────────────────────────────────────────

/**
 * Retorna el conteo de notificaciones no leídas del usuario.
 * Útil para mostrar badges en el header/sidebar del dashboard.
 *
 * Respuesta: { count: number }
 */
export const GET = withAuth(async ({ user }) => {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('leida', false);

    if (error) {
      return errorResponse(`Error al contar notificaciones: ${error.message}`, 500);
    }

    return successResponse(
      { count: count ?? 0 },
      'Conteo de notificaciones no leídas',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
