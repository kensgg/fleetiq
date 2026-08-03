import type { ApiResponse } from '@/lib/types';

/**
 * Clase de error personalizada para el cliente API de FleetIQ.
 * Conserva el status HTTP, el mensaje devuelto por el backend y los detalles opcionales de validación.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]> | string[];

  constructor(status: number, message: string, errors?: Record<string, string[]> | string[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;

    // Mantener el stack trace en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }
}

/**
 * Función interna para envolver fetch y manejar la deserialización y los errores.
 */
async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith('/') ? path : `/${path}`;
  
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let payload: ApiResponse<T>;
  try {
    payload = await response.json();
  } catch {
    // Si no es JSON (e.g. error del proxy de Nginx, HTML de error, etc.)
    throw new ApiClientError(
      response.status,
      `Error de red o respuesta no procesable (Status: ${response.status})`
    );
  }

  if (!response.ok || !payload.success) {
    // Lanzar error tipado con el mensaje del backend sin inventar uno local
    const errorMsg = payload.message || 'Error desconocido del servidor';
    const validationErrors = !payload.success ? payload.errors : undefined;
    throw new ApiClientError(response.status, errorMsg, validationErrors);
  }

  return payload.data;
}

/**
 * Cliente API centralizado y tipado de la aplicación.
 */
export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
