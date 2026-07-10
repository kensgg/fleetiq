// ─────────────────────────────────────────────────────────────
// FleetIQ — Configuración base para integración con IA
// ─────────────────────────────────────────────────────────────
// Este módulo está preparado pero NO implementado.
// La configuración real se leerá de la tabla `integraciones_config`
// con tipo = 'ia' cuando se active la integración.
// ─────────────────────────────────────────────────────────────

/**
 * Nombre del registro en `integraciones_config` para la integración IA.
 */
export const IA_INTEGRATION_NAME = 'ia_chatbot_endpoint';

/**
 * Tipo del registro en `integraciones_config`.
 */
export const IA_INTEGRATION_TYPE = 'ia';

/**
 * Configuración esperada para la integración IA (schema futuro).
 */
export interface IAIntegrationConfig {
  /** URL del endpoint del modelo de IA */
  endpoint_url: string;
  /** Modelo a utilizar (e.g., 'gpt-4', 'gemini-pro') */
  model?: string;
  /** Temperatura del modelo */
  temperature?: number;
  /** Máximo de tokens en la respuesta */
  max_tokens?: number;
}

/**
 * Placeholder: obtener la configuración de IA desde `integraciones_config`.
 * Se implementará cuando se active la integración.
 */
export async function getIAConfig(): Promise<IAIntegrationConfig | null> {
  // TODO: Implementar lectura desde Supabase tabla `integraciones_config`
  // where nombre = IA_INTEGRATION_NAME and activo = true
  return null;
}
