import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createDocumentoCamionSchema } from '@/lib/validations/documentos-camion';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'capturista',
] as const;

const ROLES_ESCRITURA = ['administrador'] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/camiones/[id]/documentos — Listar documentos del camión
// ─────────────────────────────────────────────────────────────

/**
 * Lista todos los documentos digitales asociados a un camión.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Obtener documentos del camión
    const { data: documentos, error } = await supabase
      .from('documentos_camion')
      .select('*')
      .eq('camion_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(`Error al obtener documentos: ${error.message}`, 500);
    }

    return successResponse(documentos, 'Documentos recuperados exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/camiones/[id]/documentos — Crear registro de documento
// ─────────────────────────────────────────────────────────────

/**
 * Crea un registro de documento digital para el camión.
 * La URL del archivo se recibe del frontend, que hizo el upload
 * directamente a Supabase Storage.
 */
export const POST = withRole(...ROLES_ESCRITURA)(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validación de entrada
    const result = createDocumentoCamionSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const datos = result.data;
    const supabase = await createClient();

    // Verificar que el camión existe y pertenece a la sede
    const { data: camion, error: checkError } = await supabase
      .from('camiones')
      .select('id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (checkError || !camion) {
      return errorResponse('Camión no encontrado o no pertenece a tu sede', 404);
    }

    // Insertar documento
    const { data: documento, error: insertError } = await supabase
      .from('documentos_camion')
      .insert({
        camion_id: id,
        tipo_documento: datos.tipo_documento,
        archivo_url: datos.archivo_url ?? null,
        fecha_vencimiento: datos.fecha_vencimiento ?? null,
      })
      .select('*')
      .single();

    if (insertError || !documento) {
      return handleApiError(insertError);
    }

    return successResponse(documento, 'Documento creado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
