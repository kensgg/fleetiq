import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateConductorSchema } from '@/lib/validations/conductores';

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
// GET /api/conductores/[id] — Detalle de un conductor
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de un conductor, incluyendo su asignación activa
 * (si existe).
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: conductor, error } = await supabase
      .from('conductores')
      .select(`
        *,
        asignaciones_conductor_camion (
          id,
          camion_id,
          fecha_inicio,
          fecha_fin,
          activo,
          camiones (
            id,
            numero_unidad,
            marca,
            modelo,
            placas
          )
        )
      `)
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (error || !conductor) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    return successResponse(conductor, 'Conductor recuperado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/conductores/[id] — Actualizar conductor
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza los datos de un conductor existente.
 */
export const PUT = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = updateConductorSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const updates = result.data;
    const supabase = await createClient();

    // Verificar que el conductor existe y pertenece a la sede
    const { data: conductorExistente, error: checkError } = await supabase
      .from('conductores')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !conductorExistente) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    // Si se proporciona profile_id, verificar que pertenece a la sede
    if (updates.profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', updates.profile_id)
        .eq('sede_id', user.sede_id)
        .maybeSingle();

      if (!profile) {
        return errorResponse(
          'El perfil de usuario proporcionado no existe o no pertenece a esta sede',
          422,
        );
      }
    }

    // Actualizar conductor
    const { data: conductor, error: updateError } = await supabase
      .from('conductores')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !conductor) {
      return errorResponse(`Error al actualizar el conductor: ${updateError?.message}`, 500);
    }

    return successResponse(conductor, 'Conductor actualizado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/conductores/[id] — Soft-delete (estado → false)
// ─────────────────────────────────────────────────────────────

/**
 * Realiza soft-delete cambiando el estado a false (inactivo).
 */
export const DELETE = withRole(...ROLES_ESCRITURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el conductor existe y pertenece a la sede
    const { data: conductor, error: checkError } = await supabase
      .from('conductores')
      .select('id, estado')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !conductor) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    if (!conductor.estado) {
      return errorResponse('El conductor ya se encuentra inactivo', 409);
    }

    // Soft-delete: cambiar estado a false
    const { error: updateError } = await supabase
      .from('conductores')
      .update({
        estado: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return errorResponse(`Error al desactivar el conductor: ${updateError.message}`, 500);
    }

    // Desactivar asignaciones activas del conductor
    await supabase
      .from('asignaciones_conductor_camion')
      .update({
        activo: false,
        fecha_fin: new Date().toISOString(),
      })
      .eq('conductor_id', id)
      .eq('activo', true);

    return successResponse(null, 'Conductor desactivado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
