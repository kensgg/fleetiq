import type { EstadoRuta } from '@/lib/types';

export interface PuntoIntermedio {
  nombre: string;
  lat?: number;
  lng?: number;
}

export interface Ruta {
  id: string; // uuid
  sede_id: string; // uuid
  camion_id: string; // uuid
  conductor_id: string; // uuid
  origen: string; // text
  destino: string; // text
  puntos_intermedios: PuntoIntermedio[]; // jsonb
  fecha_estimada: string; // timestamptz
  estado: EstadoRuta; // estado_ruta
  creado_por: string | null; // uuid references profiles.id
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
