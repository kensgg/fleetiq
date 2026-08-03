import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { crearIntegracionSchema } from '@/lib/validations/integraciones';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles — Solo administrador gestiona integraciones
// ─────────────────────────────────────────────────────────────

const ROLES_ADMIN = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/integrations/config — Listar todas las integraciones
// ─────────────────────────────────────────────────────────────

/**
 * Lista todas las integraciones registradas en `integraciones_config`.
 *
 * Soporta paginación y filtro opcional por:
 * - ?tipo=n8n|ia|otro
 * - ?activo=true|false
 */
export const GET = withRole(...ROLES_ADMIN)(async ({ request }) => {
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
    const tipoFilter = searchParams.get('tipo');
    const activoFilter = searchParams.get('activo');

    let query = supabase
      .from('integraciones_config')
      .select('*', { count: 'exact' })
      .order('nombre', { ascending: true })
      .range(from, to);

    if (tipoFilter) {
      query = query.eq('tipo', tipoFilter);
    }

    if (activoFilter !== null) {
      query = query.eq('activo', activoFilter === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener integraciones: ${error.message}`, 500);
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
      'Integraciones recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/integrations/config — Registrar nueva integración
// ─────────────────────────────────────────────────────────────

/**
 * Crea un nuevo registro en `integraciones_config`.
 *
 * El campo `activo` se establece en `false` por defecto para que la
 * integración no procese solicitudes hasta ser habilitada explícitamente
 * a través del PATCH /api/integrations/config/[id].
 */
export const POST = withRole(...ROLES_ADMIN)(async ({ request }) => {
  try {
    const body = await request.json();

    const result = crearIntegracionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar unicidad de nombre
    const { data: existente } = await supabase
      .from('integraciones_config')
      .select('id')
      .eq('nombre', datos.nombre)
      .maybeSingle();

    if (existente) {
      return errorResponse(
        `Ya existe una integración con el nombre '${datos.nombre}'`,
        409,
      );
    }

    const { data: integracion, error } = await supabase
      .from('integraciones_config')
      .insert({
        nombre: datos.nombre,
        tipo: datos.tipo,
        endpoint_url: datos.endpoint_url ?? null,
        activo: datos.activo,
        config: datos.config,
      })
      .select('*')
      .single();

    if (error || !integracion) {
      return errorResponse(`Error al registrar integración: ${error?.message}`, 500);
    }

    return successResponse(integracion, 'Integración registrada exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
