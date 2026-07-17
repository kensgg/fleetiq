import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateCamionSchema } from '@/lib/validations/camiones';

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
// GET /api/camiones/[id] — Detalle de un camión
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de un camión, incluyendo sus documentos
 * y el último registro de mantenimiento.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Obtener camión con documentos
    const { data: camion, error } = await supabase
      .from('camiones')
      .select(`
        *,
        documentos_camion (*),
        mantenimientos (*)
      `)
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .order('created_at', { referencedTable: 'mantenimientos', ascending: false })
      .single();

    if (error || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    return successResponse(camion, 'Camión recuperado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/camiones/[id] — Actualizar camión
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza los datos de un camión existente.
 * Si se modifican placas o número de serie, valida unicidad en la sede.
 */
export const PUT = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = updateCamionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const updates = result.data;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camionExistente, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camionExistente) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Si se modifican placas, verificar unicidad (excluyendo el camión actual)
    if (updates.placas) {
      const { data: existePlacas } = await supabase
        .from('camiones')
        .select('id')
        .eq('sede_id', user.sede_id)
        .eq('placas', updates.placas)
        .neq('id', id)
        .maybeSingle();

      if (existePlacas) {
        return errorResponse(
          `Ya existe otro camión con las placas "${updates.placas}" en esta sede`,
          409,
        );
      }
    }

    // Si se modifica número de serie, verificar unicidad
    if (updates.numero_serie) {
      const { data: existeSerie } = await supabase
        .from('camiones')
        .select('id')
        .eq('sede_id', user.sede_id)
        .eq('numero_serie', updates.numero_serie)
        .neq('id', id)
        .maybeSingle();

      if (existeSerie) {
        return errorResponse(
          `Ya existe otro camión con el número de serie "${updates.numero_serie}" en esta sede`,
          409,
        );
      }
    }

    // Actualizar camión
    const { data: camion, error: updateError } = await supabase
      .from('camiones')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !camion) {
      return errorResponse(`Error al actualizar el camión: ${updateError?.message}`, 500);
    }

    return successResponse(camion, 'Camión actualizado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/camiones/[id] — Soft-delete (fuera_servicio)
// ─────────────────────────────────────────────────────────────

/**
 * Realiza soft-delete cambiando el estado a 'fuera_servicio'.
 */
export const DELETE = withRole(...ROLES_ESCRITURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id, estado')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    if (camion.estado === 'fuera_servicio') {
      return errorResponse('El camión ya se encuentra fuera de servicio', 409);
    }

    // Soft-delete: cambiar estado a fuera_servicio
    const { error: updateError } = await supabase
      .from('camiones')
      .update({
        estado: 'fuera_servicio',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return errorResponse(`Error al eliminar el camión: ${updateError.message}`, 500);
    }

    return successResponse(null, 'Camión dado de baja (fuera de servicio) exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
