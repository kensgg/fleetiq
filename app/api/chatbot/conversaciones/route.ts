import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { iniciarConversacionSchema } from '@/lib/validations/chatbot';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

// El chatbot es accesible para todos los roles autenticados del sistema.
const ROLES_CHATBOT = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
  'capturista',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/chatbot/conversaciones — Listar conversaciones del usuario
// ─────────────────────────────────────────────────────────────

/**
 * Lista las conversaciones de chatbot del usuario autenticado.
 * Soporta paginación con ?page y ?per_page.
 */
export const GET = withRole(...ROLES_CHATBOT)(async ({ request, user }) => {
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

    const { data, error, count } = await supabase
      .from('chatbot_conversaciones')
      .select('*', { count: 'exact' })
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return errorResponse(`Error al obtener conversaciones: ${error.message}`, 500);
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
      'Conversaciones recuperadas exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chatbot/conversaciones — Iniciar nueva conversación (RF-22)
// ─────────────────────────────────────────────────────────────

/**
 * Crea una nueva conversación de chatbot para el usuario autenticado.
 *
 * El campo `contexto` es opcional y puede usarse para establecer
 * un mensaje de sistema o el módulo desde donde se inicia la sesión.
 */
export const POST = withRole(...ROLES_CHATBOT)(async ({ request, user }) => {
  try {
    const body = await request.json().catch(() => ({}));

    // Validación de entrada (contexto es opcional)
    const result = iniciarConversacionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const supabase = await createClient();

    const { data: conversacion, error } = await supabase
      .from('chatbot_conversaciones')
      .insert({ usuario_id: user.id })
      .select('*')
      .single();

    if (error || !conversacion) {
      return errorResponse(`Error al crear conversación: ${error?.message}`, 500);
    }

    return successResponse(conversacion, 'Conversación iniciada exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
