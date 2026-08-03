'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Download, RefreshCw, Calendar, Truck, AlertTriangle, ShieldAlert,
  Loader2, CheckCircle2, Info
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { apiClient } from '@/lib/api/client';
import type { Camion } from '@/modules/vehiculos/types';

interface CamionesResponse {
  items: Camion[];
}

interface ReporteGenerado {
  id: string;
  sede_id: string;
  tipo: string;
  filtros: {
    fecha_desde?: string;
    fecha_hasta?: string;
    camion_id?: string;
  };
  formato: string;
  generado_por: string;
  archivo_url: string | null;
  created_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  combustible: 'Combustible',
  km_recorridos: 'Kilometraje Recorrido',
  mantenimiento: 'Costos de Mantenimiento',
  eficiencia_rutas: 'Eficiencia de Rutas'
};

const FORMATO_COLORS: Record<string, string> = {
  pdf: 'bg-red-500/10 text-red-500 border-red-500/20',
  xlsx: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
};

export default function ReportesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  // Estados del Formulario
  const [selectedTipo, setSelectedTipo] = useState<string>('km_recorridos');
  const [selectedFormato, setSelectedFormato] = useState<string>('pdf');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [selectedCamionId, setSelectedCamionId] = useState<string>('');

  // Opciones del Formulario
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [loadingCamiones, setLoadingCamiones] = useState(false);

  // Estados de generación
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Redirección de seguridad (Conductor y Capturista no acceden a reportes)
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/login');
      } else if (['conductor', 'capturista'].includes(user.rol)) {
        router.push('/dashboard/notificaciones');
      }
    }
  }, [user, userLoading, router]);

  // 2. Fetch del Historial de Reportes
  const {
    items: reportes,
    total,
    page,
    perPage,
    totalPages,
    loading: loadingHistorial,
    setPage,
    refresh: refreshHistorial
  } = usePaginatedFetch<ReporteGenerado>('/api/reportes', {
    initialPerPage: 10
  });

  // 3. Cargar camiones disponibles para filtrar
  useEffect(() => {
    let active = true;
    if (user && ['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol)) {
      Promise.resolve().then(() => {
        if (active) setLoadingCamiones(true);
      });

      apiClient.get<CamionesResponse>('/api/camiones?per_page=100')
        .then((res) => {
          if (active) {
            setCamiones(res.items || []);
            setLoadingCamiones(false);
          }
        })
        .catch((err) => {
          console.error("Error al cargar camiones para reportes:", err);
          if (active) setLoadingCamiones(false);
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  // Submit de Generación de Reporte
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (selectedTipo === 'combustible') {
      setErrorMsg('No es posible generar este reporte. Los datos de combustible no se capturan en el sistema.');
      return;
    }

    setFormLoading(true);

    const filtros: Record<string, string> = {};
    if (fechaDesde) filtros.fecha_desde = fechaDesde;
    if (fechaHasta) filtros.fecha_hasta = fechaHasta;
    if (selectedCamionId) filtros.camion_id = selectedCamionId;

    const body = {
      tipo: selectedTipo,
      formato: selectedFormato,
      filtros
    };

    try {
      await apiClient.post('/api/reportes', body);
      setSuccessMsg('Reporte generado correctamente. Revisa la tabla del histórico.');
      
      // Limpiar filtros del formulario
      setFechaDesde('');
      setFechaHasta('');
      setSelectedCamionId('');
      
      // Recargar histórico
      refreshHistorial();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido al generar reporte');
    } finally {
      setFormLoading(false);
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Control e Inteligencia
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes de Operación</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Genera auditorías en PDF o Excel sobre kilometraje, taller o eficiencia operativa.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={refreshHistorial}
          disabled={loadingHistorial}
          className="w-9 h-9 rounded-xl border-border/50 hover:border-primary/50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingHistorial ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Formulario de Generación (Solo Administrador y Gerente de Operaciones) */}
      <RoleGate
        roles={['administrador', 'gerente_operaciones']}
        fallback={
          <Card className="border border-border/40 bg-card p-6 text-center text-xs text-muted-foreground">
            <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-foreground">Generación deshabilitada</p>
            <p className="mt-1 max-w-md mx-auto leading-relaxed">
              Tu rol de Supervisor te permite consultar el histórico de reportes de la sede, pero no tienes permisos para generar nuevos archivos.
            </p>
          </Card>
        }
      >
        <Card className="border border-border/50 bg-card shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
            <CardTitle className="text-base font-bold">Solicitar Nuevo Reporte</CardTitle>
            <CardDescription>Completa los filtros para empaquetar y compilar datos operativos.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {successMsg && (
              <div className="mb-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tipo de Reporte */}
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tipo de Reporte *
                  </label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="km_recorridos">Kilometraje Recorrido</option>
                    <option value="mantenimiento">Mantenimientos y Costos</option>
                    <option value="eficiencia_rutas">Eficiencia de Rutas</option>
                    <option value="combustible" disabled>
                      Rendimiento Combustible (Deshabilitado)
                    </option>
                  </select>
                  {selectedTipo === 'combustible' && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">
                      Aún no disponible: no se captura este dato en el sistema.
                    </p>
                  )}
                  {selectedTipo !== 'combustible' && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Elige el tipo de datos a consolidar.
                    </p>
                  )}
                </div>

                {/* Camión Filtrar */}
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Filtrar por Vehículo (Opcional)
                  </label>
                  <select
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                    disabled={loadingCamiones}
                    className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                  >
                    <option value="">Todos los vehículos</option>
                    {camiones.map(c => (
                      <option key={c.id} value={c.id}>
                        Unidad #{c.numero_unidad} ({c.placas})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Formato de Salida *
                  </label>
                  <select
                    value={selectedFormato}
                    onChange={(e) => setSelectedFormato(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="xlsx">Hoja de Cálculo Excel (.xlsx)</option>
                  </select>
                </div>
              </div>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Fecha Desde (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Fecha Hasta (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Advertencia de Combustible si está seleccionado */}
              {selectedTipo === 'combustible' && (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 flex gap-2.5 items-start text-xs text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Advertencia Técnica:</span> El consumo de combustible aún no se captura en el sistema. Este tipo de reporte se encuentra desactivado preventivamente para evitar descargas vacías.
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={formLoading || selectedTipo === 'combustible'}
                  className="rounded-xl h-10 font-bold px-6 shadow-lg shadow-primary/20"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compilando datos...
                    </>
                  ) : (
                    'Generar y Compilar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </RoleGate>

      {/* Historial de Reportes Generados */}
      <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
          <CardTitle className="text-base font-bold">Historial de Reportes</CardTitle>
          <CardDescription>Consulta y descarga las auditorías generadas anteriormente.</CardDescription>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha Generación</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo Reporte</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros Aplicados</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formato</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descargar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loadingHistorial && reportes.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-36" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-48" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted/60 rounded w-10" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-muted/60 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : reportes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <EmptyState
                      icon={FileText}
                      title="Historial vacío"
                      description="No se han registrado reportes archivados para tu sede."
                    />
                  </td>
                </tr>
              ) : (
                reportes.map((rep) => {
                  const hasFiltros = Object.keys(rep.filtros || {}).length > 0;
                  
                  return (
                    <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono font-medium text-foreground">
                        {new Date(rep.created_at).toLocaleString('es-MX', {
                          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {TIPO_LABELS[rep.tipo] || rep.tipo}
                      </td>
                      <td className="px-6 py-4">
                        {hasFiltros ? (
                          <div className="flex flex-wrap gap-1.5">
                            {rep.filtros.fecha_desde && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border/40 font-mono">
                                <Calendar className="w-2.5 h-2.5 shrink-0" /> Desde: {rep.filtros.fecha_desde}
                              </span>
                            )}
                            {rep.filtros.fecha_hasta && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border/40 font-mono">
                                <Calendar className="w-2.5 h-2.5 shrink-0" /> Hasta: {rep.filtros.fecha_hasta}
                              </span>
                            )}
                            {rep.filtros.camion_id && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border/40 font-mono">
                                <Truck className="w-2.5 h-2.5 shrink-0" /> Unidad: {rep.filtros.camion_id.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Completo (Sin filtros)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${
                          FORMATO_COLORS[rep.formato.toLowerCase()] || 'bg-muted border-border/50 text-muted-foreground'
                        }`}>
                          {rep.formato}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rep.archivo_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <a href={rep.archivo_url} target="_blank" rel="noopener noreferrer" aria-label="Descargar reporte">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic flex items-center gap-1 justify-end">
                            <Info className="w-3.5 h-3.5 shrink-0" /> No disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loadingHistorial && reportes.length > 0 && (
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
