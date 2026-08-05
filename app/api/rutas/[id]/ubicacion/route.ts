import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { reportarUbicacionSchema } from '@/lib/validations/mapa';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

/** Solo conductores (autorizados, ver verificación abajo) y administradores. */
const ROLES_ESCRITURA = [
  'administrador',
  'conductor',
] as const;

/** Roles que pueden consultar la posición. */
const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
] as const;

// ─────────────────────────────────────────────────────────────
// POST /api/rutas/[id]/ubicacion
// ─────────────────────────────────────────────────────────────

/**
 * Registra la posición actual del camión en una ruta activa.
 *
 * Reglas de negocio:
 * 1. La ruta debe existir y pertenecer a la sede del usuario.
 * 2. La ruta debe estar en estado "en_curso".
 * 3. Si el usuario es conductor: solo puede reportar si es el conductor
 *    asignado a esa ruta (verificado vía conductores.profile_id = user.id).
 * 4. Los administradores pueden reportar en cualquier ruta de su sede.
 *
 * Body esperado:
 * ```json
 * { "lat": 19.4326, "lng": -99.1332, "velocidad_kmh": 65.5 }
 * ```
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = reportarUbicacionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // ─── Obtener la ruta con datos del conductor asignado ───
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select(`
        id,
        estado,
        conductor_id,
        conductores (
          id,
          profile_id
        )
      `)
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    // La ruta debe estar en curso para reportar posición
    if (ruta.estado !== 'en_curso') {
      return errorResponse(
        `No se puede reportar ubicación en una ruta con estado "${ruta.estado}". ` +
        'Solo se permiten reportes en rutas en curso.',
        422,
      );
    }

    // ─── Verificación de identidad del conductor ───────────────────────────
    // Si el usuario es conductor (no admin), validar que sea el asignado.
    if (user.rol === 'conductor') {
      const conductorData = ruta.conductores as unknown as
        | { id: string; profile_id: string | null }
        | null;

      if (!conductorData) {
        return errorResponse(
          'No se pudo verificar el conductor asignado a esta ruta',
          500,
        );
      }

      if (!conductorData.profile_id) {
        // El conductor no tiene profile_id configurado — no se puede verificar identidad
        return errorResponse(
          'El conductor asignado a esta ruta no tiene una cuenta de sistema vinculada. ' +
          'Contacta al administrador para vincular la cuenta.',
          403,
        );
      }

      if (conductorData.profile_id !== user.id) {
        return errorResponse(
          'Solo el conductor asignado a esta ruta puede reportar su ubicación',
          403,
        );
      }
    }

    // ─── Insertar registro de ubicación ───
    const { data: ubicacion, error: insertError } = await supabase
      .from('ubicaciones_ruta')
      .insert({
        ruta_id: id,
        lat: datos.lat,
        lng: datos.lng,
        velocidad_kmh: datos.velocidad_kmh ?? null,
      })
      .select('id, ruta_id, lat, lng, velocidad_kmh, created_at')
      .single();

    if (insertError || !ubicacion) {
      return handleApiError(insertError);
    }

    return successResponse(ubicacion, 'Ubicación registrada exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/rutas/[id]/ubicacion
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve la posición actual del camión en una ruta y,
 * opcionalmente, el historial completo de posiciones.
 *
 * Query params:
 *   ?historial=true — Devuelve todas las posiciones ordenadas por
 *                     created_at ASC, para trazar la trayectoria
 *                     ya recorrida sobre el mapa.
 *
 * Sin ?historial: retorna solo la última posición conocida (objeto).
 * Con ?historial=true: retorna un array completo de posiciones.
 *
 * Si la ruta no tiene posiciones registradas, retorna null/[].
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mostrarHistorial = searchParams.get('historial') === 'true';

    const supabase = await createClient();

    // Verificar que la ruta existe y pertenece a la sede del usuario
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, estado')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    if (mostrarHistorial) {
      // ─── Historial completo para trazar trayectoria ───
      const { data: historial, error } = await supabase
        .from('ubicaciones_ruta')
        .select('id, ruta_id, lat, lng, velocidad_kmh, created_at')
        .eq('ruta_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        return errorResponse(
          `Error al obtener historial de ubicaciones: ${error.message}`,
          500,
        );
      }

      return successResponse(
        {
          ruta_id: id,
          estado: ruta.estado,
          total_registros: historial?.length ?? 0,
          // Coordenadas en [lat, lng] para Leaflet
          trayectoria: (historial ?? []).map((u) => ({
            id: u.id,
            lat: u.lat,
            lng: u.lng,
            velocidad_kmh: u.velocidad_kmh,
            timestamp: u.created_at,
          })),
        },
        'Historial de ubicaciones recuperado exitosamente',
      );
    }

    // ─── Solo la última posición conocida ───
    const { data: ultima, error } = await supabase
      .from('ubicaciones_ruta')
      .select('id, ruta_id, lat, lng, velocidad_kmh, created_at')
      .eq('ruta_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return errorResponse(
        `Error al obtener la ubicación actual: ${error.message}`,
        500,
      );
    }

    return successResponse(
      {
        ruta_id: id,
        estado: ruta.estado,
        ultima_posicion: ultima
          ? {
              id: ultima.id,
              lat: ultima.lat,
              lng: ultima.lng,
              velocidad_kmh: ultima.velocidad_kmh,
              timestamp: ultima.created_at,
            }
          : null,
      },
      ultima
        ? 'Posición actual recuperada exitosamente'
        : 'No hay posiciones registradas para esta ruta',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
