'use client';

import React from 'react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import type { RolUsuario } from '@/lib/types';

interface RoleGateProps {
  roles: RolUsuario[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente de seguridad en cliente para ocultar/mostrar elementos según el rol del usuario.
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user, loading } = useCurrentUser();

  if (loading) {
    // Mientras carga la sesión en cliente, no mostramos nada para evitar saltos visuales bruscos,
    // o mostramos un loader si se pasa explícitamente en el fallback.
    return null;
  }

  if (!user || !roles.includes(user.rol)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
