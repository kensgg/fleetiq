// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de IA para el Chatbot (RF-22, RF-23, RF-24)
// ─────────────────────────────────────────────────────────────
//
// PUNTO DE EXTENSIÓN PARA IA REAL
//
// Este módulo define la interfaz `IAService` y la implementación
// placeholder `PlaceholderIAService` que responde con un mensaje
// fijo. Cuando el módulo de IA real sea implementado:
//
//   1. Crear una clase que implemente `IAService` (e.g., `GeminiIAService`).
//   2. Inyectar el cliente del proveedor (Gemini, OpenAI, etc.) en el constructor.
//   3. Reemplazar `PlaceholderIAService` en el factory `getIAService()`.
//
// Los endpoints REST NO necesitan cambios al conectar la IA real.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

/**
 * Mensaje previo de la conversación para dar contexto al modelo.
 */
export interface MensajeContexto {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

/**
 * Entrada para la generación de una respuesta del asistente.
 */
export interface GenerarRespuestaInput {
  /** El mensaje más reciente del usuario. */
  mensajeUsuario: string;
  /**
   * Historial reciente de la conversación para proveer contexto
   * al modelo de IA. Se recomienda limitar a los últimos N mensajes.
   */
  historial: MensajeContexto[];
  /**
   * ID de la sede del usuario. Útil para que el modelo filtre
   * datos de reportes o rutas en el contexto de la organización.
   */
  sedeId: string;
  /** ID del usuario autenticado que inicia la conversación. */
  userId: string;
}

/**
 * Resultado de la generación de una respuesta del asistente.
 */
export interface GenerarRespuestaOutput {
  /** Texto de la respuesta generada por el asistente. */
  respuesta: string;
  /**
   * Indica si la respuesta fue generada por IA real (`true`)
   * o es un placeholder (`false`).
   */
  esRespuestaReal: boolean;
}

// ─────────────────────────────────────────────────────────────
// Interfaz del servicio de IA
// ─────────────────────────────────────────────────────────────

/**
 * Contrato del servicio de IA del chatbot.
 *
 * Cualquier implementación (placeholder, Gemini, OpenAI, etc.)
 * debe cumplir esta interfaz para ser compatible con los endpoints.
 */
export interface IAService {
  /**
   * Genera una respuesta del asistente dado el mensaje del usuario
   * y el historial de la conversación.
   *
   * @param input - Mensaje, historial y contexto de la sede/usuario.
   * @returns Texto de la respuesta y bandera de si es IA real.
   *
   * TODO (RF-23): Detectar intenciones de "generar reporte" en el
   * mensaje del usuario y llamar a `generarReporte()` de
   * `@/lib/services/reportes` para generar el reporte bajo demanda.
   * Retornar la URL del reporte en la respuesta.
   *
   * TODO (RF-24): Detectar intenciones de "optimizar ruta" o
   * "recomendar rutas" y delegar en `getRouteOptimizer()` de
   * `@/lib/services/route-optimization` para ofrecer sugerencias
   * con base en el historial de rutas de la sede.
   */
  generarRespuesta(input: GenerarRespuestaInput): Promise<GenerarRespuestaOutput>;
}

// ─────────────────────────────────────────────────────────────
// Implementación Placeholder — Usada hasta que RF-22 sea
// implementado con un proveedor real de IA.
// ─────────────────────────────────────────────────────────────

/** Texto fijo que devuelve el placeholder. */
const PLACEHOLDER_MENSAJE =
  'Funcionalidad de IA en construcción. Pronto podrás consultarme sobre ' +
  'reportes de tu flota, estado de rutas y recomendaciones de optimización.';

/**
 * Implementación placeholder del servicio de IA.
 *
 * No realiza ninguna llamada a proveedores externos. Devuelve
 * siempre `PLACEHOLDER_MENSAJE` para que el flujo completo de
 * guardado en DB funcione correctamente durante el desarrollo.
 */
export class PlaceholderIAService implements IAService {
  async generarRespuesta(
    // El parámetro se ignorará hasta que se conecte un proveedor real de IA.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: GenerarRespuestaInput,
  ): Promise<GenerarRespuestaOutput> {
    return {
      respuesta: PLACEHOLDER_MENSAJE,
      esRespuestaReal: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Factory — Punto único de instanciación
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve la implementación activa del servicio de IA.
 *
 * TODO (RF-22): Cambiar a la implementación real cuando el proveedor
 * de IA esté configurado. Ejemplo:
 *   return new GeminiIAService(process.env.GEMINI_API_KEY!);
 */
export function getIAService(): IAService {
  return new PlaceholderIAService();
}
