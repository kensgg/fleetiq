import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createConductorSchema } from '@/lib/validations/conductores';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles de lectura y escritura para conductores
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/conductores — Listar conductores de la sede
// ─────────────────────────────────────────────────────────────

/**
 * Lista los conductores de la sede del usuario autenticado.
 * Soporta paginación (?page=1&per_page=20) y filtro por estado (?estado=true|false).
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ request, user }) => {
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

    // Filtro por estado activo/inactivo
    const estadoFilter = searchParams.get('estado');

    // Query base — aislado por sede
    let query = supabase
      .from('conductores')
      .select('*', { count: 'exact' })
      .eq('sede_id', user.sede_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (estadoFilter !== null) {
      query = query.eq('estado', estadoFilter === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener conductores: ${error.message}`, 500);
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
      'Conductores recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/conductores — Crear un nuevo conductor
// ─────────────────────────────────────────────────────────────

/**
 * Crea un nuevo conductor en la sede del administrador.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, user }) => {
  try {
    const body = await request.json();

    // Validación de entrada
    const result = createConductorSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar que el profile_id (si se proporciona) pertenece a la sede
    if (datos.profile_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', datos.profile_id)
        .eq('sede_id', user.sede_id)
        .maybeSingle();

      if (profileError || !profile) {
        return errorResponse(
          'El perfil de usuario proporcionado no existe o no pertenece a esta sede',
          422,
        );
      }
    }

    // Insertar conductor
    const { data: conductor, error } = await supabase
      .from('conductores')
      .insert({
        ...datos,
        sede_id: user.sede_id,
      })
      .select('*')
      .single();

    if (error) {
      return handleApiError(error);
    }

    return successResponse(conductor, 'Conductor creado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
