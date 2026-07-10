import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { loginSchema } from '@/lib/validations/auth';

/**
 * RF-01: Inicio de sesión.
 * Autentica al usuario en Supabase, estableciendo la sesión via cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validación
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }
    
    const { email, password } = result.data;
    
    const supabase = await createClient();
    
    // Autenticar
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return errorResponse(`Credenciales incorrectas o usuario no encontrado: ${error.message}`, 401);
    }
    
    // Supabase SSR ya maneja el set-cookie de la sesión en el contexto de Next.js
    
    return successResponse(
      { user: data.user },
      'Inicio de sesión exitoso.',
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
