export interface ReporteGenerado {
  id: string; // uuid
  sede_id: string; // uuid
  tipo: 'combustible' | 'km_recorridos' | 'mantenimiento' | 'eficiencia_rutas'; // text
  filtros: Record<string, unknown>; // jsonb
  formato: 'pdf' | 'xlsx'; // text
  generado_por: string | null; // uuid references profiles.id
  archivo_url: string | null; // text
  created_at: string; // timestamptz
}
