"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Users, UserCheck, UserX, MoreVertical, Plus, Edit, Trash, Shield,
  Activity, RefreshCw
} from 'lucide-react';

type RolUsuario = 'administrador' | 'gerente_operaciones' | 'supervisor' | 'conductor' | 'capturista';

type UserProfile = {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  estado: boolean;
  created_at: string;
};

const ROL_CONFIG: Record<RolUsuario, { label: string; className: string }> = {
  administrador:        { label: 'Admin',    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  gerente_operaciones:  { label: 'Gerente',  className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  supervisor:           { label: 'Supervisor',className: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  conductor:            { label: 'Conductor',className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  capturista:           { label: 'Capturista',className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

const AVATAR_COLORS = [
  'bg-sky-500/20 text-sky-400',
  'bg-violet-500/20 text-violet-400',
  'bg-teal-500/20 text-teal-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: !currentStatus }),
      });
      if (res.ok) fetchUsers(true);
    } catch (error) {
      console.error(error);
    }
  };

  const activeUsers   = users.filter(u => u.estado).length;
  const inactiveUsers = users.length - activeUsers;

  const statCards = [
    {
      label: 'Total Usuarios',
      value: users.length,
      icon: Users,
      iconBg: 'bg-sky-500/15',
      iconColor: 'text-sky-400',
      glow: 'shadow-sky-500/10',
    },
    {
      label: 'Activos',
      value: activeUsers,
      icon: UserCheck,
      iconBg: 'bg-teal-500/15',
      iconColor: 'text-teal-400',
      glow: 'shadow-teal-500/10',
    },
    {
      label: 'Inactivos',
      value: inactiveUsers,
      icon: UserX,
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-400',
      glow: 'shadow-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gestión</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los accesos y roles de tu equipo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="h-9 rounded-xl shadow-lg shadow-primary/20 font-medium">
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, glow }) => (
          <Card key={label} className={`border border-border/50 shadow-lg ${glow} bg-card`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold leading-tight">{loading ? '—' : value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Directorio del equipo</span>
            {!loading && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                {users.length}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Miembro desde
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                /* Loading skeleton */
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-muted/50 rounded-full animate-pulse" style={{ width: j === 0 ? '60%' : '40%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Sin usuarios</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Comienza creando el primer usuario de tu equipo.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const rolConfig = ROL_CONFIG[user.rol] ?? { label: user.rol, className: 'bg-muted text-muted-foreground border-border' };
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const initials = user.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const memberSince = new Date(user.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

                  return (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm leading-tight">{user.nombre_completo}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${rolConfig.className}`}>
                          {rolConfig.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {user.estado ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground">{memberSince}</span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/50 bg-card">
                            <DropdownMenuItem className="cursor-pointer rounded-lg text-sm gap-2">
                              <Edit className="w-4 h-4 text-sky-400" /> Editar usuario
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer rounded-lg text-sm gap-2"
                              onClick={() => toggleStatus(user.id, user.estado)}
                            >
                              <Shield className={`w-4 h-4 ${user.estado ? 'text-amber-400' : 'text-teal-400'}`} />
                              {user.estado ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg text-sm gap-2">
                              <Trash className="w-4 h-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
