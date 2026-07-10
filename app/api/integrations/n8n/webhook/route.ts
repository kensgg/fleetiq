import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api/responses';

/**
 * Webhook placeholder para n8n.
 *
 * Responde 501 Not Implemented hasta que la integración se active.
 * Cuando se implemente, este endpoint recibirá eventos de n8n
 * (e.g., notificaciones de mantenimiento, alertas automáticas).
 */
export async function POST(_request: NextRequest) {
  return errorResponse(
    'Integración con n8n no implementada todavía. ' +
    'Este endpoint se activará en una fase posterior.',
    501,
  );
}

export async function GET(_request: NextRequest) {
  return errorResponse(
    'Integración con n8n no implementada todavía. ' +
    'Este endpoint se activará en una fase posterior.',
    501,
  );
}
