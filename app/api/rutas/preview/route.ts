import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { geocodificarDireccion, GeocodificacionError } from '@/lib/services/geocodificacion';
import { calcularRuta, construirLineStringFallback } from '@/lib/services/osrm';
import { withRole } from '@/lib/api/middleware/authorize';

const ROLES_PERMITIDOS = [
  'administrador',
  'gerente_operaciones',
  'supervisor'
] as const;

export const POST = withRole(...ROLES_PERMITIDOS)(async ({ request }) => {
  try {
    const body = await request.json();
    const { origen, destino, puntos_intermedios = [] } = body;

    if (!origen || !destino) {
      return errorResponse('El origen y el destino son obligatorios', 400);
    }

    const advertencias: string[] = [];

    // 1. Geocodificar origen
    let origenCoords;
    try {
      origenCoords = await geocodificarDireccion(origen);
    } catch (err) {
      return errorResponse(`No se pudo encontrar el origen: ${origen}`, 400);
    }

    // 2. Geocodificar destino
    let destinoCoords;
    try {
      destinoCoords = await geocodificarDireccion(destino);
    } catch (err) {
      return errorResponse(`No se pudo encontrar el destino: ${destino}`, 400);
    }

    // 3. Geocodificar puntos intermedios
    const puntosConCoords = [];
    for (const punto of puntos_intermedios) {
      if (!punto.nombre) continue;
      try {
        const coords = await geocodificarDireccion(punto.nombre);
        puntosConCoords.push({ nombre: punto.nombre, ...coords });
      } catch (err) {
        advertencias.push(`No se pudo encontrar la parada: ${punto.nombre}`);
      }
    }

    // 4. Calcular ruta con OSRM
    const todosLosPuntos = [
      origenCoords,
      ...puntosConCoords.map(p => ({ lat: p.lat, lng: p.lng })),
      destinoCoords
    ];

    let geometriaRuta = null;
    let distanciaKm = null;
    let duracionMin = null;

    const osrmResultado = await calcularRuta(todosLosPuntos);

    if (osrmResultado) {
      geometriaRuta = osrmResultado.geometria;
      distanciaKm = osrmResultado.distancia_km;
      duracionMin = osrmResultado.duracion_min;
    } else {
      advertencias.push('OSRM no está disponible. Mostrando línea recta de aproximación.');
      geometriaRuta = construirLineStringFallback(todosLosPuntos);
    }

    return successResponse(
      {
        origen: { texto: origen, ...origenCoords },
        destino: { texto: destino, ...destinoCoords },
        puntos_intermedios: puntosConCoords,
        geometria_ruta: geometriaRuta,
        distancia_km: distanciaKm,
        duracion_estimada_min: duracionMin,
        ...(advertencias.length > 0 && { _advertencias: advertencias })
      },
      'Preview de ruta calculado exitosamente'
    );
  } catch (error) {
    return errorResponse('Error interno al calcular preview de la ruta', 500);
  }
});
