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

  const navItems = getNavItemsForRole(user.rol);
  const initials = user.nombre_completo
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
  const SidebarContent = () => (
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
              {user.nombre_completo}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ROL_LABELS[user.rol] || user.rol}
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
        <SidebarContent />
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
        <SidebarContent />
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
                {user.sede_nombre || 'FleetIQ'}
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
              {/* Notification badge - static placeholder */}
              <span className="dash-notif-badge">3</span>
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
                      {user.nombre_completo}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {ROL_LABELS[user.rol] || user.rol}
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
