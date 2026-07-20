import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createIncidenciaSchema } from '@/lib/validations/incidencias';

// ─────────────────────────────────────────────────────────────
// Roles — Conductores también pueden reportar incidencias
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
] as const;

const ROLES_ESCRITURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/rutas/[id]/incidencias — Listar incidencias de una ruta
// ─────────────────────────────────────────────────────────────

/**
 * Lista todas las incidencias registradas para una ruta específica.
 * Ordenadas por fecha de creación descendente (más recientes primero).
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que la ruta existe y pertenece a la sede del usuario
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    // Obtener incidencias de la ruta
    const { data: incidencias, error } = await supabase
      .from('incidencias')
      .select(`
        id,
        tipo,
        descripcion,
        evidencia_url,
        reportado_por,
        created_at
      `)
      .eq('ruta_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(`Error al obtener incidencias: ${error.message}`, 500);
    }

    return successResponse(incidencias, 'Incidencias recuperadas exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/rutas/[id]/incidencias — Registrar incidencia (RF-15)
// ─────────────────────────────────────────────────────────────

/**
 * Registra una nueva incidencia asociada a una ruta.
 *
 * Regla de negocio: Solo se pueden registrar incidencias en
 * rutas con estado "en_curso". No tendría sentido reportar
 * un accidente en una ruta que aún no ha iniciado.
 *
 * La evidencia fotográfica se maneja así:
 * 1. El frontend sube la imagen a Supabase Storage (bucket "incidencias").
 * 2. El frontend obtiene la URL pública del archivo subido.
 * 3. El frontend envía esa URL en el campo `evidencia_url`.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = createIncidenciaSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar que la ruta existe y pertenece a la sede
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, estado')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    // Solo se pueden registrar incidencias en rutas en curso
    if (ruta.estado !== 'en_curso') {
      return errorResponse(
        `No se puede registrar una incidencia en una ruta con estado "${ruta.estado}". ` +
        'Solo se permiten incidencias en rutas en curso.',
        422,
      );
    }

    // Insertar incidencia
    const { data: incidencia, error: insertError } = await supabase
      .from('incidencias')
      .insert({
        ruta_id: id,
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        evidencia_url: datos.evidencia_url ?? null,
        reportado_por: user.id,
      })
      .select('*')
      .single();

    if (insertError || !incidencia) {
      return handleApiError(insertError);
    }

    return successResponse(incidencia, 'Incidencia registrada exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
