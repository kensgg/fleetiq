'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell, Check, RefreshCw, Mail, AlertTriangle, AlertCircle, Info, Loader2
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { apiClient } from '@/lib/api/client';

export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  entidad_tipo: string | null;
  entidad_id: string | null;
  leida: boolean;
  enviado_por_correo: boolean;
  created_at: string;
}

const PRIORIDAD_CONFIG = {
  alta: {
    label: 'Prioridad Alta',
    icon: AlertCircle,
    colorClass: 'text-red-500 bg-red-500/10 border-red-500/20',
    titleClass: 'text-red-400'
  },
  media: {
    label: 'Prioridad Media',
    icon: AlertTriangle,
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    titleClass: 'text-amber-400'
  },
  baja: {
    label: 'Prioridad Baja',
    icon: Info,
    colorClass: 'text-muted-foreground bg-muted/40 border-border/50',
    titleClass: 'text-muted-foreground'
  }
};

export default function NotificacionesPage() {
  const { user, loading: userLoading } = useCurrentUser();

  // Filtro por leída/no leída
  const [filterLeida, setFilterLeida] = useState<string>('');

  // 1. Fetch de Notificaciones paginado
  const {
    items: notificaciones,
    total,
    page,
    perPage,
    totalPages,
    loading,
    setPage,
    setFilters,
    refresh,
    mutateItems
  } = usePaginatedFetch<Notificacion>('/api/notificaciones', {
    initialPerPage: 10,
    initialFilters: { leida: '' }
  });

  const handleFilterChange = (val: string) => {
    setFilterLeida(val);
    setFilters({
      leida: val || null
    });
  };

  // Marcar como leída optimista + PATCH real
  const handleMarkAsRead = async (id: string) => {
    // 1. Llamada optimista a la UI: Mutamos el estado local de inmediato
    mutateItems((prevItems) =>
      prevItems.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );

    try {
      // 2. PATCH real al backend
      await apiClient.patch(`/api/notificaciones/${id}`);
    } catch (err) {
      console.error("Error al marcar como leída:", err);
      // Revertir optimismo en caso de falla
      refresh();
    }
  };

  const handleMarkAllAsRead = async () => {
    // Buscar todas las no leídas en la página actual
    const unreadIds = notificaciones.filter(n => !n.leida).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Mutar localmente optimista
    mutateItems((prevItems) =>
      prevItems.map((n) => (unreadIds.includes(n.id) ? { ...n, leida: true } : n))
    );

    try {
      // Llamadas PATCH paralelas
      await Promise.all(unreadIds.map(id => apiClient.patch(`/api/notificaciones/${id}`)));
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
      refresh();
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agrupar las notificaciones de la página actual por prioridad
  const altaNotifs = notificaciones.filter((n) => n.prioridad === 'alta');
  const mediaNotifs = notificaciones.filter((n) => n.prioridad === 'media');
  const bajaNotifs = notificaciones.filter((n) => n.prioridad === 'baja');

  const hasUnreadInPage = notificaciones.some(n => !n.leida);

  const renderGroup = (title: string, groupItems: Notificacion[], priorityKey: 'alta' | 'media' | 'baja') => {
    if (groupItems.length === 0) return null;
    const config = PRIORIDAD_CONFIG[priorityKey];
    const Icon = config.icon;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
          <Icon className={`w-4 h-4 ${config.titleClass}`} />
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {title} ({groupItems.length})
          </h2>
        </div>

        <div className="space-y-2">
          {groupItems.map((notif) => (
            <Card
              key={notif.id}
              onClick={() => !notif.leida && handleMarkAsRead(notif.id)}
              className={`border transition-all duration-200 ${
                notif.leida
                  ? 'border-border/30 bg-card/45 opacity-70 hover:opacity-100 cursor-default'
                  : 'border-primary/20 bg-primary/5 hover:border-primary/45 shadow-sm cursor-pointer'
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${notif.leida ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notif.titulo}
                    </h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${config.colorClass}`}>
                      {priorityKey.toUpperCase()}
                    </span>
                    {notif.enviado_por_correo && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/50">
                        <Mail className="w-2.5 h-2.5" /> Correo
                      </span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed break-words ${notif.leida ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>
                    {notif.mensaje}
                  </p>
                  <div className="text-[10px] text-muted-foreground/60 font-mono">
                    {new Date(notif.created_at).toLocaleString('es-MX', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>

                {!notif.leida && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif.id);
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-teal-500/10 hover:text-teal-400 text-muted-foreground transition-colors shrink-0"
                    aria-label="Marcar como leída"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Mensajería y Alertas
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Centro de Notificaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mantente al tanto de vencimientos de documentos, alertas de kilometraje y cambios de ruta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading}
            className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {hasUnreadInPage && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="h-9 rounded-xl font-semibold gap-1.5 text-xs"
            >
              <Check className="w-3.5 h-3.5" /> Marcar todo leído
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="border border-border/50 bg-card shadow-lg">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full text-xs text-muted-foreground">
            Filtrar notificaciones por estado de lectura:
          </div>

          <div className="w-full sm:w-48">
            <select
              value={filterLeida}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            >
              <option value="">Todas</option>
              <option value="false font-medium">No leídas</option>
              <option value="true">Leídas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Listado agrupado */}
      <div className="space-y-8">
        {loading && notificaciones.length === 0 ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted/60 rounded w-28" />
              <div className="h-20 bg-muted/60 rounded-xl w-full" />
            </div>
          ))
        ) : notificaciones.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="No tienes ninguna notificación registrada en este momento."
          />
        ) : (
          <>
            {renderGroup('Alerta Crítica / Alta', altaNotifs, 'alta')}
            {renderGroup('Alerta Operativa / Media', mediaNotifs, 'media')}
            {renderGroup('Información General / Baja', bajaNotifs, 'baja')}
          </>
        )}

        {/* Paginación */}
        {!loading && notificaciones.length > 0 && (
          <div className="pt-4">
            <PaginationControls
              page={page}
              perPage={perPage}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
