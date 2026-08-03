import type { TipoIncidencia } from '@/lib/types';

export interface Incidencia {
  id: string; // uuid
  ruta_id: string; // uuid
  tipo: TipoIncidencia; // tipo_incidencia
  descripcion: string; // text
  evidencia_url: string | null; // text
  reportado_por: string | null; // uuid references profiles.id
  created_at: string; // timestamptz
}
