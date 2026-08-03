'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { PaginatedData } from '@/lib/types';

interface UsePaginatedFetchOptions {
  initialPage?: number;
  initialPerPage?: number;
  initialFilters?: Record<string, string | number | boolean | null | undefined>;
}

export function usePaginatedFetch<T>(
  url: string,
  options: UsePaginatedFetchOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(options.initialPage || 1);
  const [perPage, setPerPage] = useState<number>(options.initialPerPage || 20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  
  const [filters, setFiltersState] = useState<Record<string, string | number | boolean | null | undefined>>(
    options.initialFilters || {}
  );

  const setFilters = useCallback((newFilters: Record<string, string | number | boolean | null | undefined>) => {
    setFiltersState(newFilters);
    setPage(1); // Reiniciar a la primera página al cambiar filtros
  }, []);

  // Efecto asíncrono puro que evita llamadas síncronas a setState en el render pass
  useEffect(() => {
    let active = true;

    // Construir query params
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('per_page', String(perPage));

    // Agregar filtros activos
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.set(key, String(val));
      }
    });

    const endpoint = `${url}?${queryParams.toString()}`;

    apiClient.get<PaginatedData<T>>(endpoint)
      .then((res) => {
        if (active) {
          setData(res.items || []);
          setTotal(res.total || 0);
          setPage(res.page || 1);
          setPerPage(res.per_page || 20);
          setTotalPages(res.total_pages || 0);
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
          setData([]);
          setTotal(0);
          setTotalPages(0);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [url, page, perPage, filters]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('per_page', String(perPage));

      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          queryParams.set(key, String(val));
        }
      });

      const endpoint = `${url}?${queryParams.toString()}`;
      const res = await apiClient.get<PaginatedData<T>>(endpoint);

      setData(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setPerPage(res.per_page || 20);
      setTotalPages(res.total_pages || 0);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError(500, err instanceof Error ? err.message : 'Error desconocido'));
      }
      setData([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [url, page, perPage, filters]);

  return {
    items: data,
    total,
    page,
    perPage,
    totalPages,
    loading,
    error,
    setPage,
    setFilters,
    filters,
    refresh,
    mutateItems: setData,
  };
}
