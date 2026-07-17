import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { registerSchema } from '@/lib/validations/auth';

/**
 * RF-01: Registro de nuevos inquilinos (Sedes).
 * Crea una cuenta confirmada en Supabase Auth, una Sede y asigna
 * al usuario como administrador de esa sede.
 *
 * Usa el admin client (service_role) para:
 *  - bypassear RLS en sedes y profiles
 *  - confirmar el email automáticamente (sin link de verificación)
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

    const admin = createAdminClient();

    // ── 1. Crear el usuario en Supabase Auth ─────────────────────────────
    // email_confirm: true → usuario confirmado de inmediato, sin email de verificación.
    // Necesario porque FleetIQ es un sistema interno; el admin crea las cuentas.
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Detectar email duplicado
      if (authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists')) {
        return errorResponse('Ya existe una cuenta con ese correo electrónico.', 409);
      }
      return errorResponse(`Error al crear usuario: ${authError.message}`, 400);
    }

    if (!authData.user) {
      return errorResponse('Error desconocido al crear usuario en Auth.', 500);
    }

    const userId = authData.user.id;

    // ── 2. Crear la sede (empresa) ────────────────────────────────────────
    const { data: sedeData, error: sedeError } = await admin
      .from('sedes')
      .insert({ nombre: nombre_sede })
      .select('id')
      .single();

    if (sedeError || !sedeData) {
      // Compensación: borrar el usuario de Auth para no dejar huérfanos
      await admin.auth.admin.deleteUser(userId);
      return errorResponse('Error al crear la sede/empresa. Intenta de nuevo.', 500);
    }

    // ── 3. Crear el perfil como administrador ─────────────────────────────
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: userId,
        sede_id: sedeData.id,
        nombre_completo,
        rol: 'administrador',
        estado: true,
      });

    if (profileError) {
      // Compensación: borrar usuario y sede
      await admin.auth.admin.deleteUser(userId);
      await admin.from('sedes').delete().eq('id', sedeData.id);
      return errorResponse('Error al crear el perfil de usuario. Intenta de nuevo.', 500);
    }

    return successResponse(
      { userId, sedeId: sedeData.id },
      'Cuenta y empresa creadas exitosamente.',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

