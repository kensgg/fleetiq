import { NextResponse } from 'next/server';
import type { ApiSuccessResponse, ApiErrorResponse } from '@/lib/types';

/**
 * Genera una respuesta exitosa con formato estándar.
 *
 * @example
 * return successResponse({ camion }, 'Camión creado correctamente', 201);
 */
export function successResponse<T>(
  data: T,
  message = 'Operación exitosa',
  status = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      message,
      data,
    },
    { status },
  );
}

/**
 * Genera una respuesta de error con formato estándar.
 *
 * @example
 * return errorResponse('Recurso no encontrado', 404);
 * return errorResponse('Datos inválidos', 422, { nombre: ['Campo requerido'] });
 */
export function errorResponse(
  message = 'Error interno del servidor',
  status = 500,
  errors?: ApiErrorResponse['errors'],
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false as const,
    message,
  };

  if (errors) {
    body.errors = errors;
  }

  return NextResponse.json(body, { status });
}
