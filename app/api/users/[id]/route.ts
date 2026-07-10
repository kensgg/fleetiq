import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';
import { updateUserSchema } from '@/lib/validations/users';

/**
 * PUT: Actualizar un usuario existente (solo administrador).
 * RF-03: Editar cuentas de usuario de su propia sede.
 */
export const PUT = withRole('administrador')(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validación de entrada
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Datos inválidos', 422, result.error.flatten().fieldErrors);
    }
    
    const updates = result.data;
    
    // Solo puede modificar usuarios de su propia sede.
    // Usamos el cliente normal o admin para verificar pertenencia.
    const supabase = await createClient();
    
    // Verificar que el usuario a editar exista y pertenezca a la sede (RG-05)
    const { data: targetUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, sede_id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();
      
    if (checkError || !targetUser) {
      return errorResponse('Usuario no encontrado o no pertenece a tu sede', 404);
    }
    
    // Procedemos a actualizar el perfil
    const adminAuthClient = createAdminClient();
    
    const { data: updatedProfile, error: updateError } = await adminAuthClient
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, nombre_completo, rol, estado, updated_at')
      .single();
      
    if (updateError || !updatedProfile) {
      return errorResponse(`Error al actualizar el usuario: ${updateError?.message}`, 500);
    }
    
    return successResponse(updatedProfile, 'Usuario actualizado exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * PATCH: Activar/Desactivar un usuario (soft-delete).
 * RF-03: Eliminar (soft-delete con "estado").
 */
export const PATCH = withRole('administrador')(async ({ request, params, user }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (typeof body.estado !== 'boolean') {
      return errorResponse('Se requiere el campo "estado" como booleano', 422);
    }
    
    const { estado } = body;
    
    const supabase = await createClient();
    
    // Verificar que el usuario exista y pertenezca a la sede
    const { data: targetUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, sede_id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();
      
    if (checkError || !targetUser) {
      return errorResponse('Usuario no encontrado o no pertenece a tu sede', 404);
    }
    
    // Evitar que el admin se desactive a sí mismo (opcional pero buena práctica)
    if (id === user.id && estado === false) {
      return errorResponse('No puedes desactivar tu propia cuenta', 403);
    }
    
    const adminAuthClient = createAdminClient();
    
    const { data: updatedProfile, error: updateError } = await adminAuthClient
      .from('profiles')
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, nombre_completo, rol, estado, updated_at')
      .single();
      
    if (updateError || !updatedProfile) {
      return errorResponse(`Error al cambiar el estado del usuario: ${updateError?.message}`, 500);
    }
    
    return successResponse(
      updatedProfile,
      estado ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente'
    );
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * DELETE: Soft-delete directo.
 */
export const DELETE = withRole('administrador')(async ({ params, user }) => {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Verificar que el usuario exista y pertenezca a la sede
    const { data: targetUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, sede_id')
      .eq('id', id)
      .eq('sede_id', user.sede_id)
      .single();
      
    if (checkError || !targetUser) {
      return errorResponse('Usuario no encontrado o no pertenece a tu sede', 404);
    }
    
    if (id === user.id) {
      return errorResponse('No puedes eliminar tu propia cuenta', 403);
    }
    
    const adminAuthClient = createAdminClient();
    
    // Hacemos soft-delete poniendo estado = false
    const { error: updateError } = await adminAuthClient
      .from('profiles')
      .update({
        estado: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
      
    if (updateError) {
      return errorResponse(`Error al eliminar el usuario: ${updateError.message}`, 500);
    }
    
    return successResponse(null, 'Usuario eliminado (desactivado) exitosamente');
  } catch (error) {
    return handleApiError(error);
  }
});
