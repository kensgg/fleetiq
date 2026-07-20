import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Valores válidos para los enums de PostgreSQL
// ─────────────────────────────────────────────────────────────

const estadosRuta = [
  'pendiente',
  'en_curso',
  'completada',
  'cancelada',
] as const;

// ─────────────────────────────────────────────────────────────
// Schema para puntos intermedios (JSONB)
// ─────────────────────────────────────────────────────────────

/**
 * Cada punto intermedio puede tener un nombre descriptivo
 * y, opcionalmente, coordenadas geográficas.
 */
const puntoIntermedioSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre del punto es requerido')
    .max(200, 'El nombre del punto no puede exceder 200 caracteres'),

  lat: z
    .number()
    .min(-90, 'Latitud mínima es -90')
    .max(90, 'Latitud máxima es 90')
    .optional(),

  lng: z
    .number()
    .min(-180, 'Longitud mínima es -180')
    .max(180, 'Longitud máxima es 180')
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Crear ruta (RF-13)
// ─────────────────────────────────────────────────────────────

export const createRutaSchema = z.object({
  camion_id: z
    .string()
    .uuid('El camion_id debe ser un UUID válido'),

  conductor_id: z
    .string()
    .uuid('El conductor_id debe ser un UUID válido'),

  origen: z
    .string()
    .min(1, 'El origen es requerido')
    .max(200, 'El origen no puede exceder 200 caracteres'),

  destino: z
    .string()
    .min(1, 'El destino es requerido')
    .max(200, 'El destino no puede exceder 200 caracteres'),

  puntos_intermedios: z
    .array(puntoIntermedioSchema)
    .max(50, 'No se permiten más de 50 puntos intermedios')
    .optional()
    .default([]),

  fecha_estimada: z
    .string()
    .datetime({ message: 'La fecha estimada debe ser una fecha ISO 8601 válida (e.g., 2026-08-01T10:00:00Z)' }),
});

// ─────────────────────────────────────────────────────────────
// Actualizar estado de ruta (RF-14)
// ─────────────────────────────────────────────────────────────

/**
 * Solo valida que el nuevo estado sea un valor válido del enum.
 * La validación de transiciones permitidas se hace en el handler
 * usando la máquina de estados `TRANSICIONES_VALIDAS`.
 */
export const updateEstadoRutaSchema = z.object({
  estado: z.enum(estadosRuta, {
    message: 'Estado inválido. Valores permitidos: pendiente, en_curso, completada, cancelada',
  }),
});

// ─────────────────────────────────────────────────────────────
// Máquina de estados — Transiciones permitidas (RF-14)
// ─────────────────────────────────────────────────────────────

/**
 * Define las transiciones válidas desde cada estado.
 * - pendiente  → en_curso, cancelada
 * - en_curso   → completada, cancelada
 * - completada → (ninguna)
 * - cancelada  → (ninguna)
 */
export const TRANSICIONES_VALIDAS: Record<string, readonly string[]> = {
  pendiente: ['en_curso', 'cancelada'],
  en_curso: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
} as const;

export type EstadoRutaValue = (typeof estadosRuta)[number];
