import type { EstadoCamion, TipoDocumentoCamion } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Camión
// ─────────────────────────────────────────────────────────────

export interface Camion {
  id: string;
  sede_id: string;
  numero_unidad: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  numero_serie: string;
  tipo_carga: string | null;
  estado: EstadoCamion;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Documento digital de camión (RF-11)
// ─────────────────────────────────────────────────────────────

export interface DocumentoCamion {
  id: string;
  camion_id: string;
  tipo_documento: TipoDocumentoCamion;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Mantenimiento (RF-12)
// ─────────────────────────────────────────────────────────────

export interface Mantenimiento {
  id: string;
  camion_id: string;
  fecha: string;
  tipo: string;
  costo: number;
  proveedor: string | null;
  kilometraje: number | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Asignación conductor-camión (RF-10)
// ─────────────────────────────────────────────────────────────

export interface AsignacionConductorCamion {
  id: string;
  camion_id: string;
  conductor_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  created_at: string;
}
