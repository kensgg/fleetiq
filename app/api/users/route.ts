import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { createUserSchema } from '@/lib/validations/users';

/**
 * GET: Obtener lista de usuarios de la sede (RG-05).
 * RF-02, RF-03: Solo el administrador puede listar usuarios.
 */
export const GET = withRole('administrador')(async ({ user }) => {
  try {
    const supabase = await createClient();
    
    // Solo trae los perfiles que coincidan con la sede del admin actual
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol, estado, created_at, updated_at')
      .eq('sede_id', user.sede_id)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(`Error al obtener usuarios: ${error.message}`, 500);
    }

    return successResponse(data, 'Usuarios recuperados exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * POST: Crear un nuevo usuario en la misma sede (RF-03, RG-05).
 * Se usa el Supabase Admin Client para no sobrescribir la sesión del admin actual.
 */
export const POST = withRole('administrador')(async ({ request, user }) => {
  try {
    const body = await request.json();
    
    // Validación
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }
    
    const { email, password, nombre_completo, rol } = result.data;
    
    // Usamos el cliente admin para bypasear la sesión y crear el usuario en el backend
    const adminAuthClient = createAdminClient();
    
    // 1. Crear el usuario en auth.users
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Si es un SaaS y el admin lo crea, podemos darlo por confirmado
    });
    
    if (authError || !authData.user) {
      return errorResponse(`Error al crear la cuenta: ${authError?.message || 'Desconocido'}`, 400);
    }
    
    // 2. Crear el perfil del usuario (asociado a la misma sede del admin)
    const { data: profileData, error: profileError } = await adminAuthClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        sede_id: user.sede_id,
        nombre_completo,
        rol,
        estado: true, // Activo por defecto
      })
      .select('id, nombre_completo, rol, estado, created_at')
      .single();
      
    if (profileError || !profileData) {
      // Intentar limpiar el usuario si falla la creación del perfil
      await adminAuthClient.auth.admin.deleteUser(authData.user.id);
      return errorResponse('Error al crear el perfil del usuario.', 500);
    }
    
    return successResponse(profileData, 'Usuario creado exitosamente', 201);
  } catch (error) {
    return handleApiError(error);
  }
});
