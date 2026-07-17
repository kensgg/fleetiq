import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell, type DashboardUser } from '@/components/dashboard/DashboardShell';

/**
 * Dashboard layout — Server Component.
 *
 * 1. Verifies Supabase session (redirects to /login if none)
 * 2. Fetches user profile (rol, sede_id, nombre_completo)
 * 3. Fetches sede name for topbar display
 * 4. Passes user data to the client-side DashboardShell
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // ── 1. Verify session ──
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    console.error("Dashboard layout: No auth session found", authError);
    redirect('/login');
  }

  // ── 2. Fetch profile ──
  // Usamos el admin client para evitar problemas con RLS si no están configuradas las políticas aún
  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, nombre_completo, rol, sede_id, estado')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    console.error("Dashboard layout: Profile not found for user", authUser.id, profileError);
    redirect('/login');
  }

  // If user is deactivated, redirect to login
  if (!profile.estado) {
    console.error("Dashboard layout: User is deactivated", profile.id);
    redirect('/login');
  }

  // ── 3. Fetch sede name ──
  let sedeNombre: string | null = null;
  if (profile.sede_id) {
    const { data: sede } = await admin
      .from('sedes')
      .select('nombre')
      .eq('id', profile.sede_id)
      .single();

    sedeNombre = sede?.nombre ?? null;
  }

  // ── 4. Build user data for the shell ──
  const dashboardUser: DashboardUser = {
    id: profile.id,
    nombre_completo: profile.nombre_completo,
    rol: profile.rol,
    email: authUser.email ?? '',
    sede_nombre: sedeNombre,
  };

  return (
    <DashboardShell user={dashboardUser}>
      {children}
    </DashboardShell>
  );
}
