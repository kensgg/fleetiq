import type { RolUsuario } from '@/lib/types';

export interface Sede {
  id: string; // uuid
  nombre: string; // text
  direccion: string | null; // text
  activo: boolean; // boolean
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface Profile {
  id: string; // uuid primary key (references auth.users.id)
  sede_id: string | null; // uuid references sedes.id
  nombre_completo: string; // text
  rol: RolUsuario; // rol_usuario
  estado: boolean; // boolean
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
