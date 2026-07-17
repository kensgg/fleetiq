import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateDocumentoCamionSchema } from '@/lib/validations/documentos-camion';

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
// GET /api/camiones/[id]/documentos/[docId] — Detalle de documento
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de un documento digital específico de un camión.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id, docId } = await params;
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

    // Obtener documento
    const { data: documento, error } = await supabase
      .from('documentos_camion')
      .select('*')
      .eq('id', docId)
      .eq('camion_id', id)
      .single();

    if (error || !documento) {
      return errorResponse('Documento no encontrado', 404);
    }

    return successResponse(documento, 'Documento recuperado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/camiones/[id]/documentos/[docId] — Actualizar documento
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza un documento digital (nueva URL, tipo o fecha de vencimiento).
 */
export const PUT = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id, docId } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = updateDocumentoCamionSchema.safeParse(body);
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

    // Verificar que el documento existe y pertenece al camión
    const { data: docExistente, error: docCheckError } = await supabase
      .from('documentos_camion')
      .select('id')
      .eq('id', docId)
      .eq('camion_id', id)
      .single();

    if (docCheckError || !docExistente) {
      return errorResponse('Documento no encontrado', 404);
    }

    // Actualizar documento
    const { data: documento, error: updateError } = await supabase
      .from('documentos_camion')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select('*')
      .single();

    if (updateError || !documento) {
      return errorResponse(`Error al actualizar el documento: ${updateError?.message}`, 500);
    }

    return successResponse(documento, 'Documento actualizado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/camiones/[id]/documentos/[docId] — Eliminar documento
// ─────────────────────────────────────────────────────────────

/**
 * Elimina un registro de documento digital (hard delete).
 * Nota: No elimina el archivo de Supabase Storage; eso se maneja
 * en el frontend o en un job de limpieza.
 */
export const DELETE = withRole(...ROLES_ESCRITURA)(async ({ params, user }) => {
  try {
    const { id, docId } = await params;
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

    // Verificar que el documento existe y pertenece al camión
    const { data: docExistente, error: docCheckError } = await supabase
      .from('documentos_camion')
      .select('id')
      .eq('id', docId)
      .eq('camion_id', id)
      .single();

    if (docCheckError || !docExistente) {
      return errorResponse('Documento no encontrado', 404);
    }

    // Eliminar documento
    const { error: deleteError } = await supabase
      .from('documentos_camion')
      .delete()
      .eq('id', docId);

    if (deleteError) {
      return errorResponse(`Error al eliminar el documento: ${deleteError.message}`, 500);
    }

    return successResponse(null, 'Documento eliminado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
