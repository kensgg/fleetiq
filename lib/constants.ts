import { ROL_USUARIO, ESTADO_CAMION, ESTADO_RUTA, PRIORIDAD_ALERTA } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Constantes globales de la aplicación
// ─────────────────────────────────────────────────────────────

/** Nombre de la aplicación */
export const APP_NAME = 'FleetIQ';

/** Empresa propietaria */
export const COMPANY_NAME = '3 Guerras';

/** Descripción corta para SEO y metadatos */
export const APP_DESCRIPTION = 'Plataforma SaaS de gestión de flotas para 3 Guerras';

// ─────────────────────────────────────────────────────────────
// Labels legibles para enums (para UI)
// ─────────────────────────────────────────────────────────────

/** Labels legibles para roles de usuario */
export const ROL_LABELS: Record<string, string> = {
  [ROL_USUARIO.ADMINISTRADOR]: 'Administrador',
  [ROL_USUARIO.GERENTE_OPERACIONES]: 'Gerente de Operaciones',
  [ROL_USUARIO.SUPERVISOR]: 'Supervisor',
  [ROL_USUARIO.CONDUCTOR]: 'Conductor',
  [ROL_USUARIO.CAPTURISTA]: 'Capturista',
};

/** Labels legibles para estados de camión */
export const ESTADO_CAMION_LABELS: Record<string, string> = {
  [ESTADO_CAMION.DISPONIBLE]: 'Disponible',
  [ESTADO_CAMION.EN_RUTA]: 'En Ruta',
  [ESTADO_CAMION.MANTENIMIENTO]: 'Mantenimiento',
  [ESTADO_CAMION.FUERA_SERVICIO]: 'Fuera de Servicio',
};

/** Labels legibles para estados de ruta */
export const ESTADO_RUTA_LABELS: Record<string, string> = {
  [ESTADO_RUTA.PENDIENTE]: 'Pendiente',
  [ESTADO_RUTA.EN_CURSO]: 'En Curso',
  [ESTADO_RUTA.COMPLETADA]: 'Completada',
  [ESTADO_RUTA.CANCELADA]: 'Cancelada',
};

/** Labels legibles para prioridades de alerta */
export const PRIORIDAD_LABELS: Record<string, string> = {
  [PRIORIDAD_ALERTA.ALTA]: 'Alta',
  [PRIORIDAD_ALERTA.MEDIA]: 'Media',
  [PRIORIDAD_ALERTA.BAJA]: 'Baja',
};

// ─────────────────────────────────────────────────────────────
// Paginación por defecto
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
