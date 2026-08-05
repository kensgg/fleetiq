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

  // ─── Geolocalización (módulo de mapas) ───
  origen_lat: number | null;            // double precision
  origen_lng: number | null;            // double precision
  destino_lat: number | null;           // double precision
  destino_lng: number | null;           // double precision
  distancia_km: number | null;          // numeric(10,3)
  duracion_estimada_min: number | null; // integer
}

/**
 * Registro de posición reportado por el conductor durante una ruta activa.
 * Mapea la tabla `ubicaciones_ruta`.
 */
export interface UbicacionRuta {
  id: string;           // uuid
  ruta_id: string;      // uuid references rutas.id
  lat: number;          // double precision
  lng: number;          // double precision
  velocidad_kmh: number | null; // numeric(6,2)
  created_at: string;   // timestamptz
}

