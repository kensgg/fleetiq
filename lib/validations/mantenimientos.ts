import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Crear mantenimiento
// ─────────────────────────────────────────────────────────────

export const createMantenimientoSchema = z.object({
  fecha: z
    .string()
    .date('La fecha debe ser una fecha válida (YYYY-MM-DD)'),

  tipo: z
    .string()
    .min(1, 'El tipo de mantenimiento es requerido')
    .max(100, 'El tipo de mantenimiento no puede exceder 100 caracteres'),

  costo: z
    .number({ message: 'El costo debe ser un número' })
    .min(0, 'El costo no puede ser negativo'),

  proveedor: z
    .string()
    .max(200, 'El proveedor no puede exceder 200 caracteres')
    .nullable()
    .optional(),

  kilometraje: z
    .number({ message: 'El kilometraje debe ser un número' })
    .int('El kilometraje debe ser un número entero')
    .min(0, 'El kilometraje no puede ser negativo')
    .nullable()
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Actualizar mantenimiento (todos los campos opcionales)
// ─────────────────────────────────────────────────────────────

export const updateMantenimientoSchema = z.object({
  fecha: z
    .string()
    .date('La fecha debe ser una fecha válida (YYYY-MM-DD)')
    .optional(),

  tipo: z
    .string()
    .min(1, 'El tipo de mantenimiento es requerido')
    .max(100, 'El tipo de mantenimiento no puede exceder 100 caracteres')
    .optional(),

  costo: z
    .number({ message: 'El costo debe ser un número' })
    .min(0, 'El costo no puede ser negativo')
    .optional(),

  proveedor: z
    .string()
    .max(200, 'El proveedor no puede exceder 200 caracteres')
    .nullable()
    .optional(),

  kilometraje: z
    .number({ message: 'El kilometraje debe ser un número' })
    .int('El kilometraje debe ser un número entero')
    .min(0, 'El kilometraje no puede ser negativo')
    .nullable()
    .optional(),
});
