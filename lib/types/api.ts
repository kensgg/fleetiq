// ─────────────────────────────────────────────────────────────
// FleetIQ — Tipos de respuesta API estándar
// ─────────────────────────────────────────────────────────────

/**
 * Respuesta exitosa de la API.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

/**
 * Respuesta de error de la API.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | string[];
}

/**
 * Tipo unión para cualquier respuesta de la API.
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Respuesta paginada de la API.
 */
export interface PaginatedData<T = unknown> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type ApiPaginatedResponse<T = unknown> = ApiSuccessResponse<PaginatedData<T>>;
