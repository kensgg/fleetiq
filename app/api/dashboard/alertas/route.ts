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

/** Cantidad de notificaciones recientes a incluir como preview. */
const RECIENTES_LIMIT = 5;

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/alertas — Alertas agrupadas por prioridad (RF-06)
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve las notificaciones no leídas del usuario agrupadas
 * por prioridad, más las últimas 5 como preview.
 *
 * Usa el índice existente `idx_notificaciones_usuario(usuario_id, leida)`.
 */
export const GET = withRole(...ROLES_DASHBOARD)(async ({ user }) => {
  try {
    const supabase = await createClient();

    // Conteos por prioridad y recientes en paralelo
    const [altaResult, mediaResult, bajaResult, recientesResult] = await Promise.all([
      // Conteo prioridad alta
      supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false)
        .eq('prioridad', 'alta'),

      // Conteo prioridad media
      supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false)
        .eq('prioridad', 'media'),

      // Conteo prioridad baja
      supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false)
        .eq('prioridad', 'baja'),

      // Últimas N notificaciones no leídas (preview)
      supabase
        .from('notificaciones')
        .select('id, titulo, mensaje, prioridad, entidad_tipo, entidad_id, created_at')
        .eq('usuario_id', user.id)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(RECIENTES_LIMIT),
    ]);

    // Verificar errores
    const errores = [
      altaResult.error,
      mediaResult.error,
      bajaResult.error,
      recientesResult.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      return errorResponse(
        `Error al obtener alertas: ${errores[0]!.message}`,
        500,
      );
    }

    const alta = altaResult.count ?? 0;
    const media = mediaResult.count ?? 0;
    const baja = bajaResult.count ?? 0;

    return successResponse(
      {
        total_no_leidas: alta + media + baja,
        por_prioridad: {
          alta,
          media,
          baja,
        },
        recientes: recientesResult.data ?? [],
      },
      'Alertas recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
