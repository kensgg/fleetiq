import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createAsignacionSchema } from '@/lib/validations/asignaciones';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/asignaciones — Listar asignaciones de la sede
// ─────────────────────────────────────────────────────────────

/**
 * Lista las asignaciones conductor-camión de la sede.
 * Soporta filtro por ?activo=true|false y paginación.
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

    // Filtro por activo
    const activoFilter = searchParams.get('activo');

    // Para filtrar por sede, necesitamos hacer join con camiones (que tiene sede_id)
    let query = supabase
      .from('asignaciones_conductor_camion')
      .select(`
        *,
        camiones!inner (
          id,
          sede_id,
          numero_unidad,
          marca,
          modelo,
          placas,
          estado
        ),
        conductores!inner (
          id,
          sede_id,
          nombre_completo,
          licencia_numero,
          estado
        )
      `, { count: 'exact' })
      .eq('camiones.sede_id', user.sede_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (activoFilter !== null && activoFilter !== undefined) {
      query = query.eq('activo', activoFilter === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener asignaciones: ${error.message}`, 500);
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
      'Asignaciones recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/asignaciones — Crear nueva asignación
// ─────────────────────────────────────────────────────────────

/**
 * Asigna un conductor a un camión.
 *
 * Lógica clave (RF-10):
 * 1. Verifica que camión y conductor pertenezcan a la sede del admin.
 * 2. Verifica que ambos estén activos.
 * 3. Desactiva todas las asignaciones previas del camión y del conductor.
 * 4. Crea la nueva asignación como activa.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, user }) => {
  try {
    const body = await request.json();

    // Validación de entrada
    const result = createAsignacionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const { camion_id, conductor_id } = result.data;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, estado')
      .eq('id', camion_id)
      .eq('sede_id', user.sede_id)
      .single();

    if (camionError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    if (camion.estado === 'fuera_servicio') {
      return errorResponse('No se puede asignar un conductor a un camión fuera de servicio', 422);
    }

    // Verificar que el conductor existe y pertenece a la sede
    const { data: conductor, error: conductorError } = await supabase
      .from('conductores')
      .select('id, estado')
      .eq('id', conductor_id)
      .eq('sede_id', user.sede_id)
      .single();

    if (conductorError || !conductor) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    if (!conductor.estado) {
      return errorResponse('No se puede asignar un camión a un conductor inactivo', 422);
    }

    const ahora = new Date().toISOString();

    // Desactivar asignaciones previas del camión
    await supabase
      .from('asignaciones_conductor_camion')
      .update({ activo: false, fecha_fin: ahora })
      .eq('camion_id', camion_id)
      .eq('activo', true);

    // Desactivar asignaciones previas del conductor
    await supabase
      .from('asignaciones_conductor_camion')
      .update({ activo: false, fecha_fin: ahora })
      .eq('conductor_id', conductor_id)
      .eq('activo', true);

    // Crear nueva asignación
    const { data: asignacion, error: insertError } = await supabase
      .from('asignaciones_conductor_camion')
      .insert({
        camion_id,
        conductor_id,
        fecha_inicio: ahora,
        activo: true,
      })
      .select(`
        *,
        camiones (
          id,
          numero_unidad,
          marca,
          modelo,
          placas
        ),
        conductores (
          id,
          nombre_completo,
          licencia_numero
        )
      `)
      .single();

    if (insertError || !asignacion) {
      return handleApiError(insertError);
    }

    return successResponse(asignacion, 'Asignación creada exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
