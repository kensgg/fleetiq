import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { recoverySchema } from '@/lib/validations/auth';

/**
 * RF-04: Recuperación de contraseña.
 * Envía un correo electrónico para restablecer la contraseña a través de Supabase Auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validación
    const result = recoverySchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }
    
    const { email } = result.data;
    const supabase = await createClient();
    
    // Configurar la URL de redirección luego de resetear la contraseña
    // Puede venir en el body, o usamos una por defecto
    const redirectTo = new URL('/auth/update-password', request.url).toString();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    
    if (error) {
      return errorResponse(`Error al procesar la solicitud: ${error.message}`, 400);
    }
    
    return successResponse(
      null,
      'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
