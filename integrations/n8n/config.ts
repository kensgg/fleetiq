// ─────────────────────────────────────────────────────────────
// FleetIQ — Configuración base para integración con n8n
// ─────────────────────────────────────────────────────────────
// Este módulo está preparado pero NO implementado.
// La configuración real se leerá de la tabla `integraciones_config`
// con tipo = 'n8n' cuando se active la integración.
// ─────────────────────────────────────────────────────────────

/**
 * Nombre del registro en `integraciones_config` para la integración n8n.
 */
export const N8N_INTEGRATION_NAME = 'n8n_webhook_mantenimiento';

/**
 * Tipo del registro en `integraciones_config`.
 */
export const N8N_INTEGRATION_TYPE = 'n8n';

/**
 * Configuración esperada para la integración n8n (schema futuro).
 */
export interface N8NIntegrationConfig {
  /** URL del webhook de n8n */
  endpoint_url: string;
  /** Headers adicionales para autenticación con n8n */
  auth_headers?: Record<string, string>;
  /** Eventos que disparan el webhook */
  trigger_events?: string[];
}

/**
 * Placeholder: obtener la configuración de n8n desde `integraciones_config`.
 * Se implementará cuando se active la integración.
 */
export async function getN8NConfig(): Promise<N8NIntegrationConfig | null> {
  // TODO: Implementar lectura desde Supabase tabla `integraciones_config`
  // where nombre = N8N_INTEGRATION_NAME and activo = true
  return null;
}
