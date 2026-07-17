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
  /** Roles that can see this item. Empty = visible to all authenticated users. */
  allowedRoles: RolUsuario[];
}

// ─────────────────────────────────────────────────────────────
// Helper constant — all roles (shorthand for "everyone")
// ─────────────────────────────────────────────────────────────

const ALL_ROLES: RolUsuario[] = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
  'conductor',
  'capturista',
];

// ─────────────────────────────────────────────────────────────
// Navigation items
// ─────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Camiones',
    href: '/dashboard/camiones',
    icon: Truck,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor', 'capturista'],
  },
  {
    label: 'Conductores',
    href: '/dashboard/conductores',
    icon: Users,
    allowedRoles: ['administrador', 'gerente_operaciones', 'supervisor', 'capturista'],
  },
  {
    label: 'Rutas',
    href: '/dashboard/rutas',
    icon: Map,
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Notificaciones',
    href: '/dashboard/notificaciones',
    icon: Bell,
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    allowedRoles: ['administrador', 'gerente_operaciones'],
  },
  {
    label: 'Asistente IA',
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
    label: 'Configuración',
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
