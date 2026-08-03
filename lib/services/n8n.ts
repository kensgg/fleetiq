// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de integración con n8n
// ─────────────────────────────────────────────────────────────
//
// PUNTO DE EXTENSIÓN n8n — Webhooks salientes
//
// Este módulo expone la función `dispararWebhookN8n()`, que HOY
// solo registra en consola el intento. Cuando la integración se
// active en `integraciones_config` (activo = true), bastará con
// implementar el cuerpo de esta función con un fetch al
// `endpoint_url` almacenado en la tabla, sin tocar ningún otro
// archivo del proyecto.
//
// PUNTOS DE DISPARO DOCUMENTADOS (TODO por módulo):
//
//   Módulo Notificaciones (RF-16, RF-17, RF-18):
//     → dispararWebhookN8n('n8n_alerta_notificacion', { notificacion })
//     Ver: lib/services/notificaciones.ts → generateNotifications()
//
//   Módulo Rutas (RF-13, RF-14):
//     → dispararWebhookN8n('n8n_ruta_completada', { ruta_id, sede_id })
//     Ver: app/api/rutas/[id]/route.ts → PATCH (cambio a 'completada')
//
//   Módulo Mantenimientos (RF-12):
//     → dispararWebhookN8n('n8n_mantenimiento_registrado', { mantenimiento })
//     Ver: app/api/mantenimientos (cuando se implemente)
//
//   Módulo Reportes (RF-19):
//     → dispararWebhookN8n('n8n_reporte_generado', { reporte_id, url })
//     Ver: lib/services/reportes.ts → generarReporte()
// ─────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/** Payload genérico enviado al webhook de n8n. */
export interface WebhookN8nPayload {
  /** Nombre lógico del evento FleetIQ que lo disparó. */
  evento: string;
  /** Timestamp ISO 8601 del momento del disparo (UTC). */
  timestamp: string;
  /** Datos arbitrarios del evento. */
  data: Record<string, unknown>;
}

/** Resultado del intento de disparo del webhook. */
export interface WebhookN8nResult {
  /** true si el webhook fue disparado (o si la integración no existe/está inactiva). */
  enviado: boolean;
  /** Mensaje descriptivo del resultado. */
  mensaje: string;
}

// ─────────────────────────────────────────────────────────────
// Función principal — Stub preparado para la implementación real
// ─────────────────────────────────────────────────────────────

/**
 * Dispara un webhook hacia n8n para el nombre de integración indicado.
 *
 * **HOY**: Solo loguea el intento. La integración está inactiva por defecto
 * (`activo = false` en `integraciones_config`), por lo que esta función
 * consulta la tabla, verifica que esté activa, y si no lo está, retorna
 * sin error (fail-silent para no interrumpir el flujo principal).
 *
 * **CUANDO SE ACTIVE**:
 * 1. Establecer `activo = true` en la fila correspondiente de `integraciones_config`.
 * 2. Registrar el `endpoint_url` del workflow de n8n en la misma fila.
 * 3. Descomentar el bloque `fetch` en esta función.
 *
 * El código del módulo que lo invoca NO necesita cambios.
 *
 * @param nombre - Nombre lógico de la integración (PK lógica en `integraciones_config.nombre`).
 * @param data   - Datos del evento a enviar en el payload.
 */
export async function dispararWebhookN8n(
  nombre: string,
  data: Record<string, unknown>,
): Promise<WebhookN8nResult> {
  try {
    // ─── Consultar configuración de la integración ───
    const supabase = createAdminClient();
    const { data: config, error } = await supabase
      .from('integraciones_config')
      .select('activo, endpoint_url, nombre')
      .eq('nombre', nombre)
      .eq('tipo', 'n8n')
      .maybeSingle();

    if (error) {
      console.error(`[FleetIQ n8n] Error al consultar integracion '${nombre}':`, error.message);
      return { enviado: false, mensaje: `Error al consultar integración: ${error.message}` };
    }

    if (!config) {
      // La integración no existe aún — fail-silent para no romper el flujo
      console.info(`[FleetIQ n8n] Integración '${nombre}' no registrada en integraciones_config. Ignorando.`);
      return { enviado: false, mensaje: `Integración '${nombre}' no registrada.` };
    }

    if (!config.activo) {
      // La integración existe pero está desactivada — comportamiento esperado en esta fase
      console.info(`[FleetIQ n8n] Integración '${nombre}' está desactivada. Webhook no disparado.`);
      return { enviado: false, mensaje: `Integración '${nombre}' inactiva. Webhook omitido.` };
    }

    if (!config.endpoint_url) {
      console.warn(`[FleetIQ n8n] Integración '${nombre}' activa pero sin endpoint_url configurado.`);
      return { enviado: false, mensaje: `Integración '${nombre}' sin endpoint_url.` };
    }

    // ─── TODO: Descomentar cuando la integración se active en producción ───
    // const payload: WebhookN8nPayload = {
    //   evento: nombre,
    //   timestamp: new Date().toISOString(),
    //   data,
    // };
    //
    // const response = await fetch(config.endpoint_url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    //   signal: AbortSignal.timeout(10_000), // 10 s timeout
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`n8n respondió con status ${response.status}`);
    // }
    //
    // console.info(`[FleetIQ n8n] Webhook '${nombre}' disparado exitosamente.`);
    // return { enviado: true, mensaje: 'Webhook disparado exitosamente.' };

    // Placeholder: integración activa pero fetch aún comentado
    console.info(
      `[FleetIQ n8n] STUB — Webhook '${nombre}' pendiente de implementación.`,
      { endpoint: config.endpoint_url, data },
    );
    return { enviado: false, mensaje: `Stub activo para '${nombre}'. Implementar fetch.` };
  } catch (err) {
    // Fail-silent: nunca interrumpir el flujo principal por un webhook fallido
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error(`[FleetIQ n8n] Error al disparar webhook '${nombre}':`, mensaje);
    return { enviado: false, mensaje };
  }
}
