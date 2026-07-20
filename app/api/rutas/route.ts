import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createRutaSchema } from '@/lib/validations/rutas';
import { getRouteOptimizer } from '@/lib/services/route-optimization';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles de lectura y escritura para rutas
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

const ROLES_ESCRITURA = [
  'gerente_operaciones',
  'supervisor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/rutas — Listar rutas de la sede con filtros
// ─────────────────────────────────────────────────────────────

/**
 * Lista las rutas de la sede del usuario autenticado.
 *
 * Soporta paginación (?page=1&per_page=20) y filtros:
 * - ?estado=pendiente|en_curso|completada|cancelada
 * - ?camion_id=<uuid>
 * - ?conductor_id=<uuid>
 * - ?fecha_desde=2026-01-01T00:00:00Z
 * - ?fecha_hasta=2026-12-31T23:59:59Z
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

    // Filtros
    const estadoFilter = searchParams.get('estado');
    const camionIdFilter = searchParams.get('camion_id');
    const conductorIdFilter = searchParams.get('conductor_id');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');

    // Query base — aislado por sede, con joins a camión y conductor
    let query = supabase
      .from('rutas')
      .select(`
        *,
        camiones (
          id,
          numero_unidad,
          marca,
          modelo,
          placas,
          estado
        ),
        conductores (
          id,
          nombre_completo,
          licencia_numero,
          estado
        )
      `, { count: 'exact' })
      .eq('sede_id', user.sede_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    // Aplicar filtros opcionales
    if (estadoFilter) {
      query = query.eq('estado', estadoFilter);
    }

    if (camionIdFilter) {
      query = query.eq('camion_id', camionIdFilter);
    }

    if (conductorIdFilter) {
      query = query.eq('conductor_id', conductorIdFilter);
    }

    if (fechaDesde) {
      query = query.gte('fecha_estimada', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha_estimada', fechaHasta);
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener rutas: ${error.message}`, 500);
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
      'Rutas recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/rutas — Crear nueva ruta (RF-13)
// ─────────────────────────────────────────────────────────────

/**
 * Crea una nueva ruta asignada a un camión y un conductor.
 *
 * Validaciones de negocio:
 * 1. Camión existe en la sede del usuario.
 * 2. Camión no está en mantenimiento ni fuera_servicio.
 * 3. Camión no tiene una ruta activa (en_curso).
 * 4. Conductor existe en la sede y está activo.
 * 5. Conductor no tiene una ruta activa (en_curso).
 *
 * Punto de extensión RF-24: Se invoca el servicio de optimización
 * de rutas antes de guardar. Actualmente usa PassthroughOptimizer.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, user }) => {
  try {
    const body = await request.json();

    // Validación de entrada
    const result = createRutaSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // ─── Validación 1: Camión existe y pertenece a la sede ───
    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, estado')
      .eq('id', datos.camion_id)
      .eq('sede_id', user.sede_id)
      .single();

    if (camionError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // ─── Validación 2: Camión no está en mantenimiento ni fuera_servicio ───
    if (camion.estado === 'mantenimiento') {
      return errorResponse(
        'No se puede asignar una ruta a un camión en mantenimiento',
        422,
      );
    }

    if (camion.estado === 'fuera_servicio') {
      return errorResponse(
        'No se puede asignar una ruta a un camión fuera de servicio',
        422,
      );
    }

    // ─── Validación 3: Camión no tiene ruta en_curso ───
    const { data: rutaActivaCamion } = await supabase
      .from('rutas')
      .select('id')
      .eq('camion_id', datos.camion_id)
      .eq('estado', 'en_curso')
      .maybeSingle();

    if (rutaActivaCamion) {
      return errorResponse(
        'El camión ya tiene una ruta en curso. Complétala o cancélala antes de asignar una nueva.',
        409,
      );
    }

    // ─── Validación 4: Conductor existe, pertenece a la sede y está activo ───
    const { data: conductor, error: conductorError } = await supabase
      .from('conductores')
      .select('id, estado')
      .eq('id', datos.conductor_id)
      .eq('sede_id', user.sede_id)
      .single();

    if (conductorError || !conductor) {
      return errorResponse('Conductor no encontrado o no pertenece a tu sede', 404);
    }

    if (!conductor.estado) {
      return errorResponse(
        'No se puede asignar una ruta a un conductor inactivo',
        422,
      );
    }

    // ─── Validación 5: Conductor no tiene ruta en_curso ───
    const { data: rutaActivaConductor } = await supabase
      .from('rutas')
      .select('id')
      .eq('conductor_id', datos.conductor_id)
      .eq('estado', 'en_curso')
      .maybeSingle();

    if (rutaActivaConductor) {
      return errorResponse(
        'El conductor ya tiene una ruta en curso. Complétala o cancélala antes de asignar una nueva.',
        409,
      );
    }

    // ─── Punto de extensión RF-24: Optimización de rutas vía IA ───
    // TODO (RF-24): Cuando el servicio de IA esté listo, el optimizador
    // reordenará los puntos intermedios y calculará distancias/duraciones.
    // Ver: lib/services/route-optimization.ts
    const optimizer = getRouteOptimizer();
    const optimizacion = await optimizer.optimizeRoute({
      origen: datos.origen,
      destino: datos.destino,
      puntos_intermedios: datos.puntos_intermedios,
      camion_id: datos.camion_id,
      fecha_estimada: datos.fecha_estimada,
    });

    // Usar los puntos optimizados (actualmente passthrough)
    const puntosFinales = optimizacion.puntos_intermedios_optimizados;

    // ─── Insertar ruta ───
    const { data: ruta, error: insertError } = await supabase
      .from('rutas')
      .insert({
        sede_id: user.sede_id,
        camion_id: datos.camion_id,
        conductor_id: datos.conductor_id,
        origen: datos.origen,
        destino: datos.destino,
        puntos_intermedios: puntosFinales,
        fecha_estimada: datos.fecha_estimada,
        estado: 'pendiente',
        creado_por: user.id,
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

    if (insertError || !ruta) {
      return handleApiError(insertError);
    }

    return successResponse(
      {
        ...ruta,
        _optimizacion: {
          optimizado: optimizacion.optimizado,
          mensaje: optimizacion.mensaje,
          distancia_estimada_km: optimizacion.distancia_estimada_km,
          duracion_estimada_min: optimizacion.duracion_estimada_min,
        },
      },
      'Ruta creada exitosamente',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
});
