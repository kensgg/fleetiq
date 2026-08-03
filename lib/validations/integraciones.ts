import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Validaciones del módulo de Integraciones (n8n)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CRUD de integraciones_config
// ─────────────────────────────────────────────────────────────

/**
 * Tipos de integración soportados.
 */
export const tiposIntegracion = ['n8n', 'ia', 'otro'] as const;
export type TipoIntegracion = (typeof tiposIntegracion)[number];

/**
 * Schema para crear una nueva integración.
 */
export const crearIntegracionSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .regex(
      /^[a-z0-9_]+$/,
      'El nombre solo puede contener letras minúsculas, números y guiones bajos',
    ),

  tipo: z.enum(tiposIntegracion, {
    message: 'Tipo de integración inválido. Valores: n8n, ia, otro',
  }),

  endpoint_url: z
    .string()
    .url('endpoint_url debe ser una URL válida')
    .optional()
    .nullable(),

  activo: z.boolean().optional().default(false),

  config: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

export type CrearIntegracionInput = z.infer<typeof crearIntegracionSchema>;

/**
 * Schema para actualizar una integración existente (todos los campos opcionales).
 */
export const actualizarIntegracionSchema = z.object({
  nombre: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9_]+$/,
      'El nombre solo puede contener letras minúsculas, números y guiones bajos',
    )
    .optional(),

  tipo: z.enum(tiposIntegracion).optional(),

  endpoint_url: z
    .string()
    .url('endpoint_url debe ser una URL válida')
    .optional()
    .nullable(),

  activo: z.boolean().optional(),

  config: z.record(z.string(), z.unknown()).optional(),
});

export type ActualizarIntegracionInput = z.infer<typeof actualizarIntegracionSchema>;
