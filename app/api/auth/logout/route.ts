import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';

/**
 * RF-01: Cierre de sesión.
 * Cierra la sesión en Supabase y limpia las cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return errorResponse(`Error al cerrar sesión: ${error.message}`, 500);
    }
    
    return successResponse(null, 'Sesión cerrada correctamente.', 200);
  } catch (error) {
    return handleApiError(error);
  }
}
