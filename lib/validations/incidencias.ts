import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Valores válidos para el enum tipo_incidencia de PostgreSQL
// ─────────────────────────────────────────────────────────────

const tiposIncidencia = [
  'accidente',
  'retraso',
  'falla_mecanica',
  'otro',
] as const;

// ─────────────────────────────────────────────────────────────
// Crear incidencia en ruta (RF-15)
// ─────────────────────────────────────────────────────────────

/**
 * Valida los datos para registrar una incidencia en una ruta activa.
 * La `evidencia_url` es opcional: el frontend sube la imagen a
 * Supabase Storage (bucket "incidencias") y envía la URL pública.
 */
export const createIncidenciaSchema = z.object({
  tipo: z.enum(tiposIncidencia, {
    message: 'Tipo de incidencia inválido. Valores permitidos: accidente, retraso, falla_mecanica, otro',
  }),

  descripcion: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),

  evidencia_url: z
    .string()
    .url('La URL de evidencia debe ser una URL válida')
    .nullable()
    .optional(),
});
