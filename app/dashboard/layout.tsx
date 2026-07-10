"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Map, 
  Settings, 
  LogOut,
  Bell,
  Search
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Usuarios', href: '/dashboard/usuarios' },
  { icon: Truck, label: 'Flota', href: '/dashboard/flota' },
  { icon: Map, label: 'Rutas', href: '/dashboard/rutas' },
  { icon: Settings, label: 'Configuración', href: '/dashboard/configuracion' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Fleet<span className="text-primary">IQ</span></h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 mt-auto">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-border bg-card flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 rounded-full bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50" 
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 relative text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-border mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-foreground">Admin Usuario</p>
                <p className="text-xs text-muted-foreground">Sede Central</p>
              </div>
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">AU</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
