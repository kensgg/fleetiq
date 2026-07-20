import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateEstadoRutaSchema, TRANSICIONES_VALIDAS } from '@/lib/validations/rutas';
import { ESTADO_CAMION } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Roles — Solo operaciones y supervisión pueden cambiar estado
// ─────────────────────────────────────────────────────────────

const ROLES_ESTADO = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

// ─────────────────────────────────────────────────────────────
// PATCH /api/rutas/[id]/estado — Actualizar estado de ruta (RF-14)
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza el estado de una ruta con transición validada.
 *
 * Máquina de estados:
 *   pendiente  → en_curso, cancelada
 *   en_curso   → completada, cancelada
 *   completada → (sin transiciones)
 *   cancelada  → (sin transiciones)
 *
 * Efectos secundarios sobre el camión asociado:
 *   → en_curso:    camión pasa a "en_ruta"
 *   → completada:  camión regresa a "disponible" (si no está en mantenimiento)
 *   → cancelada:   camión regresa a "disponible" (si no está en mantenimiento)
 */
export const PATCH = withRole(...ROLES_ESTADO)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = updateEstadoRutaSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const { estado: nuevoEstado } = result.data;
    const supabase = await createClient();

    // ─── Obtener ruta actual con datos del camión ───
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, estado, camion_id, camiones(id, estado)')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    const estadoActual = ruta.estado as string;

    // ─── Validar transición de estado ───
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] ?? [];

    if (!transicionesPermitidas.includes(nuevoEstado)) {
      const permitidas = transicionesPermitidas.length > 0
        ? transicionesPermitidas.join(', ')
        : 'ninguna (estado final)';

      return errorResponse(
        `Transición de estado no permitida: "${estadoActual}" → "${nuevoEstado}". ` +
        `Transiciones válidas desde "${estadoActual}": ${permitidas}.`,
        422,
      );
    }

    // ─── Actualizar estado de la ruta ───
    const { data: rutaActualizada, error: updateError } = await supabase
      .from('rutas')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
          licencia_numero
        )
      `)
      .single();

    if (updateError || !rutaActualizada) {
      return errorResponse(
        `Error al actualizar el estado de la ruta: ${updateError?.message}`,
        500,
      );
    }

    // ─── Efectos secundarios sobre el camión ───
    const camionData = ruta.camiones as unknown as { id: string; estado: string } | null;
    const camionEstadoActual = camionData?.estado;

    if (nuevoEstado === 'en_curso') {
      // Camión pasa a "en_ruta"
      await supabase
        .from('camiones')
        .update({
          estado: ESTADO_CAMION.EN_RUTA,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruta.camion_id);
    } else if (nuevoEstado === 'completada' || nuevoEstado === 'cancelada') {
      // Camión regresa a "disponible" solo si NO está en mantenimiento
      if (camionEstadoActual !== ESTADO_CAMION.MANTENIMIENTO) {
        await supabase
          .from('camiones')
          .update({
            estado: ESTADO_CAMION.DISPONIBLE,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ruta.camion_id);
      }
    }

    return successResponse(
      rutaActualizada,
      `Estado de ruta actualizado: "${estadoActual}" → "${nuevoEstado}"`,
    );
  } catch (error) {
    return handleApiError(error);
  }
});
