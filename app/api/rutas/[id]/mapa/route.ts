import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { geocodificarDireccion, GeocodificacionError } from '@/lib/services/geocodificacion';
import { calcularRuta, construirLineStringFallback } from '@/lib/services/osrm';
import type { GeoJsonLineString } from '@/lib/services/osrm';
import type { PuntoIntermedio } from '@/modules/rutas/types';

// ─────────────────────────────────────────────────────────────
// Roles — Lectura ampliada (conductor puede ver su propio mapa)
// ─────────────────────────────────────────────────────────────

const ROLES_LECTURA = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
] as const;

// ─────────────────────────────────────────────────────────────
// GET /api/rutas/[id]/mapa
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve todos los datos necesarios para que el frontend
 * dibuje el mapa de la ruta con Leaflet.js + tiles de OpenStreetMap.
 *
 * Formato de respuesta:
 * - Coordenadas en [lat, lng] (convención Leaflet)
 * - Geometría de ruta en GeoJSON LineString (coordenadas [lng, lat] per spec GeoJSON)
 *
 * Reintentos automáticos:
 * - Si la ruta no tiene lat/lng → geocodifica y guarda en la BD.
 * - Si no tiene distancia/duración → llama a OSRM y guarda en la BD.
 * - Si OSRM falla → construye un LineString de líneas rectas como fallback.
 *
 * Los errores de servicios externos (Nominatim/OSRM caídos) no tumban
 * el endpoint: se incluyen en `_advertencias` y se devuelve la información
 * disponible.
 */
