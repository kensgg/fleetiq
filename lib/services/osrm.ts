// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Cálculo de Rutas (OSRM)
// ─────────────────────────────────────────────────────────────
//
// OSRM (Open Source Routing Machine) calcula rutas viales reales
// dados puntos de coordenadas. Se usa el perfil "driving" por defecto.
//
// Endpoint usado: /route/v1/driving/{coordenadas}
//   ?overview=full          — geometría completa de la ruta
//   &geometries=geojson     — formato GeoJSON (LineString)
//   &steps=false            — sin pasos de navegación (no los necesitamos)
//
// Referencia: http://project-osrm.org/docs/v5.24.0/api/
//
// IMPORTANTE: El servidor demo público (router.project-osrm.org) es solo
// para desarrollo y pruebas. En producción, apuntar OSRM_BASE_URL a un
// servidor OSRM propio o a una instancia dedicada.
// ─────────────────────────────────────────────────────────────

import type { Coordenadas } from './geocodificacion';

// ─── Configuración ────────────────────────────────────────────

const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';

/** Timeout en ms para cada llamada a OSRM. */
const OSRM_TIMEOUT_MS = 15_000;

// ─── Tipos ───────────────────────────────────────────────────

/**
 * Geometría de la ruta en formato GeoJSON LineString.
 * Las coordenadas siguen el estándar GeoJSON: [lng, lat] (¡no lat, lng!).
 * Leaflet acepta GeoJSON directamente con L.geoJSON().
 */
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat][]
}

/**
 * Resultado del cálculo de ruta por OSRM.
 */
export interface OsrmResult {
  /** Geometría de la ruta completa en GeoJSON LineString. */
  geometria: GeoJsonLineString;
  /** Distancia total en kilómetros (redondeada a 3 decimales). */
  distancia_km: number;
  /** Duración estimada en minutos (redondeada al entero más cercano). */
  duracion_min: number;
}

/**
 * Respuesta cruda de la API de OSRM.
 * Solo se tipean los campos que se usan.
 */
interface OsrmApiResponse {
  code: string; // 'Ok' en caso de éxito
  routes?: Array<{
    distance: number; // metros
    duration: number; // segundos
    geometry: GeoJsonLineString;
  }>;
  message?: string;
}

// ─── Errores ─────────────────────────────────────────────────

/**
 * Error específico del servicio OSRM.
 * Permite distinguirlo de otros errores y manejarlo graciosamente.
 */
export class OsrmError extends Error {
  constructor(causa: unknown) {
    const msg =
      causa instanceof Error
        ? causa.message
        : typeof causa === 'string'
          ? causa
          : 'Error desconocido en OSRM';
    super(`Error al calcular la ruta con OSRM: ${msg}`);
    this.name = 'OsrmError';
  }
}

// ─── Función principal ────────────────────────────────────────

/**
 * Calcula la ruta vial entre dos o más puntos usando OSRM.
 *
 * Requiere mínimo dos coordenadas (origen y destino).
 * Los puntos intermedios se pasan como elementos adicionales del array.
 *
 * @param puntos - Array de coordenadas [origen, ...intermedios, destino].
 *   Todos los puntos deben tener lat y lng válidos.
 * @returns `OsrmResult` con geometría GeoJSON, distancia en km y duración en min.
 *   Retorna `null` si OSRM falla o está no disponible, para que el caller
 *   pueda manejar el error sin tumbar el flujo principal.
 *
 * @example
 * const resultado = await calcularRuta([
 *   { lat: 19.4326, lng: -99.1332 }, // CDMX
 *   { lat: 20.9674, lng: -89.5926 }, // Mérida
 * ]);
 * if (resultado) {
 *   console.log(resultado.distancia_km, resultado.duracion_min);
 * }
 */
export async function calcularRuta(
  puntos: Coordenadas[],
): Promise<OsrmResult | null> {
  if (puntos.length < 2) {
    console.warn('[FleetIQ][osrm] Se requieren al menos 2 puntos para calcular una ruta.');
    return null;
  }

  // OSRM recibe coordenadas como {lng},{lat} separadas por punto y coma
  const coordenadasStr = puntos
    .map((p) => `${p.lng},${p.lat}`)
    .join(';');

  const url = new URL(`${OSRM_BASE_URL}/route/v1/driving/${coordenadasStr}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[FleetIQ][osrm] Timeout después de ${OSRM_TIMEOUT_MS / 1000}s`);
    } else {
      console.warn('[FleetIQ][osrm] Error de red:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    console.warn(`[FleetIQ][osrm] HTTP ${response.status} al calcular ruta`);
    return null;
  }

  let data: OsrmApiResponse;
  try {
    data = (await response.json()) as OsrmApiResponse;
  } catch {
    console.warn('[FleetIQ][osrm] Respuesta no es JSON válido');
    return null;
  }

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    console.warn(`[FleetIQ][osrm] OSRM respondió con código "${data.code}": ${data.message ?? 'sin detalle'}`);
    return null;
  }

  const ruta = data.routes[0];

  return {
    geometria: ruta.geometry,
    distancia_km: Math.round((ruta.distance / 1000) * 1000) / 1000, // 3 decimales
    duracion_min: Math.round(ruta.duration / 60),
  };
}

/**
 * Construye un GeoJSON LineString simple (línea recta) a partir de
 * coordenadas, usado como fallback cuando OSRM no está disponible.
 *
 * Las coordenadas siguen el formato GeoJSON: [lng, lat].
 */
export function construirLineStringFallback(
  puntos: Coordenadas[],
): GeoJsonLineString {
  return {
    type: 'LineString',
    coordinates: puntos.map((p) => [p.lng, p.lat]),
  };
}
