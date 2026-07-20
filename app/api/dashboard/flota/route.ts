import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';

// ─────────────────────────────────────────────────────────────
// Roles con acceso al dashboard
// ─────────────────────────────────────────────────────────────

const ROLES_DASHBOARD = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/flota — Resumen de flota por estado (RF-05)
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve el conteo de camiones agrupados por estado para la
 * sede del usuario autenticado, más el conteo de conductores activos.
 *
 * Consultas optimizadas: 5 count queries en paralelo.
 * Usa el índice existente `idx_camiones_sede`.
 */
export const GET = withRole(...ROLES_DASHBOARD)(async ({ user }) => {
  try {
    const supabase = await createClient();
    const sedeId = user.sede_id;

    // Ejecutar todos los conteos en paralelo para minimizar latencia
    const [
      totalResult,
      disponiblesResult,
      enRutaResult,
      mantenimientoResult,
      fueraServicioResult,
      conductoresResult,
    ] = await Promise.all([
      // Total de camiones de la sede
      supabase
        .from('camiones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId),

      // Disponibles
      supabase
        .from('camiones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId)
        .eq('estado', 'disponible'),

      // En ruta
      supabase
        .from('camiones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId)
        .eq('estado', 'en_ruta'),

      // En mantenimiento
      supabase
        .from('camiones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId)
        .eq('estado', 'mantenimiento'),

      // Fuera de servicio
      supabase
        .from('camiones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId)
        .eq('estado', 'fuera_servicio'),

      // Conductores activos de la sede
      supabase
        .from('conductores')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', sedeId)
        .eq('estado', true),
    ]);

    // Verificar errores en cualquiera de las consultas
    const errores = [
      totalResult.error,
      disponiblesResult.error,
      enRutaResult.error,
      mantenimientoResult.error,
      fueraServicioResult.error,
      conductoresResult.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      return errorResponse(
        `Error al obtener resumen de flota: ${errores[0]!.message}`,
        500,
      );
    }

    return successResponse(
      {
        total: totalResult.count ?? 0,
        disponibles: disponiblesResult.count ?? 0,
        en_ruta: enRutaResult.count ?? 0,
        mantenimiento: mantenimientoResult.count ?? 0,
        fuera_servicio: fueraServicioResult.count ?? 0,
        conductores_activos: conductoresResult.count ?? 0,
      },
      'Resumen de flota recuperado exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
