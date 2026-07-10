"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, UserCheck, UserX, MoreVertical, Plus, Edit, Trash, Shield } from 'lucide-react';
import { RolUsuario } from '@/lib/types';

type UserProfile = {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  estado: boolean;
  created_at: string;
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: !currentStatus }),
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'administrador': return <Badge variant="default" className="bg-primary hover:bg-primary">Admin</Badge>;
      case 'gerente_operaciones': return <Badge variant="secondary" className="bg-secondary text-secondary-foreground">Gerente</Badge>;
      case 'supervisor': return <Badge variant="outline" className="text-secondary border-secondary">Supervisor</Badge>;
      default: return <Badge variant="outline">{rol}</Badge>;
    }
  };

  const activeUsers = users.filter(u => u.estado).length;
  const inactiveUsers = users.length - activeUsers;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los accesos y roles de tu equipo.</p>
        </div>
        <Button className="shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
              <h2 className="text-3xl font-bold">{users.length}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-green-500/10 rounded-2xl">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Activos</p>
              <h2 className="text-3xl font-bold">{activeUsers}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-destructive/10 rounded-2xl">
              <UserX className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
              <h2 className="text-3xl font-bold">{inactiveUsers}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Usuario</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarFallback className="bg-secondary/10 text-secondary font-medium">
                          {user.nombre_completo.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{user.nombre_completo}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.rol)}
                    </td>
                    <td className="px-6 py-4">
                      {user.estado ? (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-2xl">
                          <DropdownMenuItem className="cursor-pointer rounded-xl">
                            <Edit className="w-4 h-4 mr-2 text-muted-foreground" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer rounded-xl" onClick={() => toggleStatus(user.id, user.estado)}>
                            <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                            {user.estado ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl">
                            <Trash className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
