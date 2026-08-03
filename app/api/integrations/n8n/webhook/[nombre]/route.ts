import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';

// ─────────────────────────────────────────────────────────────
// POST /api/integrations/n8n/webhook/[nombre]
// Webhook genérico entrante desde n8n hacia FleetIQ
// ─────────────────────────────────────────────────────────────
//
// Este endpoint recibe solicitudes POST enviadas por workflows de n8n.
// El segmento dinámico `:nombre` identifica qué integración debe
// procesar la solicitud (tiene que existir en `integraciones_config`
// con tipo = 'n8n' y activo = true).
//
// Flujo de validación:
// 1. Busca la fila con `nombre` en `integraciones_config`.
// 2. Si no existe → 404 Not Found.
// 3. Si existe pero `activo = false` → 501 Not Implemented (diseño de fase).
// 4. Si existe y está activa → procesa el payload (TODO por integración).
//
// SEGURIDAD:
// TODO: Cuando se active una integración, añadir verificación de firma
// HMAC del webhook (cabecera X-N8N-Signature) comparando contra
// `config.webhook_secret` almacenado en el JSONB de integraciones_config.
// ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nombre: string }> },
) {
  try {
    const { nombre } = await params;
    const supabase = createAdminClient();

    // ─── 1. Buscar integración en la tabla ───
    const { data: integracion, error: dbError } = await supabase
      .from('integraciones_config')
      .select('id, nombre, activo, tipo, config')
      .eq('nombre', nombre)
      .eq('tipo', 'n8n')
      .maybeSingle();

    if (dbError) {
      console.error(`[FleetIQ n8n Webhook] Error consultando integración '${nombre}':`, dbError.message);
      return errorResponse('Error interno al verificar la integración', 500);
    }

    // ─── 2. Integración no registrada ───
    if (!integracion) {
      return errorResponse(
        `La integración '${nombre}' no está registrada en el sistema.`,
        404,
      );
    }

    // ─── 3. Integración desactivada → 501 Not Implemented ───
    if (!integracion.activo) {
      console.info(`[FleetIQ n8n Webhook] Solicitud a integración inactiva: '${nombre}'`);
      return errorResponse(
        `La integración '${nombre}' está registrada pero aún no ha sido activada. ` +
        'Esta funcionalidad se habilitará en una fase posterior del proyecto.',
        501,
      );
    }

    // ─── 4. Integración activa — Leer payload de n8n ───
    let payload: Record<string, unknown> = {};
    try {
      payload = await request.json();
    } catch {
      return errorResponse('El cuerpo de la solicitud debe ser JSON válido', 400);
    }

    // ─── TODO: Implementar lógica específica por integración ───
    //
    // Cuando se active una integración específica, agregar aquí el
    // switch por `nombre` para enrutar a la lógica correspondiente.
    // Ejemplo de estructura:
    //
    // switch (nombre) {
    //   case 'n8n_alerta_mantenimiento':
    //     // TODO: Procesar alerta de mantenimiento enviada por n8n.
    //     // Podría crear una notificación en la tabla `notificaciones`
    //     // o actualizar el estado del mantenimiento.
    //     break;
    //
    //   case 'n8n_orden_combustible':
    //     // TODO: Registrar una orden de reabastecimiento de combustible
    //     // generada automáticamente por n8n.
    //     break;
    //
    //   case 'n8n_incidencia_automatica':
    //     // TODO: Crear una incidencia en tabla `incidencias` a partir
    //     // de alertas automáticas de telemetría procesadas por n8n.
    //     break;
    //
    //   default:
    //     // Integración activa pero sin handler específico definido.
    //     break;
    // }

    // Respuesta placeholder para integraciones activas sin handler aún
    console.info(
      `[FleetIQ n8n Webhook] Payload recibido para integración activa '${nombre}':`,
      JSON.stringify(payload).substring(0, 200),
    );

    return successResponse(
      {
        integracion: nombre,
        recibido: true,
        timestamp: new Date().toISOString(),
      },
      `Webhook recibido para '${nombre}'. Handler pendiente de implementación.`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ─────────────────────────────────────────────────────────────
// GET — Healthcheck del webhook (útil para verificar desde n8n)
// ─────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nombre: string }> },
) {
  try {
    const { nombre } = await params;
    const supabase = createAdminClient();

    const { data: integracion, error } = await supabase
      .from('integraciones_config')
      .select('nombre, activo, tipo, updated_at')
      .eq('nombre', nombre)
      .eq('tipo', 'n8n')
      .maybeSingle();

    if (error) {
      return errorResponse('Error al consultar la integración', 500);
    }

    if (!integracion) {
      return errorResponse(`Integración '${nombre}' no registrada`, 404);
    }

    if (!integracion.activo) {
      return errorResponse(
        `Integración '${nombre}' desactivada. No está lista para recibir webhooks.`,
        501,
      );
    }

    return successResponse(
      {
        nombre: integracion.nombre,
        activo: integracion.activo,
        tipo: integracion.tipo,
        updated_at: integracion.updated_at,
      },
      `Integración '${nombre}' activa y lista`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
