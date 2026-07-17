import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/camiones/[id]/asignaciones — Historial de asignaciones
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el historial completo de asignaciones de un camión específico
 * (activas e inactivas), ordenado por fecha de inicio descendente.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Obtener historial de asignaciones del camión
    const { data: asignaciones, error } = await supabase
      .from('asignaciones_conductor_camion')
      .select(`
        *,
        conductores (
          id,
          nombre_completo,
          licencia_numero,
          tipo_licencia,
          estado
        )
      `)
      .eq('camion_id', id)
      .order('fecha_inicio', { ascending: false });

    if (error) {
      return errorResponse(`Error al obtener historial de asignaciones: ${error.message}`, 500);
    }

    return successResponse(
      asignaciones,
      'Historial de asignaciones recuperado exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
