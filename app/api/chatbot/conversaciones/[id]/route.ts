import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';

// ─────────────────────────────────────────────────────────────
// Roles — todos los usuarios autenticados
// ─────────────────────────────────────────────────────────────

const ROLES_CHATBOT = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
  'capturista',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/chatbot/conversaciones/[id]
// Obtener detalle de una conversación con conteo de mensajes
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve el detalle de una conversación de chatbot.
 *
 * La conversación debe pertenecer al usuario autenticado.
 * Incluye el conteo total de mensajes en la conversación.
 */
export const GET = withRole(...ROLES_CHATBOT)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: conversacion, error } = await supabase
      .from('chatbot_conversaciones')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', user.id)
      .single();

    if (error || !conversacion) {
      return errorResponse('Conversación no encontrada o no te pertenece', 404);
    }

    // Conteo de mensajes
    const { count: totalMensajes } = await supabase
      .from('chatbot_mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('conversacion_id', id);

    return successResponse(
      {
        ...conversacion,
        total_mensajes: totalMensajes ?? 0,
      },
      'Conversación recuperada exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/chatbot/conversaciones/[id]
// Eliminar una conversación y sus mensajes
// ─────────────────────────────────────────────────────────────

/**
 * Elimina una conversación y todos sus mensajes (ON DELETE CASCADE en DB).
 * Solo puede eliminar sus propias conversaciones.
 */
export const DELETE = withRole(...ROLES_CHATBOT)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar pertenencia antes de eliminar
    const { data: conversacion, error: checkError } = await supabase
      .from('chatbot_conversaciones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', user.id)
      .single();

    if (checkError || !conversacion) {
      return errorResponse('Conversación no encontrada o no te pertenece', 404);
    }

    const { error: deleteError } = await supabase
      .from('chatbot_conversaciones')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return errorResponse(`Error al eliminar conversación: ${deleteError.message}`, 500);
    }

    return successResponse(null, 'Conversación eliminada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
