'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Map, ArrowLeft, Loader2, Calendar, MapPin, Truck, Users, AlertTriangle, ExternalLink, Shield, Upload, Info
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import type { Ruta, PuntoIntermedio } from '@/modules/rutas/types';
import type { EstadoRuta, TipoIncidencia } from '@/lib/types';

interface Incidencia {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  evidencia_url: string | null;
  reportado_por: string;
  created_at: string;
}

interface RutaConDetalle extends Ruta {
  camiones?: {
    id: string;
    numero_unidad: string;
    marca: string;
    modelo: string;
    placas: string;
    estado: string;
  };
  conductores?: {
    id: string;
    nombre_completo: string;
    licencia_numero: string;
    tipo_licencia: string;
  };
  incidencias?: Incidencia[];
}

const RUTA_ESTADO_CONFIG: Record<EstadoRuta, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-muted/50 text-muted-foreground border-border/50' },
  en_curso: { label: 'En Curso', className: 'bg-primary/10 text-primary border-primary/20' },
  completada: { label: 'Completada', className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive border-destructive/20' }
};

const INCIDENCIA_TIPO_CONFIG: Record<TipoIncidencia, string> = {
  accidente: 'Accidente de tránsito',
  retraso: 'Retraso en ruta',
  falla_mecanica: 'Falla mecánica',
  otro: 'Otro incidente'
};

