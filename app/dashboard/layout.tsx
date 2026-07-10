"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Truck,
  Map,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: 'text-sky-400' },
  { icon: Users, label: 'Usuarios', href: '/dashboard/usuarios', color: 'text-violet-400' },
  { icon: Truck, label: 'Flota', href: '/dashboard/flota', color: 'text-teal-400' },
  { icon: Map, label: 'Rutas', href: '/dashboard/rutas', color: 'text-amber-400' },
  { icon: Settings, label: 'Configuración', href: '/dashboard/configuracion', color: 'text-slate-400' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col shrink-0 border-r border-border/50"
        style={{ background: 'oklch(0.168 0.042 265.755)' }}>
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-2 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Fleet<span className="text-primary">IQ</span>
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : item.color}`} />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all duration-150 text-sm"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="pl-10 h-9 rounded-full bg-muted/50 border-border/50 text-sm focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
            </button>

            <div className="w-px h-5 bg-border/70" />

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-tight">Admin</p>
                <p className="text-xs text-muted-foreground leading-tight">Administrador</p>
              </div>
              <Avatar className="w-8 h-8 ring-2 ring-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">A</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
