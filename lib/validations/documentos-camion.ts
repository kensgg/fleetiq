import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Valores válidos para el enum tipo_documento_camion
// ─────────────────────────────────────────────────────────────

const tiposDocumento = [
  'tarjeta_circulacion',
  'seguro',
  'verificacion',
  'permiso_sct',
] as const;

// ─────────────────────────────────────────────────────────────
// Crear documento de camión
// ─────────────────────────────────────────────────────────────

export const createDocumentoCamionSchema = z.object({
  tipo_documento: z.enum(tiposDocumento, {
    message:
      'Tipo de documento inválido. Valores permitidos: tarjeta_circulacion, seguro, verificacion, permiso_sct',
  }),

  archivo_url: z
    .string()
    .url('La URL del archivo no es válida')
    .nullable()
    .optional(),

  fecha_vencimiento: z
    .string()
    .date('La fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)')
    .refine(
      (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
      'La fecha de vencimiento no puede ser una fecha pasada',
    )
    .nullable()
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Actualizar documento de camión
// ─────────────────────────────────────────────────────────────

export const updateDocumentoCamionSchema = z.object({
  tipo_documento: z
    .enum(tiposDocumento, {
      message:
        'Tipo de documento inválido. Valores permitidos: tarjeta_circulacion, seguro, verificacion, permiso_sct',
    })
    .optional(),

  archivo_url: z
    .string()
    .url('La URL del archivo no es válida')
    .nullable()
    .optional(),

  fecha_vencimiento: z
    .string()
    .date('La fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)')
    .refine(
      (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
      'La fecha de vencimiento no puede ser una fecha pasada',
    )
    .nullable()
    .optional(),
});
