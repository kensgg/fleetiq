'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck, Plus, Search, RefreshCw, Eye
} from 'lucide-react';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { EmptyState } from '@/components/dashboard/EmptyState';
import type { Camion } from '@/modules/vehiculos/types';
import type { EstadoCamion } from '@/lib/types';

const ESTADO_CONFIG: Record<EstadoCamion, { label: string; className: string }> = {
  disponible: {
    label: 'Disponible',
    className: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  },
  en_ruta: {
    label: 'En Ruta',
    className: 'bg-primary/10 text-primary border-primary/20'
  },
  mantenimiento: {
    label: 'Mantenimiento',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  fuera_servicio: {
    label: 'Fuera de Servicio',
    className: 'bg-muted/50 text-muted-foreground border-border/50'
  }
};

export default function VehiculosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  const {
    items: camiones,
    total,
    page,
    perPage,
    totalPages,
    loading,
    setPage,
    setFilters,
    refresh
  } = usePaginatedFetch<Camion>('/api/camiones', {
    initialPerPage: 10,
    initialFilters: { search: '', estado: '' }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      search: searchTerm.trim(),
      estado: selectedEstado || null
    });
  };

  const handleEstadoChange = (estadoVal: string) => {
    setSelectedEstado(estadoVal);
    setFilters({
      search: searchTerm.trim(),
      estado: estadoVal || null
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Operaciones
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra la flota de camiones de la sede: unidades, documentos y mantenimientos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <RoleGate roles={['administrador']}>
            <Button asChild className="h-9 rounded-xl shadow-lg shadow-primary/20 font-medium">
              <Link href="/dashboard/vehiculos/nuevo">
                <Plus className="w-4 h-4 mr-1.5" />
                Registrar unidad
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
                placeholder="Buscar por placa o número de unidad..."
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
                <option value="disponible">Disponible</option>
                <option value="en_ruta">En Ruta</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="fuera_servicio">Fuera de Servicio</option>
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
                  Unidad
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Marca / Modelo
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Placas
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                /* Skeleton rows */
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted/60 rounded w-20" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-muted/60 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : camiones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <EmptyState
                      icon={Truck}
                      title="No se encontraron vehículos"
                      description="No hay camiones registrados en esta sede que coincidan con tu búsqueda o filtros."
                      actionLabel="Registrar primer vehículo"
                      onActionClick={() => window.location.href = '/dashboard/vehiculos/nuevo'}
                    />
                  </td>
                </tr>
              ) : (
                camiones.map((camion) => {
                  const estado = ESTADO_CONFIG[camion.estado] || { label: camion.estado, className: 'bg-muted text-muted-foreground' };
                  return (
                    <tr key={camion.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        #{camion.numero_unidad}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{camion.marca}</div>
                        <div className="text-xs text-muted-foreground">{camion.modelo} ({camion.anio})</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {camion.placas}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${estado.className}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Link href={`/dashboard/vehiculos/${camion.id}`}>
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
        {!loading && camiones.length > 0 && (
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
