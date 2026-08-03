export interface IntegracionConfig {
  id: string; // uuid
  nombre: string; // text
  tipo: 'n8n' | 'ia' | 'otro'; // text
  endpoint_url: string | null; // text
  activo: boolean; // boolean
  config: Record<string, unknown>; // jsonb
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
