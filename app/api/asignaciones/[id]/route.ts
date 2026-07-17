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

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/asignaciones/[id] — Detalle de una asignación
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de una asignación conductor-camión.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: asignacion, error } = await supabase
      .from('asignaciones_conductor_camion')
      .select(`
        *,
        camiones!inner (
          id,
          sede_id,
          numero_unidad,
          marca,
          modelo,
          placas,
          estado
        ),
        conductores (
          id,
          nombre_completo,
          licencia_numero,
          tipo_licencia,
          estado
        )
      `)
      .eq('id', id)
      .eq('camiones.sede_id', user.sede_id)
      .single();

    if (error || !asignacion) {
      return errorResponse('Asignación no encontrada o no pertenece a tu sede', 404);
    }

    return successResponse(asignacion, 'Asignación recuperada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/asignaciones/[id] — Desactivar asignación
// ─────────────────────────────────────────────────────────────

/**
 * Desactiva una asignación (activo → false, fecha_fin → ahora).
 */
export const DELETE = withRole(...ROLES_ESCRITURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que la asignación existe y pertenece a la sede (via camión)
    const { data: asignacion, error: checkError } = await supabase
      .from('asignaciones_conductor_camion')
      .select(`
        id,
        activo,
        camiones!inner (
          sede_id
        )
      `)
      .eq('id', id)
      .eq('camiones.sede_id', user.sede_id)
      .single();

    if (checkError || !asignacion) {
      return errorResponse('Asignación no encontrada o no pertenece a tu sede', 404);
    }

    if (!asignacion.activo) {
      return errorResponse('La asignación ya se encuentra inactiva', 409);
    }

    // Desactivar la asignación
    const { error: updateError } = await supabase
      .from('asignaciones_conductor_camion')
      .update({
        activo: false,
        fecha_fin: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return errorResponse(`Error al desactivar la asignación: ${updateError.message}`, 500);
    }

    return successResponse(null, 'Asignación desactivada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
