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
// GET /api/reportes/[id] — Detalle de un reporte generado
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de un reporte generado, incluyendo la URL
 * de descarga del archivo (si está disponible).
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: reporte, error } = await supabase
      .from('reportes_generados')
      .select('*')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (error || !reporte) {
      return errorResponse('Reporte no encontrado o no pertenece a tu sede', 404);
    }

    return successResponse(reporte, 'Reporte recuperado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
