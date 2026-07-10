import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z.string().min(3, 'El nombre completo es requerido'),
  nombre_sede: z.string().min(3, 'El nombre de la empresa/sede es requerido'),
});

export const recoverySchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
});
