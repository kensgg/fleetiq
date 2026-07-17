import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createCamionSchema } from '@/lib/validations/camiones';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles de lectura y escritura para camiones
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'capturista',
] as const;

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/camiones — Listar camiones de la sede
// ─────────────────────────────────────────────────────────────

/**
 * Lista los camiones de la sede del usuario autenticado.
 * Soporta paginación (?page=1&per_page=20) y filtro por estado (?estado=disponible).
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

    // Filtro por estado
    const estadoFilter = searchParams.get('estado');

    // Query base — aislado por sede
    let query = supabase
      .from('camiones')
      .select('*', { count: 'exact' })
      .eq('sede_id', user.sede_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (estadoFilter) {
      query = query.eq('estado', estadoFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener camiones: ${error.message}`, 500);
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
      'Camiones recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/camiones — Crear un nuevo camión
// ─────────────────────────────────────────────────────────────

/**
 * Crea un nuevo camión en la sede del administrador.
 * Valida unicidad de placas y número de serie dentro de la sede.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, user }) => {
  try {
    const body = await request.json();

    // Validación de entrada
    const result = createCamionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar unicidad de placas en la sede
    const { data: existePlacas } = await supabase
      .from('camiones')
      .select('id')
      .eq('sede_id', user.sede_id)
      .eq('placas', datos.placas)
      .maybeSingle();

    if (existePlacas) {
      return errorResponse(
        `Ya existe un camión con las placas "${datos.placas}" en esta sede`,
        409,
      );
    }

    // Verificar unicidad de número de serie en la sede
    const { data: existeSerie } = await supabase
      .from('camiones')
      .select('id')
      .eq('sede_id', user.sede_id)
      .eq('numero_serie', datos.numero_serie)
      .maybeSingle();

    if (existeSerie) {
      return errorResponse(
        `Ya existe un camión con el número de serie "${datos.numero_serie}" en esta sede`,
        409,
      );
    }

    // Insertar camión
    const { data: camion, error } = await supabase
      .from('camiones')
      .insert({
        ...datos,
        sede_id: user.sede_id,
      })
      .select('*')
      .single();

    if (error) {
      return handleApiError(error);
    }

    return successResponse(camion, 'Camión creado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
