import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Crear conductor
// ─────────────────────────────────────────────────────────────

export const createConductorSchema = z.object({
  nombre_completo: z
    .string()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres')
    .max(200, 'El nombre completo no puede exceder 200 caracteres'),

  licencia_numero: z
    .string()
    .min(1, 'El número de licencia es requerido')
    .max(50, 'El número de licencia no puede exceder 50 caracteres'),

  tipo_licencia: z
    .string()
    .min(1, 'El tipo de licencia es requerido')
    .max(50, 'El tipo de licencia no puede exceder 50 caracteres'),

  licencia_vigencia: z
    .string()
    .date('La vigencia de licencia debe ser una fecha válida (YYYY-MM-DD)')
    .refine(
      (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
      'La vigencia de la licencia no puede ser una fecha pasada',
    ),

  estado: z.boolean().optional().default(true),

  profile_id: z
    .string()
    .uuid('El profile_id debe ser un UUID válido')
    .nullable()
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Actualizar conductor (todos los campos opcionales)
// ─────────────────────────────────────────────────────────────

export const updateConductorSchema = z.object({
  nombre_completo: z
    .string()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres')
    .max(200, 'El nombre completo no puede exceder 200 caracteres')
    .optional(),

  licencia_numero: z
    .string()
    .min(1, 'El número de licencia es requerido')
    .max(50, 'El número de licencia no puede exceder 50 caracteres')
    .optional(),

  tipo_licencia: z
    .string()
    .min(1, 'El tipo de licencia es requerido')
    .max(50, 'El tipo de licencia no puede exceder 50 caracteres')
    .optional(),

  licencia_vigencia: z
    .string()
    .date('La vigencia de licencia debe ser una fecha válida (YYYY-MM-DD)')
    .refine(
      (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
      'La vigencia de la licencia no puede ser una fecha pasada',
    )
    .optional(),

  estado: z.boolean().optional(),

  profile_id: z
    .string()
    .uuid('El profile_id debe ser un UUID válido')
    .nullable()
    .optional(),
});
