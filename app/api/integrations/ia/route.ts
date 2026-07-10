import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api/responses';

/**
 * Endpoint placeholder para integración con IA.
 *
 * Responde 501 Not Implemented hasta que la integración se active.
 * Cuando se implemente, este endpoint manejará las solicitudes
 * al chatbot y otros servicios de IA.
 */
export async function POST(_request: NextRequest) {
  return errorResponse(
    'Integración con IA no implementada todavía. ' +
    'Este endpoint se activará en una fase posterior.',
    501,
  );
}

export async function GET(_request: NextRequest) {
  return errorResponse(
    'Integración con IA no implementada todavía. ' +
    'Este endpoint se activará en una fase posterior.',
    501,
  );
}
