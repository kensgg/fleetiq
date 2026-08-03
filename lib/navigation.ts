import {
  LayoutDashboard,
  Truck,
  Users,
  Map,
  Bell,
  BarChart3,
  Bot,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { RolUsuario } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Navigation item definition
// ─────────────────────────────────────────────────────────────

export interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Roles that can see this item. */
  allowedRoles: RolUsuario[];
}

// ─────────────────────────────────────────────────────────────
// Helper constant — all roles
// ─────────────────────────────────────────────────────────────

const ALL_ROLES: RolUsuario[] = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
  'capturista',
];

// ─────────────────────────────────────────────────────────────
// Navigation items (Mapeados con la matriz real de roles)
// ─────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor'],
  },
  {
    label: 'Vehículos',
    href: '/dashboard/vehiculos',
    icon: Truck,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor', 'capturista'],
  },
  {
    label: 'Conductores',
    href: '/dashboard/conductores',
    icon: Users,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor'], // Excluye capturista
  },
  {
    label: 'Rutas',
    href: '/dashboard/rutas',
    icon: Map,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor', 'conductor'],
  },
  {
    label: 'Notificaciones',
    href: '/dashboard/notificaciones',
    icon: Bell,
    allowedRoles: ALL_ROLES, // Todos los roles
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor'],
  },
  {
    label: 'Chatbot IA',
    href: '/dashboard/asistente',
    icon: Bot,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor', 'conductor'],
  },
  {
    label: 'Usuarios',
    href: '/dashboard/usuarios',
    icon: UserCog,
    allowedRoles: ['administrador'],
  },
  {
    label: 'Integraciones',
    href: '/dashboard/configuracion',
    icon: Settings,
    allowedRoles: ['administrador'],
  },
];

// ─────────────────────────────────────────────────────────────
// Helper: filter nav items by role
// ─────────────────────────────────────────────────────────────

export function getNavItemsForRole(rol: RolUsuario): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(rol));
}
