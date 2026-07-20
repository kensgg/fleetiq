import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';

// ─────────────────────────────────────────────────────────────
// Roles — Lectura ampliada (incluye conductor para ver su ruta)
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/rutas/[id] — Detalle de una ruta con incidencias
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle completo de una ruta, incluyendo datos del
 * camión asignado, conductor, e incidencias registradas.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: ruta, error } = await supabase
      .from('rutas')
      .select(`
        *,
        camiones (
          id,
          numero_unidad,
          marca,
          modelo,
          anio,
          placas,
          tipo_carga,
          estado
        ),
        conductores (
          id,
          nombre_completo,
          licencia_numero,
          tipo_licencia,
          estado
        ),
        incidencias (
          id,
          tipo,
          descripcion,
          evidencia_url,
          reportado_por,
          created_at
        )
      `)
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .order('created_at', { referencedTable: 'incidencias', ascending: false })
      .single();

    if (error || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    return successResponse(ruta, 'Ruta recuperada exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
