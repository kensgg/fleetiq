import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/api/middleware/auth';

// ─────────────────────────────────────────────────────────────
// PATCH /api/notificaciones/[id] — Marcar notificación como leída
// ─────────────────────────────────────────────────────────────

/**
 * Marca una notificación como leída.
 * Solo el usuario propietario puede marcar sus notificaciones.
 */
export const PATCH = withAuth(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que la notificación existe y pertenece al usuario
    const { data: notificacion, error: checkError } = await supabase
      .from('notificaciones')
      .select('id, leida')
      .eq('id', id)
      .eq('usuario_id', user.id)
      .single();

    if (checkError || !notificacion) {
      return errorResponse('Notificación no encontrada', 404);
    }

    if (notificacion.leida) {
      return successResponse(notificacion, 'La notificación ya estaba marcada como leída');
    }

    // Marcar como leída
    const { data: actualizada, error: updateError } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !actualizada) {
      return errorResponse(
        `Error al actualizar la notificación: ${updateError?.message}`,
        500,
      );
    }

    return successResponse(actualizada, 'Notificación marcada como leída');
  } catch (error) {
    return handleApiError(error);
  }
});
