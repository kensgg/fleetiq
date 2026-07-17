import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createMantenimientoSchema } from '@/lib/validations/mantenimientos';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

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
// GET /api/camiones/[id]/mantenimientos — Listar mantenimientos
// ─────────────────────────────────────────────────────────────

/**
 * Lista el historial de mantenimientos de un camión.
 * Soporta paginación (?page=1&per_page=20).
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
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

    // Obtener mantenimientos del camión
    const { data, error, count } = await supabase
      .from('mantenimientos')
      .select('*', { count: 'exact' })
      .eq('camion_id', id)
      .order('fecha', { ascending: false })
      .range(from, to);

    if (error) {
      return errorResponse(`Error al obtener mantenimientos: ${error.message}`, 500);
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
      'Mantenimientos recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/camiones/[id]/mantenimientos — Crear mantenimiento
// ─────────────────────────────────────────────────────────────

/**
 * Crea un nuevo registro de mantenimiento para el camión.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = createMantenimientoSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Insertar mantenimiento
    const { data: mantenimiento, error: insertError } = await supabase
      .from('mantenimientos')
      .insert({
        camion_id: id,
        fecha: datos.fecha,
        tipo: datos.tipo,
        costo: datos.costo,
        proveedor: datos.proveedor ?? null,
        kilometraje: datos.kilometraje ?? null,
      })
      .select('*')
      .single();

    if (insertError || !mantenimiento) {
      return handleApiError(insertError);
    }

    return successResponse(mantenimiento, 'Mantenimiento creado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
