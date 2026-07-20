// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Optimización de Rutas (RF-24)
// ─────────────────────────────────────────────────────────────
//
// PUNTO DE EXTENSIÓN PARA IA
//
// Este módulo define la interfaz para el futuro servicio de
// optimización de rutas mediante inteligencia artificial.
// Actualmente usa una implementación "passthrough" que no
// modifica los datos. Cuando se implemente RF-24, se deberá:
//
// 1. Crear una clase que implemente `IRouteOptimizationService`.
// 2. Conectar con el endpoint de IA (e.g., Google Maps API,
//    modelo de ML propio, o servicio externo vía n8n).
// 3. Reemplazar `PassthroughOptimizer` por la implementación real
//    en el factory `getRouteOptimizer()`.
//
// La interfaz está diseñada para ser asíncrona y recibir todos
// los datos necesarios para la optimización sin acoplarse a la
// base de datos.
// ─────────────────────────────────────────────────────────────

/**
 * Punto intermedio de una ruta.
 */
export interface PuntoIntermedio {
  nombre: string;
  lat?: number;
  lng?: number;
}

/**
 * Datos de entrada para la optimización de una ruta.
 */
export interface RouteOptimizationInput {
  origen: string;
  destino: string;
  puntos_intermedios: PuntoIntermedio[];
  /** ID del camión asignado (puede influir en restricciones de carga/tamaño). */
  camion_id: string;
  /** Fecha estimada de la ruta. */
  fecha_estimada: string;
}

/**
 * Resultado de la optimización de ruta.
 */
export interface RouteOptimizationResult {
  /** Puntos intermedios optimizados (reordenados, agregados o eliminados). */
  puntos_intermedios_optimizados: PuntoIntermedio[];
  /** Distancia estimada total en kilómetros (null si no disponible). */
  distancia_estimada_km: number | null;
  /** Duración estimada en minutos (null si no disponible). */
  duracion_estimada_min: number | null;
  /** Indica si la optimización fue aplicada o es passthrough. */
  optimizado: boolean;
  /** Mensaje informativo sobre la optimización. */
  mensaje: string;
}

/**
 * Interfaz del servicio de optimización de rutas.
 *
 * TODO (RF-24): Implementar con servicio de IA real.
 * Posibles integraciones:
 * - Google Maps Directions API / Route Optimization API
 * - Modelo ML propio entrenado con datos históricos de FleetIQ
 * - Servicio externo orquestado vía n8n webhook
 */
export interface IRouteOptimizationService {
  /**
   * Optimiza una ruta sugerida, reordenando puntos intermedios
   * y calculando distancias/duraciones estimadas.
   *
   * @param input - Datos de la ruta a optimizar.
   * @returns Resultado con los puntos optimizados y métricas.
   */
  optimizeRoute(input: RouteOptimizationInput): Promise<RouteOptimizationResult>;
}

// ─────────────────────────────────────────────────────────────
// Implementación Passthrough (no-op) — Usada hasta que RF-24
// sea implementado con un servicio de IA real.
// ─────────────────────────────────────────────────────────────

/**
 * Implementación passthrough que devuelve los puntos sin modificar.
 * Sirve como placeholder funcional que no rompe el flujo de creación.
 */
export class PassthroughOptimizer implements IRouteOptimizationService {
  async optimizeRoute(input: RouteOptimizationInput): Promise<RouteOptimizationResult> {
    return {
      puntos_intermedios_optimizados: input.puntos_intermedios,
      distancia_estimada_km: null,
      duracion_estimada_min: null,
      optimizado: false,
      mensaje: 'Optimización de rutas no disponible. Se usarán los puntos intermedios tal cual fueron proporcionados.',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Factory — Punto único de instanciación
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve la implementación activa del optimizador de rutas.
 *
 * TODO (RF-24): Cambiar a la implementación real cuando esté lista.
 * Ejemplo:
 *   return new AIRouteOptimizer(config);
 */
export function getRouteOptimizer(): IRouteOptimizationService {
  return new PassthroughOptimizer();
}
