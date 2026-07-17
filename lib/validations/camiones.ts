import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Valores válidos para el enum estado_camion de PostgreSQL
// ─────────────────────────────────────────────────────────────

const estadosCamion = [
  'disponible',
  'en_ruta',
  'mantenimiento',
  'fuera_servicio',
] as const;

// ─────────────────────────────────────────────────────────────
// Crear camión
// ─────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

export const createCamionSchema = z.object({
  numero_unidad: z
    .string()
    .min(1, 'El número de unidad es requerido')
    .max(50, 'El número de unidad no puede exceder 50 caracteres'),

  marca: z
    .string()
    .min(1, 'La marca es requerida')
    .max(100, 'La marca no puede exceder 100 caracteres'),

  modelo: z
    .string()
    .min(1, 'El modelo es requerido')
    .max(100, 'El modelo no puede exceder 100 caracteres'),

  anio: z
    .number({ message: 'El año debe ser un número' })
    .int('El año debe ser un número entero')
    .min(1990, 'El año mínimo es 1990')
    .max(currentYear + 2, `El año máximo es ${currentYear + 2}`),

  placas: z
    .string()
    .min(1, 'Las placas son requeridas')
    .max(20, 'Las placas no pueden exceder 20 caracteres'),

  numero_serie: z
    .string()
    .min(1, 'El número de serie es requerido')
    .max(50, 'El número de serie no puede exceder 50 caracteres'),

  tipo_carga: z
    .string()
    .max(100, 'El tipo de carga no puede exceder 100 caracteres')
    .nullable()
    .optional(),

  estado: z
    .enum(estadosCamion, {
      message: 'Estado inválido. Valores permitidos: disponible, en_ruta, mantenimiento, fuera_servicio',
    })
    .optional()
    .default('disponible'),
});

// ─────────────────────────────────────────────────────────────
// Actualizar camión (todos los campos opcionales)
// ─────────────────────────────────────────────────────────────

export const updateCamionSchema = z.object({
  numero_unidad: z
    .string()
    .min(1, 'El número de unidad es requerido')
    .max(50, 'El número de unidad no puede exceder 50 caracteres')
    .optional(),

  marca: z
    .string()
    .min(1, 'La marca es requerida')
    .max(100, 'La marca no puede exceder 100 caracteres')
    .optional(),

  modelo: z
    .string()
    .min(1, 'El modelo es requerido')
    .max(100, 'El modelo no puede exceder 100 caracteres')
    .optional(),

  anio: z
    .number({ message: 'El año debe ser un número' })
    .int('El año debe ser un número entero')
    .min(1990, 'El año mínimo es 1990')
    .max(currentYear + 2, `El año máximo es ${currentYear + 2}`)
    .optional(),

  placas: z
    .string()
    .min(1, 'Las placas son requeridas')
    .max(20, 'Las placas no pueden exceder 20 caracteres')
    .optional(),

  numero_serie: z
    .string()
    .min(1, 'El número de serie es requerido')
    .max(50, 'El número de serie no puede exceder 50 caracteres')
    .optional(),

  tipo_carga: z
    .string()
    .max(100, 'El tipo de carga no puede exceder 100 caracteres')
    .nullable()
    .optional(),

  estado: z
    .enum(estadosCamion, {
      message: 'Estado inválido. Valores permitidos: disponible, en_ruta, mantenimiento, fuera_servicio',
    })
    .optional(),
});
