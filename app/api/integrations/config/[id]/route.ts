import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { actualizarIntegracionSchema } from '@/lib/validations/integraciones';

// ─────────────────────────────────────────────────────────────
// Roles — Solo administrador gestiona integraciones
// ─────────────────────────────────────────────────────────────

const ROLES_ADMIN = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/integrations/config/[id] — Detalle de una integración
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle completo de una integración registrada en
 * `integraciones_config`, incluyendo su estado activo/inactivo,
 * endpoint_url y el JSONB de configuración.
 */
export const GET = withRole(...ROLES_ADMIN)(async ({ params }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: integracion, error } = await supabase
      .from('integraciones_config')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !integracion) {
      return errorResponse('Integración no encontrada', 404);
    }

    return successResponse(integracion, 'Integración recuperada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/integrations/config/[id] — Actualizar integración
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza parcialmente una integración existente.
 *
 * Casos de uso principales:
 * - Activar una integración: `{ "activo": true }`
 * - Desactivar una integración: `{ "activo": false }`
 * - Registrar o cambiar el endpoint_url del workflow de n8n.
 * - Actualizar el JSONB de configuración (tokens, opciones, etc.).
 *
 * Ningún campo es obligatorio — solo se actualizan los enviados.
 */
export const PATCH = withRole(...ROLES_ADMIN)(async ({ request, params }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = actualizarIntegracionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    if (Object.keys(result.data).length === 0) {
      return errorResponse('No se proporcionaron campos para actualizar', 422);
    }

    const supabase = await createClient();

    // Verificar que la integración existe
    const { data: existente, error: checkError } = await supabase
      .from('integraciones_config')
      .select('id, nombre')
      .eq('id', id)
      .single();

    if (checkError || !existente) {
      return errorResponse('Integración no encontrada', 404);
    }

    // Si se cambia el nombre, verificar unicidad
    if (result.data.nombre && result.data.nombre !== existente.nombre) {
      const { data: duplicado } = await supabase
        .from('integraciones_config')
        .select('id')
        .eq('nombre', result.data.nombre)
        .neq('id', id)
        .maybeSingle();

      if (duplicado) {
        return errorResponse(
          `Ya existe una integración con el nombre '${result.data.nombre}'`,
          409,
        );
      }
    }

    const { data: integracion, error: updateError } = await supabase
      .from('integraciones_config')
      .update({
        ...result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !integracion) {
      return errorResponse(`Error al actualizar integración: ${updateError?.message}`, 500);
    }

    return successResponse(integracion, 'Integración actualizada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/integrations/config/[id] — Eliminar integración
// ─────────────────────────────────────────────────────────────

/**
 * Elimina permanentemente una integración de `integraciones_config`.
 *
 * ⚠️ Solo se permite eliminar integraciones que estén **desactivadas**
 * (`activo = false`). Para eliminar una activa, primero desactivarla
 * con PATCH.
 */
export const DELETE = withRole(...ROLES_ADMIN)(async ({ params }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar existencia y estado
    const { data: integracion, error: checkError } = await supabase
      .from('integraciones_config')
      .select('id, activo, nombre')
      .eq('id', id)
      .single();

    if (checkError || !integracion) {
      return errorResponse('Integración no encontrada', 404);
    }

    if (integracion.activo) {
      return errorResponse(
        `No se puede eliminar la integración '${integracion.nombre}' porque está activa. Desactívala primero.`,
        422,
      );
    }

    const { error: deleteError } = await supabase
      .from('integraciones_config')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return errorResponse(`Error al eliminar integración: ${deleteError.message}`, 500);
    }

    return successResponse(null, `Integración '${integracion.nombre}' eliminada exitosamente`);
  } catch (error) {
    return handleApiError(error);
  }
});
