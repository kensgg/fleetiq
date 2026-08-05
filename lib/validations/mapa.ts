import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Validaciones del módulo de Mapas y Geolocalización
// ─────────────────────────────────────────────────────────────

/**
 * Valida el cuerpo del POST /api/rutas/:id/ubicacion.
 *
 * Usado por la app del conductor para reportar su posición en tiempo real.
 * El campo `velocidad_kmh` es opcional.
 *
 * Nota: usa la API de Zod v4 (sin required_error / invalid_type_error en z.number()).
 */
export const reportarUbicacionSchema = z.object({
  lat: z
    .number()
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90'),

  lng: z
    .number()
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180'),

  velocidad_kmh: z
    .number()
    .min(0, 'La velocidad no puede ser negativa')
    .max(300, 'La velocidad no puede superar 300 km/h')
    .optional(),
});

export type ReportarUbicacionInput = z.infer<typeof reportarUbicacionSchema>;

