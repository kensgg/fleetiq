'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Plus, Search, RefreshCw, Eye, Loader2
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { EmptyState } from '@/components/dashboard/EmptyState';

export interface Conductor {
  id: string;
  sede_id: string;
  nombre_completo: string;
  licencia_numero: string;
  tipo_licencia: string;
  licencia_vigencia: string;
  estado: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsignacionActivaResponse {
  id: string;
  camion_id: string;
  conductor_id: string;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  camiones: {
    id: string;
    numero_unidad: string;
    marca: string;
    modelo: string;
    placas: string;
    estado: string;
  };
}

export default function ConductoresPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  // 1. Validar acceso: capturista y conductor NO tienen acceso
  useEffect(() => {
    if (!userLoading && (!user || !['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol))) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  // 2. Fetch de Conductores paginado
  const {
    items: conductores,
    total,
    page,
    perPage,
    totalPages,
    loading,
    setPage,
    setFilters,
    refresh: refreshConductores
  } = usePaginatedFetch<Conductor>('/api/conductores', {
    initialPerPage: 10,
    initialFilters: { estado: '' }
  });

  // 3. Fetch de Asignaciones Activas en la sede para asociar camión en la vista
  const {
    items: activeAsignaciones,
    loading: asignacionesLoading,
    refresh: refreshAsignaciones
  } = usePaginatedFetch<AsignacionActivaResponse>('/api/asignaciones', {
    initialPerPage: 100, // Recuperar un buen lote de asignaciones activas
    initialFilters: { activo: 'true' }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      estado: selectedEstado || null
    });
  };

  const handleEstadoChange = (estadoVal: string) => {
    setSelectedEstado(estadoVal);
    setFilters({
      estado: estadoVal || null
    });
  };

  const handleRefreshAll = () => {
    refreshConductores();
    refreshAsignaciones();
  };

  // Filtrado local por nombre_completo o licencia para complementar la API
  const filteredConductores = conductores.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombre_completo.toLowerCase().includes(term) ||
      c.licencia_numero.toLowerCase().includes(term)
    );
  });

  // Helper para verificar vigencia de licencia
  const getLicenciaAlert = (fechaVencimiento: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(fechaVencimiento);
    expDate.setHours(0, 0, 0, 0);

    const diff = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const formatted = new Date(fechaVencimiento).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    if (diffDays < 0) {
      return { text: `Vencida (${formatted})`, className: 'text-red-500 font-bold' };
    } else if (diffDays < 30) {
      return { text: `Vence pronto (${formatted})`, className: 'text-amber-400 font-medium' };
    } else {
      return { text: formatted, className: 'text-muted-foreground' };
    }
  };

  if (userLoading || !user || !['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isListLoading = loading || asignacionesLoading;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recursos Humanos
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Conductores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra el directorio de choferes, licencias, vigencias y unidades asignadas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefreshAll}
            disabled={isListLoading}
            className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${isListLoading ? 'animate-spin' : ''}`} />
          </Button>
          <RoleGate roles={['administrador']}>
            <Button asChild className="h-9 rounded-xl shadow-lg shadow-primary/20 font-medium">
              <Link href="/dashboard/conductores/nuevo">
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo conductor
              </Link>
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Filters card */}
      <Card className="border border-border/50 bg-card shadow-lg">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o número de licencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Filter by status */}
            <div className="w-full sm:w-48">
              <select
                value={selectedEstado}
                onChange={(e) => handleEstadoChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>

            <Button type="submit" variant="secondary" className="h-9 w-full sm:w-auto px-5 rounded-lg font-medium">
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table container */}
      <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conductor
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Licencia (Tipo/Vigencia)
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vehículo Asignado
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isListLoading ? (
                /* Skeleton rows */
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted/60 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-muted/60 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredConductores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <EmptyState
                      icon={Users}
                      title="No se encontraron conductores"
                      description="No hay choferes registrados en esta sede que coincidan con tu búsqueda."
                      actionLabel="Registrar primer conductor"
                      onActionClick={() => { window.location.href = '/dashboard/conductores/nuevo'; }}
                    />
                  </td>
                </tr>
              ) : (
                filteredConductores.map((conductor) => {
                  const licVigencia = getLicenciaAlert(conductor.licencia_vigencia);
                  
                  // Encontrar camión asignado a través de asignaciones cargadas
                  const asignacionActiva = activeAsignaciones.find(
                    (a) => a.conductor_id === conductor.id
                  );
                  const camion = asignacionActiva?.camiones;

                  return (
                    <tr key={conductor.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{conductor.nombre_completo}</div>
                        {conductor.profile_id && (
                          <div className="text-[10px] text-primary/80 font-medium">Vinculado a cuenta</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">{conductor.licencia_numero}</div>
                        <div className={`text-xs flex items-center gap-1 mt-0.5 ${licVigencia.className}`}>
                          <span>Clase {conductor.tipo_licencia}</span>
                          <span>·</span>
                          <span>Vence: {licVigencia.text}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {conductor.estado ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {camion ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-medium text-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-xs">
                              #{camion.numero_unidad}
                            </span>
                            <span className="text-xs text-muted-foreground block font-mono">
                              Placas: {camion.placas}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin unidad asignada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Link href={`/dashboard/conductores/${conductor.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!isListLoading && conductores.length > 0 && (
          <PaginationControls
            page={page}
            perPage={perPage}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
