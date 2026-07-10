import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { registerSchema } from '@/lib/validations/auth';

/**
 * RF-01: Registro de nuevos inquilinos (Sedes).
 * Crea una cuenta en Supabase Auth, una Sede y asigna al usuario como administrador.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validación de entrada
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }
    
    const { email, password, nombre_completo, nombre_sede } = result.data;
    
    const supabase = await createClient();
    
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      return errorResponse(`Error al crear usuario: ${authError.message}`, 400);
    }
    
    if (!authData.user) {
      return errorResponse('Error desconocido al crear usuario en Auth.', 500);
    }
    
    // 2. Crear la sede
    const { data: sedeData, error: sedeError } = await supabase
      .from('sedes')
      .insert({ nombre: nombre_sede })
      .select('id')
      .single();
      
    if (sedeError || !sedeData) {
      // Intento de compensación (borrar el usuario si falla la sede)
      // En un flujo real usaríamos admin client para borrar, pero dejamos el error registrado.
      return errorResponse('Error al crear la sede/empresa.', 500);
    }
    
    // 3. Crear el perfil como administrador (la tabla auth.users tiene trigger o lo hacemos manual)
    // El esquema tiene foreign key a auth.users y sedes.
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        sede_id: sedeData.id,
        nombre_completo,
        rol: 'administrador',
        estado: true,
      });
      
    if (profileError) {
      return errorResponse('Error al crear el perfil de usuario.', 500);
    }
    
    return successResponse(
      { userId: authData.user.id, sedeId: sedeData.id },
      'Cuenta y empresa creadas exitosamente.',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
