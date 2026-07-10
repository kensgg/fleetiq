import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from './responses';

// ─────────────────────────────────────────────────────────────
// Clase de error de aplicación
// ─────────────────────────────────────────────────────────────

/**
 * Error operacional de la aplicación. Lleva un statusCode HTTP asociado.
 * Los errores operacionales son "esperados" (e.g., 404, 422) y se muestran
 * al usuario. Los errores no operacionales (bugs) se loguean y se devuelven
 * como 500 genérico.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Mantiene el stack trace correcto en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Errores pre-definidos comunes
// ─────────────────────────────────────────────────────────────

export const Errors = {
  NotFound: (recurso = 'Recurso') =>
    new AppError(`${recurso} no encontrado`, 404, 'NOT_FOUND'),

  Unauthorized: (message = 'No autenticado') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  Forbidden: (message = 'No tienes permisos para esta acción') =>
    new AppError(message, 403, 'FORBIDDEN'),

  BadRequest: (message = 'Solicitud inválida') =>
    new AppError(message, 400, 'BAD_REQUEST'),

  Conflict: (message = 'El recurso ya existe') =>
    new AppError(message, 409, 'CONFLICT'),

  InternalServer: (message = 'Error interno del servidor') =>
    new AppError(message, 500, 'INTERNAL_ERROR', false),
} as const;

// ─────────────────────────────────────────────────────────────
// Manejo centralizado de errores
// ─────────────────────────────────────────────────────────────

/**
 * Convierte cualquier error lanzado en un Route Handler a una
 * `NextResponse` con el formato estándar de la API.
 *
 * Soporta:
 * - `AppError` → usa su statusCode y mensaje
 * - `ZodError` → 422 con detalles de validación
 * - Errores de Supabase (con `.code`) → mapeo a HTTP apropiado
 * - Cualquier otro `Error` → 500 genérico
 */
export function handleApiError(error: unknown): NextResponse {
  // 1. Errores operacionales de la app
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode);
  }

  // 2. Errores de validación de Zod
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    return errorResponse('Datos de entrada inválidos', 422, fieldErrors);
  }

  // 3. Errores de Supabase (PostgrestError tiene .code)
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  ) {
    const supaError = error as { code: string; message: string };

    // Violación de unicidad
    if (supaError.code === '23505') {
      return errorResponse('El registro ya existe (duplicado)', 409);
    }

    // Violación de FK
    if (supaError.code === '23503') {
      return errorResponse('Referencia inválida a un registro relacionado', 422);
    }

    // RLS violation
    if (supaError.code === '42501') {
      return errorResponse('No tienes permisos para este recurso', 403);
    }

    return errorResponse(supaError.message, 400);
  }

  // 4. Errores genéricos de JavaScript
  if (error instanceof Error) {
    console.error('[FleetIQ] Error no manejado:', error);
    return errorResponse('Error interno del servidor', 500);
  }

  // 5. Fallback absoluto
  console.error('[FleetIQ] Error desconocido:', error);
  return errorResponse('Error interno del servidor', 500);
}
