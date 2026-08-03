import type { PrioridadAlerta } from '@/lib/types';

export interface Notificacion {
  id: string; // uuid
  usuario_id: string; // uuid references profiles.id
  titulo: string; // text
  mensaje: string; // text
  prioridad: PrioridadAlerta; // prioridad_alerta
  entidad_tipo: string | null; // text, ej. 'camion', 'ruta', 'documento', 'mantenimiento'
  entidad_id: string | null; // uuid
  leida: boolean; // boolean
  enviado_por_correo: boolean; // boolean
  created_at: string; // timestamptz
}