export default function DetalleRutaPage() {
  const params = useParams();
  const rutaId = params.id as string;

  const { user } = useCurrentUser();

  // Estados generales
  const [ruta, setRuta] = useState<RutaConDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  // Estados para actualizar estado de la ruta
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Estados para reportar incidencias
  const [incidenteTipo, setIncidenteTipo] = useState<TipoIncidencia | ''>('');
  const [incidenteDesc, setIncidenteDesc] = useState('');
  const [incidenteFile, setIncidenteFile] = useState<File | null>(null);
  const [incidenteLoading, setIncidenteLoading] = useState(false);
  const [incidenteError, setIncidenteError] = useState('');

  // Carga inicial (evita setStates síncronos en useEffect body)
  useEffect(() => {
    let active = true;
    if (user) {
      const supabase = createClient();
      supabase.auth.getUser()
        .then(({ data: { user: authUser } }) => {
          if (!authUser) throw new Error('Sesión no encontrada');
          return Promise.all([
            apiClient.get<RutaConDetalle>(`/api/rutas/${rutaId}`),
            user.rol === 'conductor'
              ? supabase.from('conductores').select('id').eq('profile_id', authUser.id).single()
              : Promise.resolve(null)
          ]);
        })
        .then(([rutaRes, conductorRes]) => {
          if (active) {
            if (user.rol === 'conductor' && conductorRes) {
              const condData = conductorRes.data as { id: string } | null;
              if (!condData || rutaRes.conductor_id !== condData.id) {
                setAccessDenied(true);
                setLoading(false);
                return;
              }
            }
            setRuta(rutaRes);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error loading route details:", err);
          if (active) {
            setErrorMsg(err instanceof Error ? err.message : 'Error al cargar los datos del viaje');
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [rutaId, user]);

  // Función manual para refrescar datos de la ruta cuando ocurren eventos en cliente (PATCH, POST)
  const refreshRuta = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setAccessDenied(false);

    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('Sesión no encontrada');
      }

      const data = await apiClient.get<RutaConDetalle>(`/api/rutas/${rutaId}`);

      if (user?.rol === 'conductor') {
        const { data: conductor } = await supabase
          .from('conductores')
          .select('id')
          .eq('profile_id', authUser.id)
          .single();

        if (!conductor || data.conductor_id !== conductor.id) {
          setAccessDenied(true);
          return;
        }
      }

      setRuta(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al recargar los datos del viaje');
    } finally {
      setLoading(false);
    }
  }, [rutaId, user]);

  // Cambiar estado de la ruta (PATCH)
  const handleTransitionStatus = async (nuevoEstado: EstadoRuta) => {
    if (!window.confirm(`¿Estás seguro de cambiar el estado de la ruta a "${nuevoEstado}"?`)) {
      return;
    }

    setStatusLoading(true);
    setStatusError('');

    try {
      const updated = await apiClient.patch<RutaConDetalle>(`/api/rutas/${rutaId}/estado`, {
        slate: nuevoEstado
      });
      setRuta(updated);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setStatusError(err.message);
      } else {
        setStatusError(err instanceof Error ? err.message : 'Error al cambiar estado de la ruta');
      }
    } finally {
      setStatusLoading(false);
    }
  };

  // Reportar Incidencia (Storage primero, luego API)
  const handleReportIncidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidenteTipo || !incidenteDesc.trim()) {
      setIncidenteError('Por favor completa todos los campos.');
      return;
    }

    setIncidenteLoading(true);
    setIncidenteError('');

    try {
      const supabase = createClient();
      let publicUrl: string | null = null;

      // 1. Subida opcional de archivo
      if (incidenteFile) {
        const fileExt = incidenteFile.name.split('.').pop();
        const filePath = `rutas/${rutaId}/incidencia_${Date.now()}.${fileExt}`;
        
        const { error: storageError } = await supabase.storage
          .from('incidencias')
          .upload(filePath, incidenteFile, { cacheControl: '3600', upsert: true });

        if (storageError) {
          throw new Error(`Error al subir imagen de evidencia: ${storageError.message}`);
        }

        const { data: { publicUrl: url } } = supabase.storage
          .from('incidencias')
          .getPublicUrl(filePath);
          
        publicUrl = url;
      }

      // 2. Registro en la API
      const body = {
        tipo: incidenteTipo,
        descripcion: incidenteDesc.trim(),
        evidencia_url: publicUrl
      };

      await apiClient.post(`/api/rutas/${rutaId}/incidencias`, body);
      
      // Limpiar formulario y recargar ruta
      setIncidenteTipo('');
      setIncidenteDesc('');
      setIncidenteFile(null);
      await refreshRuta();
    } catch (err: unknown) {
      setIncidenteError(err instanceof Error ? err.message : 'Error al registrar incidencia');
    } finally {
      setIncidenteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p className="text-muted-foreground mt-2">No tienes autorización para visualizar trayectos asignados a otros conductores.</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/dashboard/rutas">Volver a mis viajes</Link>
        </Button>
      </div>
    );
  }

  if (errorMsg || !ruta) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-muted-foreground mt-2">{errorMsg || 'Ruta no encontrada'}</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/dashboard/rutas">Volver al tablero</Link>
        </Button>
      </div>
    );
  }

  const isRutaEnCurso = ruta.estado === 'en_curso';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Back Button */}
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/rutas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a rutas
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Map className="w-6 h-6 text-primary" /> Detalle de Ruta
            </h1>
            <p className="text-sm text-muted-foreground">
              ID de Viaje: <span className="font-mono">{ruta.id.substring(0, 8)}...</span>
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
              RUTA_ESTADO_CONFIG[ruta.estado].className
            }`}>
              {RUTA_ESTADO_CONFIG[ruta.estado].label.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lado izquierdo: Itinerario y Timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Itinerario Card */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
              <CardTitle className="text-base font-bold">Trayecto e Itinerario</CardTitle>
              <CardDescription>Detalle del plan de viaje de la unidad.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative pl-8 space-y-6">
                <span className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border/40 border-dashed border-l" />

                {/* Origen */}
                <div className="relative">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-teal-400" />
                  <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Punto de Partida</h4>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-400 shrink-0" /> {ruta.origen}
                  </p>
                </div>

                {/* Paradas intermedias */}
                {(ruta.puntos_intermedios || []).map((punto: PuntoIntermedio, idx: number) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary" />
                    <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Parada Intermedia #{idx + 1}</h4>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary/60 shrink-0" /> {punto.nombre}
                    </p>
                  </div>
                ))}

                {/* Destino */}
                <div className="relative">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-primary" />
                  <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Punto de Destino</h4>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" /> {ruta.destino}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Incidencias */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
              <CardTitle className="text-base font-bold">Bitácora de Incidencias</CardTitle>
              <CardDescription>Eventos extraordinarios reportados durante la ruta.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              
              {/* Formulario de reporte de incidencias */}
              <div className="p-5 rounded-2xl bg-muted/15 border border-border/40">
                <h3 className="text-sm font-bold text-foreground mb-1">Reportar Suceso</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Envía reportes sobre fallas, demoras o accidentes en tiempo real.
                </p>

                {incidenteError && (
                  <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                    {incidenteError}
                  </div>
                )}

                {isRutaEnCurso ? (
                  <form onSubmit={handleReportIncidente} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tipo */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Tipo de suceso *
                        </label>
                        <select
                          value={incidenteTipo}
                          onChange={(e) => setIncidenteTipo(e.target.value as TipoIncidencia)}
                          required
                          className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="">Selecciona tipo...</option>
                          <option value="accidente">Accidente de tránsito</option>
                          <option value="retraso">Retraso en ruta</option>
                          <option value="falla_mecanica">Falla mecánica</option>
                          <option value="otro">Otro incidente</option>
                        </select>
                      </div>

                      {/* Fotografía Evidencia */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Foto / Evidencia (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setIncidenteFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Descripcion */}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Descripción detallada *
                      </label>
                      <textarea
                        placeholder="Describe el incidente (situación actual, daños, apoyos requeridos)"
                        value={incidenteDesc}
                        onChange={(e) => setIncidenteDesc(e.target.value)}
                        required
                        rows={3}
                        className="w-full p-3 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={incidenteLoading} className="rounded-xl h-9 font-semibold px-5">
                        {incidenteLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reportando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" /> Registrar reporte
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 flex gap-3 text-xs text-muted-foreground">
                    <Info className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Reporte no disponible</p>
                      <p className="mt-0.5 leading-relaxed">
                        Solo es posible registrar incidencias cuando la ruta se encuentra en estado &quot;En Curso&quot;. Esta ruta se encuentra en estado &quot;{ruta.estado}&quot;.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Listado de incidencias */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Historial de Reportes</h3>
                {!ruta.incidencias || ruta.incidencias.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No se han registrado incidencias en esta ruta.</p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {ruta.incidencias.map((inc) => (
                      <div key={inc.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between gap-4 items-start">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-destructive/10 text-destructive border-destructive/20">
                              {INCIDENCIA_TIPO_CONFIG[inc.tipo] || inc.tipo}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(inc.created_at).toLocaleString('es-MX', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {inc.descripcion}
                          </p>
                        </div>

                        {inc.evidencia_url && (
                          <a
                            href={inc.evidencia_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors shrink-0"
                          >
                            Ver foto <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Lado derecho: Asignación e Instrucciones de Control */}
        <div className="space-y-6">
          {/* Ficha técnica y tripulación */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
              <CardTitle className="text-base font-bold">Detalle de Operación</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Fecha Programada */}
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-0.5">Fecha Estimada de Salida</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  {new Date(ruta.fecha_estimada).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Camión */}
              {ruta.camiones && (
                <div className="pt-4 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Vehículo Asignado</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Unidad #{ruta.camiones.numero_unidad}</div>
                      <div className="text-[10px] text-muted-foreground">{ruta.camiones.marca} {ruta.camiones.modelo} ({ruta.camiones.placas})</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conductor */}
              {ruta.conductores && (
                <div className="pt-4 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Conductor Asignado</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{ruta.conductores.nombre_completo}</div>
                      <div className="text-[10px] text-muted-foreground">Lic: {ruta.conductores.licencia_numero}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de transiciones de estado (solo administradores, gerentes y supervisores) */}
          <RoleGate roles={['administrador', 'gerente_operaciones', 'supervisor']}>
            <Card className="border border-border/50 bg-card shadow-lg">
              <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
                <CardTitle className="text-base font-bold">Control de Estado</CardTitle>
                <CardDescription>Cambia el estado de la ruta actual.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {statusError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                    {statusError}
                  </div>
                )}

                {/* Pendiente -> En Curso / Cancelada */}
                {ruta.estado === 'pendiente' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleTransitionStatus('en_curso')}
                      disabled={statusLoading}
                      className="w-full rounded-xl h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/15"
                    >
                      {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iniciar viaje (En Curso)'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTransitionStatus('cancelada')}
                      disabled={statusLoading}
                      className="w-full rounded-xl h-10 font-medium text-destructive hover:bg-destructive/10 border-border/50"
                    >
                      Cancelar viaje
                    </Button>
                  </div>
                )}

                {/* En Curso -> Completada / Cancelada */}
                {ruta.estado === 'en_curso' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleTransitionStatus('completada')}
                      disabled={statusLoading}
                      className="w-full rounded-xl h-10 font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/15"
                    >
                      {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Completar viaje'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTransitionStatus('cancelada')}
                      disabled={statusLoading}
                      className="w-full rounded-xl h-10 font-medium text-destructive hover:bg-destructive/10 border-border/50"
                    >
                      Cancelar viaje
                    </Button>
                  </div>
                )}

                {/* Completada o Cancelada (Estados finales) */}
                {(ruta.estado === 'completada' || ruta.estado === 'cancelada') && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground italic">
                    La ruta ha llegado a su fin. No se permiten transiciones desde un estado final.
                  </div>
                )}
              </CardContent>
            </Card>
          </RoleGate>
        </div>
      </div>
    </div>
  );
}
