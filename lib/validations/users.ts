import { z } from 'zod';
import { RolUsuario } from '@/lib/types';

// Enum valid roles
const validRoles = ['administrador', 'gerente_operaciones', 'supervisor', 'conductor', 'capturista'] as const;

export const createUserSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z.string().min(3, 'El nombre completo es requerido'),
  rol: z.enum(validRoles, {
    errorMap: () => ({ message: 'Rol de usuario inválido' }),
  }),
});

export const updateUserSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres').optional(),
  rol: z.enum(validRoles, {
    errorMap: () => ({ message: 'Rol de usuario inválido' }),
  }).optional(),
  estado: z.boolean().optional(),
});
