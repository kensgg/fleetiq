import { NextResponse } from 'next/server';
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
// GET /api/reportes/[id]/descargar — Descargar archivo de un reporte
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene o redirige a la URL de descarga del archivo de un reporte generado.
 *
 * Opciones por query params:
 * - `redirect=false`: Retorna la respuesta JSON con `archivo_url` en lugar de redirigir.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const shouldRedirect = searchParams.get('redirect') !== 'false';

    const { data: reporte, error } = await supabase
      .from('reportes_generados')
      .select('*')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (error || !reporte) {
      return errorResponse('Reporte no encontrado o no pertenece a tu sede', 404);
    }

    if (!reporte.archivo_url) {
      return errorResponse(
        'El reporte solicitado no cuenta con un archivo adjunto disponible',
        404,
      );
    }

    if (shouldRedirect) {
      return NextResponse.redirect(reporte.archivo_url);
    }

    return successResponse(
      {
        id: reporte.id,
        tipo: reporte.tipo,
        formato: reporte.formato,
        archivo_url: reporte.archivo_url,
        created_at: reporte.created_at,
      },
      'URL de descarga obtenida exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
