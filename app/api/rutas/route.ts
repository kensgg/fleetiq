import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createRutaSchema } from '@/lib/validations/rutas';
import { getRouteOptimizer } from '@/lib/services/route-optimization';
import { geocodificarDireccion, GeocodificacionError } from '@/lib/services/geocodificacion';
import { calcularRuta } from '@/lib/services/osrm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import type { PuntoIntermedio } from '@/modules/rutas/types';

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

    // ─── Geocodificación y cálculo de ruta (no bloqueante) ──────────────────
    // La ruta ya está persistida. Si esta etapa falla, se loguea la advertencia
    // y se responde igual. El endpoint GET /rutas/:id/mapa puede reintentar.
    // ─────────────────────────────────────────────────────────────────────────
    const geoAdvertencias: string[] = [];
    const geoUpdate: Record<string, unknown> = {};

    try {
      // ─── Geocodificar origen si no tiene coordenadas ───
      let origenCoords: { lat: number; lng: number } | null = null;
      if (!ruta.origen_lat || !ruta.origen_lng) {
        try {
          origenCoords = await geocodificarDireccion(datos.origen);
          geoUpdate.origen_lat = origenCoords.lat;
          geoUpdate.origen_lng = origenCoords.lng;
        } catch (err) {
          const msg = err instanceof GeocodificacionError ? err.message : 'Error al geocodificar origen';
          geoAdvertencias.push(msg);
          console.warn(`[FleetIQ][rutas/POST] ${msg}`);
        }
      } else {
        origenCoords = { lat: ruta.origen_lat as number, lng: ruta.origen_lng as number };
      }

      // ─── Geocodificar destino si no tiene coordenadas ───
      let destinoCoords: { lat: number; lng: number } | null = null;
      if (!ruta.destino_lat || !ruta.destino_lng) {
        try {
          destinoCoords = await geocodificarDireccion(datos.destino);
          geoUpdate.destino_lat = destinoCoords.lat;
          geoUpdate.destino_lng = destinoCoords.lng;
        } catch (err) {
          const msg = err instanceof GeocodificacionError ? err.message : 'Error al geocodificar destino';
          geoAdvertencias.push(msg);
          console.warn(`[FleetIQ][rutas/POST] ${msg}`);
        }
      } else {
        destinoCoords = { lat: ruta.destino_lat as number, lng: ruta.destino_lng as number };
      }

      // ─── Geocodificar puntos intermedios sin coordenadas ───
      const puntosGeocodificados: PuntoIntermedio[] = [];
      let hayPuntosActualizados = false;

      for (const punto of puntosFinales) {
        if (punto.lat !== undefined && punto.lng !== undefined) {
          puntosGeocodificados.push(punto);
        } else {
          try {
            const coords = await geocodificarDireccion(punto.nombre);
            puntosGeocodificados.push({ ...punto, lat: coords.lat, lng: coords.lng });
            hayPuntosActualizados = true;
          } catch (err) {
            const msg = err instanceof GeocodificacionError
              ? err.message
              : `Error al geocodificar punto intermedio "${punto.nombre}"`;
            geoAdvertencias.push(msg);
            console.warn(`[FleetIQ][rutas/POST] ${msg}`);
            puntosGeocodificados.push(punto); // conservar sin coords
          }
        }
      }

      if (hayPuntosActualizados) {
        geoUpdate.puntos_intermedios = puntosGeocodificados;
      }

      // ─── Calcular distancia/duración con OSRM ───
      const todosLosPuntos = [
        ...(origenCoords ? [origenCoords] : []),
        ...puntosGeocodificados.filter((p) => p.lat !== undefined && p.lng !== undefined)
          .map((p) => ({ lat: p.lat!, lng: p.lng! })),
        ...(destinoCoords ? [destinoCoords] : []),
      ];

      if (todosLosPuntos.length >= 2) {
        const osrmResultado = await calcularRuta(todosLosPuntos);
        if (osrmResultado) {
          geoUpdate.distancia_km = osrmResultado.distancia_km;
          geoUpdate.duracion_estimada_min = osrmResultado.duracion_min;
        } else {
          geoAdvertencias.push('No se pudo calcular la distancia y duración (OSRM no disponible). Se reintentará automáticamente.');
        }
      }

      // ─── Persistir actualizaciones geo si las hay ───
      if (Object.keys(geoUpdate).length > 0) {
        const { error: geoError } = await supabase
          .from('rutas')
          .update({ ...geoUpdate, updated_at: new Date().toISOString() })
          .eq('id', ruta.id);

        if (geoError) {
          console.warn(`[FleetIQ][rutas/POST] Error al persistir datos geo: ${geoError.message}`);
          geoAdvertencias.push('Los datos de geolocalización no pudieron guardarse temporalmente.');
        } else {
          // Reflejar los datos geo en la respuesta sin hacer otro SELECT
          Object.assign(ruta, geoUpdate);
        }
      }
    } catch (geoErr) {
      // Captura cualquier error inesperado en el bloque geo para no tumbar el endpoint
      console.error('[FleetIQ][rutas/POST] Error inesperado en bloque geo:', geoErr);
      geoAdvertencias.push('Error inesperado al procesar datos de geolocalización.');
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
        ...(geoAdvertencias.length > 0 && { _geo_advertencias: geoAdvertencias }),
      },
      'Ruta creada exitosamente',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
});
