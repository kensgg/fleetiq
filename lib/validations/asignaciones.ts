import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Crear asignación conductor-camión
// ─────────────────────────────────────────────────────────────

export const createAsignacionSchema = z.object({
  camion_id: z
    .string()
    .uuid('El camion_id debe ser un UUID válido'),

  conductor_id: z
    .string()
    .uuid('El conductor_id debe ser un UUID válido'),
});
