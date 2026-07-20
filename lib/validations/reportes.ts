import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Tipos de reporte disponibles (RF-19)
// ─────────────────────────────────────────────────────────────

const tiposReporte = [
  'combustible',
  'km_recorridos',
  'mantenimiento',
  'eficiencia_rutas',
] as const;

export type TipoReporte = (typeof tiposReporte)[number];

// ─────────────────────────────────────────────────────────────
// Formatos de exportación (RF-20)
// ─────────────────────────────────────────────────────────────

const formatosReporte = ['pdf', 'xlsx'] as const;

export type FormatoReporte = (typeof formatosReporte)[number];

// ─────────────────────────────────────────────────────────────
// Schema de filtros de reporte (RF-21)
// ─────────────────────────────────────────────────────────────

const filtrosReporteSchema = z.object({
  fecha_desde: z
    .string()
    .date('fecha_desde debe ser una fecha válida (YYYY-MM-DD)')
    .optional(),

  fecha_hasta: z
    .string()
    .date('fecha_hasta debe ser una fecha válida (YYYY-MM-DD)')
    .optional(),

  camion_id: z
    .string()
    .uuid('camion_id debe ser un UUID válido')
    .optional(),

  conductor_id: z
    .string()
    .uuid('conductor_id debe ser un UUID válido')
    .optional(),

  ruta_id: z
    .string()
    .uuid('ruta_id debe ser un UUID válido')
    .optional(),
}).optional().default({});

// ─────────────────────────────────────────────────────────────
// Schema principal para generar un reporte
// ─────────────────────────────────────────────────────────────

export const generarReporteSchema = z.object({
  tipo: z.enum(tiposReporte, {
    message: 'Tipo de reporte inválido. Valores: combustible, km_recorridos, mantenimiento, eficiencia_rutas',
  }),

  formato: z.enum(formatosReporte, {
    message: 'Formato inválido. Valores: pdf, xlsx',
  }),

  filtros: filtrosReporteSchema,
});

export type GenerarReporteInput = z.infer<typeof generarReporteSchema>;
