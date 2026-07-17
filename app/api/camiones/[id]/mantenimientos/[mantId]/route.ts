import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateMantenimientoSchema } from '@/lib/validations/mantenimientos';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'capturista',
] as const;

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/camiones/[id]/mantenimientos/[mantId] — Detalle
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de un registro de mantenimiento.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id, mantId } = await params;
    const supabase = await createClient();

    // Verificar que el camión pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Obtener mantenimiento
    const { data: mantenimiento, error } = await supabase
      .from('mantenimientos')
      .select('*')
      .eq('id', mantId)
      .eq('camion_id', id)
      .single();

    if (error || !mantenimiento) {
      return errorResponse('Mantenimiento no encontrado', 404);
    }

    return successResponse(mantenimiento, 'Mantenimiento recuperado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/camiones/[id]/mantenimientos/[mantId] — Actualizar
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza un registro de mantenimiento existente.
 */
export const PUT = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id, mantId } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = updateMantenimientoSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const updates = result.data;
    const supabase = await createClient();

    // Verificar que el camión pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Verificar que el mantenimiento existe y pertenece al camión
    const { data: mantExistente, error: mantCheckError } = await supabase
      .from('mantenimientos')
      .select('id')
      .eq('id', mantId)
      .eq('camion_id', id)
      .single();

    if (mantCheckError || !mantExistente) {
      return errorResponse('Mantenimiento no encontrado', 404);
    }

    // Actualizar mantenimiento
    const { data: mantenimiento, error: updateError } = await supabase
      .from('mantenimientos')
      .update(updates)
      .eq('id', mantId)
      .select('*')
      .single();

    if (updateError || !mantenimiento) {
      return errorResponse(`Error al actualizar el mantenimiento: ${updateError?.message}`, 500);
    }

    return successResponse(mantenimiento, 'Mantenimiento actualizado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/camiones/[id]/mantenimientos/[mantId] — Eliminar
// ─────────────────────────────────────────────────────────────

/**
 * Elimina un registro de mantenimiento (hard delete).
 */
export const DELETE = withRole(...ROLES_ESCRITURA)(async ({ params, user }) => {
  try {
    const { id, mantId } = await params;
    const supabase = await createClient();

    // Verificar que el camión pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Verificar que el mantenimiento existe y pertenece al camión
    const { data: mantExistente, error: mantCheckError } = await supabase
      .from('mantenimientos')
      .select('id')
      .eq('id', mantId)
      .eq('camion_id', id)
      .single();

    if (mantCheckError || !mantExistente) {
      return errorResponse('Mantenimiento no encontrado', 404);
    }

    // Eliminar mantenimiento
    const { error: deleteError } = await supabase
      .from('mantenimientos')
      .delete()
      .eq('id', mantId);

    if (deleteError) {
      return errorResponse(`Error al eliminar el mantenimiento: ${deleteError.message}`, 500);
    }

    return successResponse(null, 'Mantenimiento eliminado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
