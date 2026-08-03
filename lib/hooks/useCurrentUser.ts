'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { RolUsuario } from '@/lib/types';

export interface CurrentUser {
  nombre_completo: string;
  email: string;
  rol: RolUsuario;
  sede_nombre: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiClientError | null>(null);

  // Efecto que ejecuta el fetch de forma asíncrona mediante promesas
  // Esto evita llamadas síncronas de setState en el cuerpo del efecto
  useEffect(() => {
    let active = true;

    apiClient.get<CurrentUser>('/api/profile')
      .then((data) => {
        if (active) {
          setUser(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          if (err instanceof ApiClientError) {
            setError(err);
          } else {
            setError(new ApiClientError(500, err instanceof Error ? err.message : 'Error desconocido'));
          }
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<CurrentUser>('/api/profile');
      setUser(data);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError(500, err instanceof Error ? err.message : 'Error desconocido'));
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    refetch,
  };
}
