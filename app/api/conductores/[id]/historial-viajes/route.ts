import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/conductores/[id]/historial-viajes — Historial de viajes
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene el historial de viajes (rutas) del conductor.
 *
 * NOTA: Este endpoint está preparado para consumir la relación con la tabla
 * `rutas` cuando el módulo de rutas se implemente. Si la tabla no tiene datos
 * todavía, retorna un array vacío.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el conductor existe y pertenece a la sede
    const { data: conductor, error: checkError } = await supabase
      .from('conductores')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !conductor) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    // Paginación
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('per_page') || String(DEFAULT_PAGE_SIZE), 10)),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Filtro opcional por estado de ruta
    const estadoFilter = searchParams.get('estado');

    // Consultar rutas del conductor (relación vía conductor_id en tabla rutas)
    let query = supabase
      .from('rutas')
      .select(`
        id,
        origen,
        destino,
        puntos_intermedios,
        fecha_estimada,
        estado,
        camion_id,
        camiones (
          id,
          numero_unidad,
          marca,
          modelo,
          placas
        ),
        created_at
      `, { count: 'exact' })
      .eq('conductor_id', id)
      .eq('sede_id', user.sede_id)
      .order('fecha_estimada', { ascending: false })
      .range(from, to);

    if (estadoFilter) {
      query = query.eq('estado', estadoFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener historial de viajes: ${error.message}`, 500);
    }

    const total = count ?? 0;

    return successResponse(
      {
        items: data ?? [],
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      'Historial de viajes recuperado exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
