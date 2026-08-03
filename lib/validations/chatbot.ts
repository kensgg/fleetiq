import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Validaciones del módulo de Chatbot / IA (RF-22 a RF-24)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// POST /api/chatbot/conversaciones — Iniciar conversación
// ─────────────────────────────────────────────────────────────

/**
 * Schema para iniciar una nueva conversación de chatbot.
 * El campo `contexto` es opcional y puede contener metadatos
 * como el módulo desde donde se inicia (rutas, reportes, etc.).
 */
export const iniciarConversacionSchema = z.object({
  contexto: z
    .string()
    .max(500, 'El contexto no puede superar los 500 caracteres')
    .optional(),
});

export type IniciarConversacionInput = z.infer<typeof iniciarConversacionSchema>;

// ─────────────────────────────────────────────────────────────
// POST /api/chatbot/conversaciones/[id]/mensajes — Enviar mensaje
// ─────────────────────────────────────────────────────────────

/**
 * Schema para enviar un mensaje en una conversación existente.
 */
export const enviarMensajeSchema = z.object({
  contenido: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(4000, 'El mensaje no puede superar los 4000 caracteres'),
});

export type EnviarMensajeInput = z.infer<typeof enviarMensajeSchema>;
