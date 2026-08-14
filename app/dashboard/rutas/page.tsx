'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Map, Plus, RefreshCw, Eye, MapPin, Truck, Clock, AlertTriangle, ArrowRight, Loader2
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { createClient } from '@/lib/supabase/client';
import type { Ruta } from '@/modules/rutas/types';
import type { EstadoRuta } from '@/lib/types';

interface RutaConDetalle extends Ruta {
  camiones?: {
    id: string;
    numero_unidad: string;
    marca: string;
    modelo: string;
    placas: string;
  };
  conductores?: {
    id: string;
    nombre_completo: string;
    licencia_numero: string;
  };
}

const RUTA_ESTADO_CONFIG: Record<EstadoRuta, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-muted/50 text-muted-foreground border-border/50'
  },
  en_curso: {
    label: 'En Curso',
    className: 'bg-primary/10 text-primary border-primary/20 font-semibold'
  },
  completada: {
    label: 'Completada',
    className: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  },
  cancelada: {
    label: 'Cancelada',
    className: 'bg-destructive/10 text-destructive border-destructive/20'
  }
};

export default function RutasPage() {
  const { user, loading: userLoading } = useCurrentUser();

  // Filtros administrativos
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Estados para vista de conductor
  const [conductorRuta, setConductorRuta] = useState<RutaConDetalle | null>(null);
  const [conductorRutaLoading, setConductorRutaLoading] = useState(false);
  const [conductorRutaError, setConductorRutaError] = useState('');

  // 1. Fetch de Rutas paginado (Vista Administrativa)
  const {
    items: rutas,
    total,
    page,
    perPage,
    totalPages,
    loading: adminRutasLoading,
    setPage,
    setFilters,
    refresh: refreshAdminRutas
  } = usePaginatedFetch<RutaConDetalle>('/api/rutas', {
    initialPerPage: 10,
    initialFilters: { estado: '', fecha_desde: '', fecha_hasta: '' }
  });

  // 2. Efecto para cargar ruta del conductor si el rol es conductor
  useEffect(() => {
    let active = true;
    if (user && user.rol === 'conductor') {
      Promise.resolve().then(() => {
        if (active) {
          setConductorRutaLoading(true);
          setConductorRutaError('');
        }
      });
      
      const supabase = createClient();
      
      // Encontrar el conductor vinculado a este profile
      supabase.auth.getUser()
        .then(({ data: { user: authUser } }) => {
          if (!authUser) throw new Error('No autenticado');
          return supabase
            .from('conductores')
            .select('id')
            .eq('profile_id', authUser.id)
            .single();
        })
        .then(({ data: condData, error: condError }) => {
          if (condError || !condData) {
            throw new Error('No se encontró un registro de conductor para esta cuenta.');
          }
          
          // Buscar ruta activa (en_curso) del conductor
          return supabase
            .from('rutas')
            .select(`
              *,
              camiones (
                id,
                numero_unidad,
                marca,
                modelo,
                placas
              ),
              conductores (
                id,
                nombre_completo,
                licencia_numero
              )
            `)
            .eq('conductor_id', condData.id)
            .eq('estado', 'en_curso')
            .maybeSingle()
            .then(({ data: rutaEnCurso, error: routeError }) => {
              if (routeError) throw new Error(routeError.message);
              
              if (rutaEnCurso) {
                return rutaEnCurso;
              }
              
              // Si no hay en curso, buscar la pendiente más cercana en fecha
              return supabase
                .from('rutas')
                .select(`
                  *,
                  camiones (
                    id,
                    numero_unidad,
                    marca,
                    modelo,
                    placas
                  ),
                  conductores (
                    id,
                    nombre_completo,
                    licencia_numero
                  )
                `)
                .eq('conductor_id', condData.id)
                .eq('estado', 'pendiente')
                .order('fecha_estimada', { ascending: true })
                .limit(1)
                .maybeSingle()
                .then(({ data: rutaPendiente, error: pendingError }) => {
                  if (pendingError) throw new Error(pendingError.message);
                  return rutaPendiente;
                });
            });
        })
        .then((rutaRes) => {
          if (active) {
            setConductorRuta(rutaRes as RutaConDetalle);
            setConductorRutaLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error al obtener la ruta del conductor:", err);
          if (active) {
            setConductorRutaError(err instanceof Error ? err.message : 'Error al cargar tu ruta activa.');
            setConductorRutaLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      estado: selectedEstado || null,
      fecha_desde: fechaDesde ? new Date(fechaDesde).toISOString() : null,
      fecha_hasta: fechaHasta ? new Date(fechaHasta).toISOString() : null
    });
  };

  const handleClearFilters = () => {
    setSelectedEstado('');
    setFechaDesde('');
    setFechaHasta('');
    setFilters({
      estado: null,
      fecha_desde: null,
      fecha_hasta: null
    });
  };

  const handleRefresh = () => {
    if (user?.rol === 'conductor') {
      window.location.reload();
    } else {
      refreshAdminRutas();
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─────────────── VISTA DEL CONDUCTOR ───────────────
  if (user?.rol === 'conductor') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
              Mi Asignación
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Mi Ruta Activa</h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={conductorRutaLoading}
            className="w-9 h-9 rounded-xl border-border/50"
          >
            <RefreshCw className={`w-4 h-4 ${conductorRutaLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {conductorRutaLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : conductorRutaError ? (
          <Card className="border border-destructive/20 bg-destructive/10 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="font-bold text-destructive">Error de Configuración</h3>
            <p className="text-sm text-muted-foreground mt-1">{conductorRutaError}</p>
          </Card>
        ) : !conductorRuta ? (
          <EmptyState
            icon={Map}
            title="Sin viajes activos"
            description="No tienes ninguna ruta en curso o pendiente asignada en este momento. Descansa y mantente al pendiente de notificaciones."
          />
        ) : (
          <Card className="border border-border/50 bg-card shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-200">
            {/* Header del viaje */}
            <div className="p-5 border-b border-border/30 bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Programado: {new Date(conductorRuta.fecha_estimada).toLocaleDateString('es-MX', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                RUTA_ESTADO_CONFIG[conductorRuta.estado].className
              }`}>
                {RUTA_ESTADO_CONFIG[conductorRuta.estado].label.toUpperCase()}
              </span>
            </div>

            {/* Cuerpo del viaje */}
            <CardContent className="p-6 space-y-6">
              {/* Origen y Destino */}
              <div className="relative pl-6 space-y-4">
                <span className="absolute left-[7px] top-1.5 bottom-1.5 w-0.5 bg-border/50 border-dashed border-l" />
                
                {/* Origen */}
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Origen</div>
                  <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" /> {conductorRuta.origen}
                  </div>
                </div>

                {/* Destino */}
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Destino</div>
                  <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {conductorRuta.destino}
                  </div>
                </div>
              </div>

              {/* Unidad asignada */}
              {conductorRuta.camiones && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Vehículo asignado</div>
                      <div className="text-sm font-bold text-foreground">
                        #{conductorRuta.camiones.numero_unidad} · {conductorRuta.camiones.marca} {conductorRuta.camiones.modelo}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-medium">
                    Placas: {conductorRuta.camiones.placas}
                  </span>
                </div>
              )}

              {/* Botón de control de detalles */}
              <Button asChild className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20">
                <Link href={`/dashboard/rutas/${conductorRuta.id}`} className="flex items-center justify-center gap-2">
                  Ver bitácora y reportar incidencia
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─────────────── VISTA ADMINISTRATIVA ───────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Map className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Logística y Operación
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Rutas de Transporte</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorea el progreso de viajes, asigna unidades y supervisa incidencias activas en ruta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={adminRutasLoading}
            className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${adminRutasLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Solo administradores, supervisor y gerente_operaciones pueden crear rutas */}
          <RoleGate roles={['administrador', 'gerente_operaciones', 'supervisor']}>
            <Button asChild className="h-9 rounded-xl shadow-lg shadow-primary/20 font-medium">
              <Link href="/dashboard/rutas/nuevo">
                <Plus className="w-4 h-4 mr-1.5" />
                Planificar ruta
              </Link>
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Filters form */}
      <Card className="border border-border/50 bg-card shadow-lg">
        <CardContent className="p-4">
          <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Estado de ruta
              </label>
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En Curso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Desde (Fecha Estimada)
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Hasta (Fecha Estimada)
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 w-full sm:col-span-1">
              <Button type="button" variant="outline" onClick={handleClearFilters} className="h-9 flex-1 rounded-lg">
                Limpiar
              </Button>
              <Button type="submit" variant="secondary" className="h-9 flex-1 rounded-lg font-medium">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table container */}
      <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha Estimada</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origen / Destino</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehículo</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conductor</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {adminRutasLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-48" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted/60 rounded w-16" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-muted/60 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : rutas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <EmptyState
                      icon={Map}
                      title="No se encontraron rutas"
                      description="No hay rutas planificadas para esta sede que coincidan con los filtros aplicados."
                    />
                  </td>
                </tr>
              ) : (
                rutas.map((ruta) => {
                  const status = RUTA_ESTADO_CONFIG[ruta.estado];
                  return (
                    <tr key={ruta.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono font-medium text-foreground">
                        {new Date(ruta.fecha_estimada).toLocaleDateString('es-MX', {
                          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{ruta.origen}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ArrowRight className="w-3 h-3 text-primary shrink-0" /> {ruta.destino}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {ruta.camiones ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-semibold text-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                              #{ruta.camiones.numero_unidad}
                            </span>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {ruta.camiones.placas}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ruta.conductores ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-foreground">{ruta.conductores.nombre_completo}</span>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              Lic: {ruta.conductores.licencia_numero}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Link href={`/dashboard/rutas/${ruta.id}`}>
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
        {!adminRutasLoading && rutas.length > 0 && (
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
