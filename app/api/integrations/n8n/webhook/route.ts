import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api/responses';

// ─────────────────────────────────────────────────────────────
// /api/integrations/n8n/webhook (ruta base sin [nombre])
// ─────────────────────────────────────────────────────────────
//
// Esta ruta base existe como guía de uso.
// El webhook real con validación dinámica está en:
//   POST /api/integrations/n8n/webhook/[nombre]
// ─────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  return errorResponse(
    'Ruta incorrecta. Use POST /api/integrations/n8n/webhook/{nombre} ' +
    'donde {nombre} es el identificador de la integración registrada en integraciones_config.',
    400,
  );
}

export async function GET(_request: NextRequest) {
  return errorResponse(
    'Use GET /api/integrations/n8n/webhook/{nombre} para verificar el estado de una integración específica.',
    400,
  );
}
