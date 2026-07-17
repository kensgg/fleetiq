import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';

/**
 * GET /api/profile
 * Returns the authenticated user's profile data.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return errorResponse('No autenticado.', 401);
    }

    // Fetch profile with sede name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol, sede_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('Perfil no encontrado.', 404);
    }

    // Fetch sede name
    let sedeNombre: string | null = null;
    if (profile.sede_id) {
      const { data: sede } = await supabase
        .from('sedes')
        .select('nombre')
        .eq('id', profile.sede_id)
        .single();
      sedeNombre = sede?.nombre ?? null;
    }

    return successResponse({
      nombre_completo: profile.nombre_completo,
      email: authUser.email,
      rol: profile.rol,
      sede_nombre: sedeNombre,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/profile
 * Update the authenticated user's name and/or password.
 *
 * Body:
 *   - nombre_completo?: string (min 3 chars)
 *   - password?: string (min 6 chars)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return errorResponse('No autenticado.', 401);
    }

    const body = await request.json();

    // ── Update name ──
    if (body.nombre_completo !== undefined) {
      const name = String(body.nombre_completo).trim();
      if (name.length < 3) {
        return errorResponse('El nombre debe tener al menos 3 caracteres.', 400);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nombre_completo: name, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);

      if (updateError) {
        return errorResponse('Error al actualizar el nombre.', 500);
      }
    }

    // ── Update password ──
    if (body.password !== undefined) {
      const password = String(body.password);
      if (password.length < 6) {
        return errorResponse('La contraseña debe tener al menos 6 caracteres.', 400);
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        return errorResponse(
          passwordError.message || 'Error al cambiar la contraseña.',
          400,
        );
      }
    }

    return successResponse(null, 'Perfil actualizado correctamente.');
  } catch (error) {
    return handleApiError(error);
  }
}
