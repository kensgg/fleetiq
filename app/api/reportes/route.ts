import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { generarReporteSchema } from '@/lib/validations/reportes';
import { generarReporte } from '@/lib/services/reportes';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

const ROLES_GENERACION = [
  'administrador',
  'gerente_operaciones',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/reportes — Listar histórico de reportes generados
// ─────────────────────────────────────────────────────────────

/**
 * Lista los reportes generados de la sede del usuario.
 * Soporta paginación y filtro por tipo.
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

    // Filtro por tipo
    const tipoFilter = searchParams.get('tipo');

    let query = supabase
      .from('reportes_generados')
      .select('*', { count: 'exact' })
      .eq('sede_id', user.sede_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (tipoFilter) {
      query = query.eq('tipo', tipoFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Error al obtener reportes: ${error.message}`, 500);
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
      'Reportes recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/reportes — Generar un nuevo reporte (RF-19, RF-20, RF-21)
// ─────────────────────────────────────────────────────────────

/**
 * Genera un nuevo reporte operativo.
 *
 * Flujo:
 * 1. Valida entrada (tipo, formato, filtros) con Zod.
 * 2. Invoca `generarReporte()` del servicio reutilizable.
 * 3. El servicio agrega datos, genera PDF/XLSX, sube a Storage,
 *    registra en DB, y retorna el registro con URL de descarga.
 *
 * Tipos de reporte: combustible, km_recorridos, mantenimiento, eficiencia_rutas.
 * Formatos: pdf, xlsx.
 * Filtros: fecha_desde, fecha_hasta, camion_id, conductor_id, ruta_id.
 */
export const POST = withRole(...ROLES_GENERACION)(async ({ request, user }) => {
  try {
    const body = await request.json();

    // Validación de entrada
    const result = generarReporteSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }

    const { tipo, formato, filtros } = result.data;

    // Generar reporte usando el servicio reutilizable
    const reporte = await generarReporte({
      tipo,
      formato,
      filtros: filtros ?? {},
      sedeId: user.sede_id!,
      userId: user.id,
    });

    return successResponse(reporte, 'Reporte generado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
