import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { enviarMensajeSchema } from '@/lib/validations/chatbot';
import { getIAService } from '@/lib/services/ia';

// ─────────────────────────────────────────────────────────────
// Roles — todos los usuarios autenticados
// ─────────────────────────────────────────────────────────────

const ROLES_CHATBOT = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
  'capturista',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/chatbot/conversaciones/[id]/mensajes
// Listar el historial de mensajes de una conversación
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve el historial de mensajes de una conversación.
 *
 * La conversación debe pertenecer al usuario autenticado.
 * Soporta paginación con ?page y ?per_page.
 */
export const GET = withRole(...ROLES_CHATBOT)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Verificar que la conversación pertenece al usuario
    const { data: conversacion, error: convError } = await supabase
      .from('chatbot_conversaciones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', user.id)
      .single();

    if (convError || !conversacion) {
      return errorResponse('Conversación no encontrada o no te pertenece', 404);
    }

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('per_page') || String(DEFAULT_PAGE_SIZE), 10)),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
      .from('chatbot_mensajes')
      .select('*', { count: 'exact' })
      .eq('conversacion_id', id)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      return errorResponse(`Error al obtener mensajes: ${error.message}`, 500);
    }

    const total = count ?? 0;

    return successResponse(
      {
        conversacion_id: id,
        items: data,
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      'Historial de mensajes recuperado exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chatbot/conversaciones/[id]/mensajes — Enviar mensaje (RF-22)
// ─────────────────────────────────────────────────────────────

/**
 * Envía un mensaje del usuario en una conversación existente y
 * retorna la respuesta del asistente.
 *
 * Flujo:
 * 1. Valida que la conversación pertenece al usuario.
 * 2. Valida el cuerpo del mensaje con Zod.
 * 3. Guarda el mensaje del usuario en `chatbot_mensajes` (rol: 'usuario').
 * 4. Obtiene el historial reciente para dar contexto al modelo.
 * 5. Invoca `IAService.generarRespuesta()` (actualmente placeholder).
 * 6. Guarda la respuesta del asistente en `chatbot_mensajes` (rol: 'asistente').
 * 7. Retorna ambos mensajes al cliente.
 *
 * TODO (RF-23): Dentro de `IAService.generarRespuesta()`, detectar
 * intenciones de "generar reporte" y delegar en el servicio de reportes
 * (`@/lib/services/reportes.generarReporte`) para generar PDF/XLSX
 * bajo demanda. Incluir la URL del reporte en la respuesta del asistente.
 *
 * TODO (RF-24): Dentro de `IAService.generarRespuesta()`, detectar
 * intenciones de "recomendar ruta" u "optimizar entrega" y delegar en
 * `getRouteOptimizer()` de `@/lib/services/route-optimization` para
 * ofrecer sugerencias basadas en datos históricos de la sede.
 */
export const POST = withRole(...ROLES_CHATBOT)(async ({ request, params, user }) => {
  try {
    const { id: conversacionId } = await params;
    const supabase = await createClient();

    // ─── 1. Verificar pertenencia de la conversación ───
    const { data: conversacion, error: convError } = await supabase
      .from('chatbot_conversaciones')
      .select('id')
      .eq('id', conversacionId)
      .eq('usuario_id', user.id)
      .single();

    if (convError || !conversacion) {
      return errorResponse('Conversación no encontrada o no te pertenece', 404);
    }

    // ─── 2. Validar cuerpo del mensaje ───
    const body = await request.json();
    const result = enviarMensajeSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const { contenido } = result.data;

    // ─── 3. Guardar mensaje del usuario ───
    const { data: mensajeUsuario, error: insertUserError } = await supabase
      .from('chatbot_mensajes')
      .insert({
        conversacion_id: conversacionId,
        rol: 'usuario',
        contenido,
      })
      .select('*')
      .single();

    if (insertUserError || !mensajeUsuario) {
      return errorResponse(
        `Error al guardar mensaje del usuario: ${insertUserError?.message}`,
        500,
      );
    }

    // ─── 4. Obtener historial reciente (últimos 20 mensajes) para contexto ───
    const { data: historialData } = await supabase
      .from('chatbot_mensajes')
      .select('rol, contenido')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Invertir para orden cronológico (el más reciente al final)
    const historial = (historialData ?? []).reverse().map((m) => ({
      rol: m.rol as 'usuario' | 'asistente',
      contenido: m.contenido,
    }));

    // ─── 5. Invocar servicio de IA (actualmente placeholder) ───
    const iaService = getIAService();
    const { respuesta, esRespuestaReal } = await iaService.generarRespuesta({
      mensajeUsuario: contenido,
      historial,
      sedeId: user.sede_id ?? '',
      userId: user.id,
    });

    // ─── 6. Guardar respuesta del asistente ───
    const { data: mensajeAsistente, error: insertAsisteError } = await supabase
      .from('chatbot_mensajes')
      .insert({
        conversacion_id: conversacionId,
        rol: 'asistente',
        contenido: respuesta,
      })
      .select('*')
      .single();

    if (insertAsisteError || !mensajeAsistente) {
      return errorResponse(
        `Error al guardar respuesta del asistente: ${insertAsisteError?.message}`,
        500,
      );
    }

    // ─── 7. Responder al cliente ───
    return successResponse(
      {
        mensaje_usuario: mensajeUsuario,
        mensaje_asistente: mensajeAsistente,
        _ia: {
          es_respuesta_real: esRespuestaReal,
          proveedor: esRespuestaReal ? 'external' : 'placeholder',
        },
      },
      'Mensaje enviado y procesado exitosamente',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
});
