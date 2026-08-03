'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  User,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNavItemsForRole, type NavItem } from '@/lib/navigation';
import type { RolUsuario } from '@/lib/types';
import { ROL_LABELS } from '@/lib/constants';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { apiClient } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DashboardUser {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  email: string;
  sede_nombre: string | null;
}

interface DashboardShellProps {
  user: DashboardUser;
  children: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Hook reactivo de sesión en cliente para actualizaciones en tiempo real
  const { user: clientUser } = useCurrentUser();
  const activeUser = clientUser || user;

  // Carga e integraciones en tiempo real para notificaciones (Realtime + fallback Polling)
  useEffect(() => {
    let active = true;

    // 1. Conteo inicial
    apiClient.get<{ count: number }>('/api/notificaciones/no-leidas')
      .then((res) => {
        if (active) setUnreadCount(res.count);
      })
      .catch((err) => console.error("Error fetching initial notifications count:", err));

    // 2. Suscripción Realtime sobre cambios en la tabla 'notificaciones' para este usuario
    const supabase = createClient();
    const channel = supabase
      .channel(`notificaciones-live-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`
        },
        () => {
          // Consultar la API para mantener el conteo sincronizado
          apiClient.get<{ count: number }>('/api/notificaciones/no-leidas')
            .then((res) => {
              if (active) setUnreadCount(res.count);
            })
            .catch((err) => console.error("Error updating notifications count on live trigger:", err));
        }
      )
      .subscribe();

    // 3. Polling de respaldo cada 30 segundos (en caso de que Realtime esté deshabilitado en BD)
    const intervalId = setInterval(() => {
      apiClient.get<{ count: number }>('/api/notificaciones/no-leidas')
        .then((res) => {
          if (active) setUnreadCount(res.count);
        })
        .catch((err) => console.error("Error in fallback notifications polling:", err));
    }, 30000);

    return () => {
      active = false;
      channel.unsubscribe();
      clearInterval(intervalId);
    };
  }, [user.id]);

  const navItems = getNavItemsForRole(activeUser.rol);
  const initials = (activeUser.nombre_completo || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Close mobile sidebar on route change only if it is open to avoid cascading renders
  useEffect(() => {
    if (sidebarOpen) {
      const timer = setTimeout(() => {
        setSidebarOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, sidebarOpen]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [router]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // ── Sidebar content (shared between desktop and mobile) ──
  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border/30">
        <Logo size="md" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* User section at bottom */}
      <div className="border-t border-border/30 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {activeUser.nombre_completo}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ROL_LABELS[activeUser.rol] || activeUser.rol}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 border-r border-border/30 bg-sidebar">
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-sidebar border-r border-border/30
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        {renderSidebarContent()}
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/30 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Sede name */}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {activeUser.sede_nombre || 'FleetIQ'}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                Panel de control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Link
              href="/dashboard/notificaciones"
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
              {/* Conteo de notificaciones no leídas */}
              {unreadCount > 0 && (
                <span className="dash-notif-badge">{unreadCount}</span>
              )}
            </Link>

            <div className="w-px h-5 bg-border/50 mx-1 hidden sm:block" />

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium leading-tight">
                      {activeUser.nombre_completo}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {ROL_LABELS[activeUser.rol] || activeUser.rol}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50 bg-popover">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg gap-2">
                  <Link href="/dashboard/perfil">
                    <User className="w-4 h-4 text-primary" />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="dash-page-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Nav Link sub-component
// ─────────────────────────────────────────────────────────────

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`dash-nav-item ${active ? 'dash-nav-active' : ''}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
