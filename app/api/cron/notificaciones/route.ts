import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ejecutarChecksNotificaciones } from '@/lib/services/notificaciones';

// ─────────────────────────────────────────────────────────────
// GET /api/cron/notificaciones — Job de generación de notificaciones
// ─────────────────────────────────────────────────────────────
//
// Este endpoint NO usa withAuth porque es invocado por un
// scheduler externo (Vercel Cron, GitHub Actions, crontab, etc.),
// no por un usuario autenticado.
//
// Protección: verifica el header Authorization contra la
// variable de entorno CRON_SECRET.
//
// Configuración:
// 1. Agregar CRON_SECRET=<token-seguro> en .env.local
// 2. Configurar el scheduler para hacer GET con header:
//    Authorization: Bearer <token-seguro>
//
// Ejemplo con Vercel Cron (vercel.json):
//   { "crons": [{ "path": "/api/cron/notificaciones", "schedule": "0 8 * * *" }] }
//
// Ejemplo con curl:
//   curl -H "Authorization: Bearer mi-token" https://app.fleetiq.com/api/cron/notificaciones
//
// PUNTO DE EXTENSIÓN n8n:
// Alternativamente, este check podría ser disparado por un
// workflow de n8n usando un nodo Schedule Trigger, que luego
// llama a este endpoint. Esto permitiría manejar la orquestación
// de múltiples acciones (notificar, enviar email, crear ticket)
// desde el flujo visual de n8n.
// ─────────────────────────────────────────────────────────────

/**
 * Ejecuta los checks de notificaciones de vencimientos (RF-16)
 * y mantenimiento programado (RF-17).
 */
export async function GET(request: NextRequest) {
  try {
    // ─── Verificar CRON_SECRET ───
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[FleetIQ Cron] CRON_SECRET no configurado en variables de entorno.');
      return errorResponse(
        'Cron no configurado. Falta la variable de entorno CRON_SECRET.',
        500,
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token !== cronSecret) {
      return errorResponse('No autorizado. Token de cron inválido.', 401);
    }

    // ─── Ejecutar checks ───
    console.log('[FleetIQ Cron] Iniciando checks de notificaciones...');
    const resultado = await ejecutarChecksNotificaciones();
    console.log('[FleetIQ Cron] Checks completados:', JSON.stringify(resultado));

    return successResponse(
      resultado,
      'Checks de notificaciones ejecutados exitosamente',
    );
  } catch (error) {
    console.error('[FleetIQ Cron] Error al ejecutar checks:', error);
    return errorResponse('Error al ejecutar los checks de notificaciones', 500);
  }
}
