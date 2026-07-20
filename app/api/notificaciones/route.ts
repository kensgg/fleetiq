import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withAuth } from '@/lib/api/middleware/auth';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// GET /api/notificaciones — Listar notificaciones del usuario
// ─────────────────────────────────────────────────────────────

/**
 * Lista las notificaciones del usuario autenticado.
 *
 * Acceso: Todos los roles autenticados (usa withAuth, no withRole).
 *
 * Filtros opcionales:
 * - ?leida=true|false — filtrar por leídas/no leídas
 * - ?prioridad=alta|media|baja — filtrar por prioridad
 *
 * Paginación estándar: ?page=1&per_page=20
 * Ordenadas por created_at DESC (más recientes primero).
 */
export const GET = withAuth(async ({ request, user }) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('per_page') || String(DEFAULT_PAGE_SIZE), 10)),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Filtros
    const leidaFilter = searchParams.get('leida');
    const prioridadFilter = searchParams.get('prioridad');

    // Query — solo notificaciones del usuario autenticado
    let query = supabase
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (leidaFilter !== null && leidaFilter !== undefined) {
      query = query.eq('leida', leidaFilter === 'true');
    }

    if (prioridadFilter) {
      query = query.eq('prioridad', prioridadFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener notificaciones: ${error.message}`, 500);
    }

    const total = count ?? 0;

    return successResponse(
      {
        items: data,
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      'Notificaciones recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