export const GET = withRole(...ROLES_LECTURA)(async ({ params, user }) => {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // ─── Obtener la ruta con datos base ───
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select(`
        id,
        origen,
        destino,
        puntos_intermedios,
        estado,
        origen_lat,
        origen_lng,
        destino_lat,
        destino_lng,
        distancia_km,
        duracion_estimada_min
      `)
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();

    if (rutaError || !ruta) {
      return errorResponse('Ruta no encontrada o no pertenece a tu sede', 404);
    }

    const advertencias: string[] = [];
    const geoUpdate: Record<string, unknown> = {};

    // ─── Obtener/geocodificar origen ───────────────────────────────────────
    let origenCoords: { lat: number; lng: number } | null =
      ruta.origen_lat != null && ruta.origen_lng != null
        ? { lat: ruta.origen_lat as number, lng: ruta.origen_lng as number }
        : null;

    if (!origenCoords) {
      try {
        origenCoords = await geocodificarDireccion(ruta.origen as string);
        geoUpdate.origen_lat = origenCoords.lat;
        geoUpdate.origen_lng = origenCoords.lng;
      } catch (err) {
        const msg =
          err instanceof GeocodificacionError
            ? err.message
            : 'No se pudo geocodificar el origen';
        advertencias.push(msg);
        console.warn(`[FleetIQ][rutas/mapa] ${msg}`);
      }
    }

    // ─── Obtener/geocodificar destino ──────────────────────────────────────
    let destinoCoords: { lat: number; lng: number } | null =
      ruta.destino_lat != null && ruta.destino_lng != null
        ? { lat: ruta.destino_lat as number, lng: ruta.destino_lng as number }
        : null;

    if (!destinoCoords) {
      try {
        destinoCoords = await geocodificarDireccion(ruta.destino as string);
        geoUpdate.destino_lat = destinoCoords.lat;
        geoUpdate.destino_lng = destinoCoords.lng;
      } catch (err) {
        const msg =
          err instanceof GeocodificacionError
            ? err.message
            : 'No se pudo geocodificar el destino';
        advertencias.push(msg);
        console.warn(`[FleetIQ][rutas/mapa] ${msg}`);
      }
    }

    // ─── Geocodificar puntos intermedios sin coordenadas ──────────────────
    const puntosRaw = (ruta.puntos_intermedios ?? []) as PuntoIntermedio[];
    let puntosActualizados = false;
    const puntosConCoords: PuntoIntermedio[] = [];

    for (const punto of puntosRaw) {
      if (punto.lat !== undefined && punto.lng !== undefined) {
        puntosConCoords.push(punto);
      } else {
        try {
          const coords = await geocodificarDireccion(punto.nombre);
          puntosConCoords.push({ ...punto, lat: coords.lat, lng: coords.lng });
          puntosActualizados = true;
        } catch (err) {
          const msg =
            err instanceof GeocodificacionError
              ? err.message
              : `No se pudo geocodificar el punto "${punto.nombre}"`;
          advertencias.push(msg);
          console.warn(`[FleetIQ][rutas/mapa] ${msg}`);
          puntosConCoords.push(punto);
        }
      }
    }

    if (puntosActualizados) {
      geoUpdate.puntos_intermedios = puntosConCoords;
    }

    // ─── Calcular/recuperar distancia y duración ──────────────────────────
    let distanciaKm: number | null = ruta.distancia_km as number | null;
    let duracionMin: number | null = ruta.duracion_estimada_min as number | null;
    let geometriaRuta: GeoJsonLineString | null = null;

    const todosLosPuntos = [
      ...(origenCoords ? [origenCoords] : []),
      ...puntosConCoords
        .filter((p) => p.lat !== undefined && p.lng !== undefined)
        .map((p) => ({ lat: p.lat!, lng: p.lng! })),
      ...(destinoCoords ? [destinoCoords] : []),
    ];

    if (todosLosPuntos.length >= 2) {
      // Recalcular si faltan distancia/duración o para obtener geometría
      const necesitaCalculo = distanciaKm == null || duracionMin == null;

      const osrmResultado = await calcularRuta(todosLosPuntos);

      if (osrmResultado) {
        geometriaRuta = osrmResultado.geometria;
        if (necesitaCalculo) {
          distanciaKm = osrmResultado.distancia_km;
          duracionMin = osrmResultado.duracion_min;
          geoUpdate.distancia_km = distanciaKm;
          geoUpdate.duracion_estimada_min = duracionMin;
        }
      } else {
        advertencias.push(
          'La geometría de la ruta no está disponible (OSRM no responde). ' +
          'Se muestra una línea recta entre los puntos como aproximación.',
        );
        // Fallback: línea recta entre los puntos disponibles
        geometriaRuta = construirLineStringFallback(todosLosPuntos);
      }
    } else {
      advertencias.push(
        'No hay suficientes coordenadas para trazar la ruta en el mapa. ' +
        'Verifica que el origen y destino sean direcciones reconocibles.',
      );
    }

    // ─── Persistir actualizaciones geo ────────────────────────────────────
    if (Object.keys(geoUpdate).length > 0) {
      const { error: updateErr } = await supabase
        .from('rutas')
        .update({ ...geoUpdate, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateErr) {
        console.warn(`[FleetIQ][rutas/mapa] Error al persistir geo: ${updateErr.message}`);
        // No bloqueante — la respuesta continúa con los datos calculados
      }
    }

    // ─── Armar respuesta para Leaflet ─────────────────────────────────────
    // Leaflet usa [lat, lng]. GeoJSON usa [lng, lat].
    // Se devuelven ambas representaciones para máxima compatibilidad.
    return successResponse(
      {
        ruta_id: id,
        estado: ruta.estado,

        // Origen con coordenadas en formato Leaflet [lat, lng]
        origen: {
          texto: ruta.origen,
          lat: origenCoords?.lat ?? null,
          lng: origenCoords?.lng ?? null,
        },

        // Destino con coordenadas en formato Leaflet [lat, lng]
        destino: {
          texto: ruta.destino,
          lat: destinoCoords?.lat ?? null,
          lng: destinoCoords?.lng ?? null,
        },

        // Puntos intermedios con coordenadas [lat, lng]
        puntos_intermedios: puntosConCoords.map((p) => ({
          nombre: p.nombre,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
        })),

        // Geometría de la ruta en GeoJSON LineString (coordenadas [lng, lat])
        // Úsala directamente con L.geoJSON(geometria_ruta) en Leaflet
        geometria_ruta: geometriaRuta,

        // Métricas
        distancia_km: distanciaKm,
        duracion_estimada_min: duracionMin,

        // Advertencias de servicios externos (si los hay)
        ...(advertencias.length > 0 && { _advertencias: advertencias }),
      },
      'Datos de mapa recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});
