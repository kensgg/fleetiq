// ─────────────────────────────────────────────────────────────
// FleetIQ — Tipos de base de datos (mapeo de enums PostgreSQL)
// ─────────────────────────────────────────────────────────────

/**
 * Roles de usuario del sistema.
 * Mapea el enum `rol_usuario` de PostgreSQL.
 */
export const ROL_USUARIO = {
  ADMINISTRADOR: 'administrador',
  GERENTE_OPERACIONES: 'gerente_operaciones',
  SUPERVISOR: 'supervisor',
  CONDUCTOR: 'conductor',
  CAPTURISTA: 'capturista',
} as const;

export type RolUsuario = (typeof ROL_USUARIO)[keyof typeof ROL_USUARIO];

/**
 * Estados posibles de un camión.
 * Mapea el enum `estado_camion` de PostgreSQL.
 */
export const ESTADO_CAMION = {
  DISPONIBLE: 'disponible',
  EN_RUTA: 'en_ruta',
  MANTENIMIENTO: 'mantenimiento',
  FUERA_SERVICIO: 'fuera_servicio',
} as const;

export type EstadoCamion = (typeof ESTADO_CAMION)[keyof typeof ESTADO_CAMION];

/**
 * Estados posibles de una ruta.
 * Mapea el enum `estado_ruta` de PostgreSQL.
 */
export const ESTADO_RUTA = {
  PENDIENTE: 'pendiente',
  EN_CURSO: 'en_curso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
} as const;

export type EstadoRuta = (typeof ESTADO_RUTA)[keyof typeof ESTADO_RUTA];

/**
 * Tipos de documento asociados a un camión.
 * Mapea el enum `tipo_documento_camion` de PostgreSQL.
 */
export const TIPO_DOCUMENTO_CAMION = {
  TARJETA_CIRCULACION: 'tarjeta_circulacion',
  SEGURO: 'seguro',
  VERIFICACION: 'verificacion',
  PERMISO_SCT: 'permiso_sct',
} as const;

export type TipoDocumentoCamion =
  (typeof TIPO_DOCUMENTO_CAMION)[keyof typeof TIPO_DOCUMENTO_CAMION];

/**
 * Tipos de incidencia en ruta.
 * Mapea el enum `tipo_incidencia` de PostgreSQL.
 */
export const TIPO_INCIDENCIA = {
  ACCIDENTE: 'accidente',
  RETRASO: 'retraso',
  FALLA_MECANICA: 'falla_mecanica',
  OTRO: 'otro',
} as const;

export type TipoIncidencia =
  (typeof TIPO_INCIDENCIA)[keyof typeof TIPO_INCIDENCIA];

/**
 * Prioridades de alerta/notificación.
 * Mapea el enum `prioridad_alerta` de PostgreSQL.
 */
export const PRIORIDAD_ALERTA = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja',
} as const;

export type PrioridadAlerta =
  (typeof PRIORIDAD_ALERTA)[keyof typeof PRIORIDAD_ALERTA];

// ─────────────────────────────────────────────────────────────
// Tipo del perfil de usuario autenticado (usado por middlewares)
// ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  sede_id: string | null;
  nombre_completo: string;
  rol: RolUsuario;
  estado: boolean;
}
