// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Geocodificación (Nominatim / OpenStreetMap)
// ─────────────────────────────────────────────────────────────
//
// Política de uso de Nominatim:
//   - Máximo 1 solicitud por segundo por IP.
//   - Header User-Agent identificando la aplicación (requerido).
//   - No realizar geocodificación masiva/paralela.
//   - Los resultados se cachean en la BD (columnas lat/lng de cada fila)
//     para no repetir la misma consulta.
//
// Referencia: https://nominatim.org/release-docs/latest/api/Overview/
// ─────────────────────────────────────────────────────────────

// ─── Configuración desde variables de entorno ────────────────

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ?? 'FleetIQ/1.0 (contacto@fleetiq.com)';

/** Timeout en ms para cada llamada a Nominatim. */
const NOMINATIM_TIMEOUT_MS = 10_000;

/** Pausa mínima entre solicitudes para cumplir la política de 1 req/s. */
const NOMINATIM_MIN_INTERVAL_MS = 1_100; // 1.1 s — margen de seguridad

// ─── Rate-limiter interno ─────────────────────────────────────
//
// Encadena las solicitudes a través de una promesa compartida (cola FIFO).
// Cada llamada espera a que la anterior termine antes de continuar,
// garantizando que no se envíen dos peticiones simultáneas.
//
// IMPORTANTE: este rate-limiter es por proceso de Node.js.
// En entornos multi-instancia (clúster, Kubernetes) se debe usar
// un rate-limiter distribuido (Redis, etc.).
// ─────────────────────────────────────────────────────────────

let rateLimiterChain: Promise<void> = Promise.resolve();

/**
 * Encola una función `fn` para ejecutarse con al menos
 * `NOMINATIM_MIN_INTERVAL_MS` de separación respecto a la anterior.
 */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = rateLimiterChain.then(async () => {
    const t0 = Date.now();
    const value = await fn();
    const elapsed = Date.now() - t0;
    const remaining = NOMINATIM_MIN_INTERVAL_MS - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    return value;
  });

  // La cadena solo espera el intervalo, sin propagar el resultado de fn.
  // Así, un error en fn no rompe la cola para los siguientes.
  rateLimiterChain = result.then(
    () => {},
    () => {},
  );

  return result;
}

// ─── Tipos ───────────────────────────────────────────────────

/** Coordenadas geográficas resultantes de la geocodificación. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Respuesta cruda de Nominatim. */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ─── Errores ─────────────────────────────────────────────────

/**
 * Error específico de geocodificación.
 * Permite distinguirlo de otros errores en el caller.
 */
export class GeocodificacionError extends Error {
  constructor(
    public readonly direccion: string,
    cause: unknown,
  ) {
    const msg =
      cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : 'Error desconocido';

    super(`No se pudo geocodificar la dirección "${direccion}": ${msg}`);
    this.name = 'GeocodificacionError';
  }
}

// ─── Función principal ────────────────────────────────────────

/**
 * Geocodifica una dirección de texto usando Nominatim de OpenStreetMap.
 *
 * El resultado debe cachearse en la BD (columnas `origen_lat`/`origen_lng`
 * o `destino_lat`/`destino_lng` de la tabla `rutas`, o `lat`/`lng` en
 * `puntos_intermedios`) para no repetir la consulta.
 *
 * @param direccion - Texto de la dirección a geocodificar.
 * @returns Coordenadas `{ lat, lng }`.
 * @throws {GeocodificacionError} Si Nominatim no encuentra la dirección
 *   o si la solicitud falla (timeout, red caída, etc.).
 *
 * @example
 * const coords = await geocodificarDireccion('Ciudad de México, CDMX, México');
 * // { lat: 19.4326, lng: -99.1332 }
 */
export async function geocodificarDireccion(
  direccion: string,
): Promise<Coordenadas> {
  return enqueue(() => _doRequest(direccion));
}

/**
 * Geocodifica múltiples direcciones secuencialmente, respetando el
 * rate-limit de Nominatim (1 req/s). Si una dirección falla, el error
 * se registra en el campo `error` del resultado correspondiente y se
 * continúa con las siguientes.
 *
 * @param direcciones - Array de textos a geocodificar.
 * @returns Array con el resultado para cada dirección (coordenadas o error).
 */
export async function geocodificarMuchas(
  direcciones: string[],
): Promise<Array<{ direccion: string; coords: Coordenadas | null; error?: string }>> {
  const resultados: Array<{ direccion: string; coords: Coordenadas | null; error?: string }> = [];

  for (const direccion of direcciones) {
    try {
      const coords = await geocodificarDireccion(direccion);
      resultados.push({ direccion, coords });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[FleetIQ][geocodificacion] Fallo: ${msg}`);
      resultados.push({ direccion, coords: null, error: msg });
    }
  }

  return resultados;
}

// ─── Implementación interna ───────────────────────────────────

async function _doRequest(direccion: string): Promise<Coordenadas> {
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', direccion);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeocodificacionError(
        direccion,
        `Timeout después de ${NOMINATIM_TIMEOUT_MS / 1000}s`,
      );
    }
    throw new GeocodificacionError(direccion, err);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new GeocodificacionError(
      direccion,
      `Nominatim respondió con HTTP ${response.status}`,
    );
  }

  let resultados: NominatimResult[];
  try {
    resultados = (await response.json()) as NominatimResult[];
  } catch {
    throw new GeocodificacionError(direccion, 'Respuesta de Nominatim no es JSON válido');
  }

  if (!Array.isArray(resultados) || resultados.length === 0) {
    throw new GeocodificacionError(
      direccion,
      'La dirección no fue encontrada. Intenta con una descripción más específica.',
    );
  }

  const primero = resultados[0];
  const lat = parseFloat(primero.lat);
  const lng = parseFloat(primero.lon);

  if (isNaN(lat) || isNaN(lng)) {
    throw new GeocodificacionError(
      direccion,
      'Nominatim devolvió coordenadas inválidas',
    );
  }

  return { lat, lng };
}
