'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, ArrowLeft, Loader2, Clock,
  Edit2, X, AlertTriangle, Truck
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { Conductor } from '../page';
import type { AsignacionConductorCamion, Camion } from '@/modules/vehiculos/types';
import type { EstadoRuta } from '@/lib/types';

interface ProfileOption {
  id: string;
  nombre_completo: string;
  rol: string;
  estado: boolean;
}

interface CamionesResponse {
  items: Camion[];
  total: number;
}

interface AsignacionConCamion extends AsignacionConductorCamion {
  camiones?: {
    id: string;
    numero_unidad: string;
    marca: string;
    modelo: string;
    placas: string;
  };
}

interface ConductorDetail extends Conductor {
  asignaciones_conductor_camion?: AsignacionConCamion[];
}

interface Viaje {
  id: string;
  origen: string;
  destino: string;
  fecha_estimada: string;
  estado: EstadoRuta;
  camion_id: string;
  camiones?: {
    id: string;
    numero_unidad: string;
    marca: string;
    modelo: string;
    placas: string;
  };
}

const VIAJE_ESTADO_CONFIG: Record<EstadoRuta, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-muted/50 text-muted-foreground border-border/50' },
  en_curso: { label: 'En Curso', className: 'bg-primary/10 text-primary border-primary/20' },
  completada: { label: 'Completada', className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive border-destructive/20' }
};

type TabType = 'general' | 'viajes';

export default function DetalleConductorPage() {
  const params = useParams();
  const conductorId = params.id as string;

  const { user } = useCurrentUser();
  const isAdmin = user?.rol === 'administrador';

  // Estados generales
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [conductor, setConductor] = useState<ConductorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Tab General: Edición inline
  const [isEditing, setIsEditing] = useState(false);
  const [editNombreCompleto, setEditNombreCompleto] = useState('');
  const [editLicenciaNumero, setEditLicenciaNumero] = useState('');
  const [editTipoLicencia, setEditTipoLicencia] = useState('');
  const [editLicenciaVigencia, setEditLicenciaVigencia] = useState('');
  const [editEstado, setEditEstado] = useState(true);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState('');
  const [generalLoading, setGeneralLoading] = useState(false);

  // Selector de perfiles (para edición inline)
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  // 2. Tab General: Modal para asignar camión
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [camionesDisponibles, setCamionesDisponibles] = useState<Camion[]>([]);
  const [selectedCamionId, setSelectedCamionId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  // 3. Tab Viajes: Paginación
  const {
    items: viajes,
    total: viajesTotal,
    page: viajesPage,
    perPage: viajesPerPage,
    totalPages: viajesTotalPages,
    loading: viajesListLoading,
    setPage: setViajesPage,
  } = usePaginatedFetch<Viaje>(`/api/conductores/${conductorId}/historial-viajes`, {
    initialPerPage: 5
  });

  // Carga inicial del conductor (evita setState síncronos en useEffect body)
  useEffect(() => {
    let active = true;
    apiClient.get<ConductorDetail>(`/api/conductores/${conductorId}`)
      .then((data) => {
        if (active) {
          setConductor(data);
          setEditNombreCompleto(data.nombre_completo);
          setEditLicenciaNumero(data.licencia_numero);
          setEditTipoLicencia(data.tipo_licencia);
          setEditLicenciaVigencia(data.licencia_vigencia);
          setEditEstado(data.estado);
          setEditProfileId(data.profile_id);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al cargar los datos del conductor');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [conductorId]);

  // Función manual para refrescar datos de conductor cuando ocurren eventos en cliente (POST, DELETE, PUT)
  const refreshConductor = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient.get<ConductorDetail>(`/api/conductores/${conductorId}`);
      setConductor(data);
      setEditNombreCompleto(data.nombre_completo);
      setEditLicenciaNumero(data.licencia_numero);
      setEditTipoLicencia(data.tipo_licencia);
      setEditLicenciaVigencia(data.licencia_vigencia);
      setEditEstado(data.estado);
      setEditProfileId(data.profile_id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al recargar los datos del conductor');
    } finally {
      setLoading(false);
    }
  }, [conductorId]);

  // Cargar perfiles de usuario en la sede (solo administradores)
  useEffect(() => {
    let active = true;
    if (isAdmin && isEditing) {
      apiClient.get<ProfileOption[]>('/api/users')
        .then((data) => {
          if (active) {
            setProfiles(data || []);
          }
        })
        .catch((err) => {
          console.error("Error al cargar usuarios:", err);
        });
    }
    return () => {
      active = false;
    };
  }, [isAdmin, isEditing]);

  // Guardar Cambios de Info General
  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setGeneralLoading(true);

    const body = {
      nombre_completo: editNombreCompleto.trim(),
      licencia_numero: editLicenciaNumero.trim().toUpperCase(),
      tipo_licencia: editTipoLicencia.trim().toUpperCase(),
      licencia_vigencia: editLicenciaVigencia,
      estado: editEstado,
      profile_id: editProfileId || null
    };

    try {
      const updated = await apiClient.put<ConductorDetail>(`/api/conductores/${conductorId}`, body);
      setConductor(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error al actualizar');
      }
    } finally {
      setGeneralLoading(false);
    }
  };

  // Desactivar / Soft-delete Conductor
  const handleSoftDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas desactivar este conductor? Se finalizará cualquier asignación de camión de inmediato.')) {
      return;
    }
    setGeneralLoading(true);
    setGeneralError('');
    try {
      await apiClient.delete(`/api/conductores/${conductorId}`);
      await refreshConductor();
      setIsEditing(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error al desactivar');
      }
    } finally {
      setGeneralLoading(false);
    }
  };

  // Cargar camiones disponibles para la asignación
  const handleOpenAssignModal = async () => {
    setAssignError('');
    setSelectedCamionId('');
    setShowAssignModal(true);
    setAssignLoading(true);
    try {
      const res = await apiClient.get<CamionesResponse>('/api/camiones?estado=disponible&per_page=100');
      setCamionesDisponibles(res.items || []);
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Error al cargar camiones disponibles');
    } finally {
      setAssignLoading(false);
    }
  };

  // Crear Asignación
  const handleAssignCamion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamionId) {
      setAssignError('Por favor selecciona un camión de la lista.');
      return;
    }

    setAssignLoading(true);
    setAssignError('');

    try {
      await apiClient.post('/api/asignaciones', {
        camion_id: selectedCamionId,
        conductor_id: conductorId
      });
      setShowAssignModal(false);
      await refreshConductor(); // Recargar conductor para mostrar el camión asignado activo
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setAssignError(err.message);
      } else {
        setAssignError(err instanceof Error ? err.message : 'Error al crear la asignación');
      }
    } finally {
      setAssignLoading(false);
    }
  };

  // Finalizar Asignación Activa
  const handleTerminateAssignment = async (asignacionId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas finalizar la asignación de este camión?')) {
      return;
    }
    setGeneralLoading(true);
    try {
      await apiClient.delete(`/api/asignaciones/${asignacionId}`);
      await refreshConductor();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al finalizar la asignación');
    } finally {
      setGeneralLoading(false);
    }
  };

  // Helper para verificar vigencia de licencia
  const getLicenciaBadge = (fechaVencimiento: string) => {
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
      return {
        text: `Vencida (${formatted})`,
        className: 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
      };
    } else if (diffDays < 30) {
      return {
        text: `Vence pronto (${formatted})`,
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium'
      };
    } else {
      return {
        text: `Vigente (${formatted})`,
        className: 'bg-teal-500/10 text-teal-400 border-teal-500/20 font-medium'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMsg || !conductor) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-muted-foreground mt-2">{errorMsg || 'Conductor no encontrado'}</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/dashboard/conductores">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  // Ordenar asignaciones históricas por fecha de inicio descendente
  const asignacionesOrdenadas = [...(conductor.asignaciones_conductor_camion || [])].sort(
    (a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
  );

  const asignacionActiva = asignacionesOrdenadas.find((a) => a.activo);
  const licVigenciaBadge = getLicenciaBadge(conductor.licencia_vigencia);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back and title header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/conductores"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a conductores
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> {conductor.nombre_completo}
            </h1>
            <p className="text-sm text-muted-foreground">
              Licencia: <span className="font-mono">{conductor.licencia_numero}</span> · Clase: {conductor.tipo_licencia}
            </p>
          </div>
          <div>
            {conductor.estado ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-teal-500/10 text-teal-400 border-teal-500/20">
                ACTIVO
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-muted/50 text-muted-foreground border-border/50">
                INACTIVO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/30 flex gap-2 overflow-x-auto pb-px">
        {[
          { id: 'general', label: 'Información general', icon: Users },
          { id: 'viajes', label: 'Historial de viajes', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all shrink-0 -mb-px ${
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">

        {/* Tab General */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border border-border/50 bg-card shadow-lg">
              <CardHeader className="border-b border-border/30 bg-muted/10 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Ficha Laboral</CardTitle>
                  <CardDescription>Detalles del registro del conductor.</CardDescription>
                </div>
                <RoleGate roles={['administrador']}>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-lg">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  )}
                </RoleGate>
              </CardHeader>
              <CardContent className="p-6">
                {generalError && (
                  <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                    {generalError}
                  </div>
                )}

                <form onSubmit={handleUpdateGeneral} className="space-y-4">
                  {/* Nombre completo */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={editNombreCompleto}
                      onChange={(e) => setEditNombreCompleto(e.target.value)}
                      disabled={!isEditing || generalLoading}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Licencia numero */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Número de Licencia
                      </label>
                      <input
                        type="text"
                        value={editLicenciaNumero}
                        onChange={(e) => setEditLicenciaNumero(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 font-mono uppercase"
                      />
                    </div>
                    {/* Tipo licencia */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Tipo de Licencia
                      </label>
                      <input
                        type="text"
                        value={editTipoLicencia}
                        onChange={(e) => setEditTipoLicencia(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Vigencia */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Fecha de Vigencia
                      </label>
                      <input
                        type="date"
                        value={editLicenciaVigencia}
                        onChange={(e) => setEditLicenciaVigencia(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75"
                      />
                    </div>

                    {/* Cuenta Vincular */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Cuenta Vinculada
                      </label>
                      {isEditing ? (
                        <select
                          value={editProfileId || ''}
                          onChange={(e) => setEditProfileId(e.target.value || null)}
                          disabled={generalLoading}
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="">Ninguna cuenta asociada</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={conductor.profile_id ? 'Cuenta vinculada activa' : 'Sin cuenta vinculada'}
                          disabled
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm disabled:opacity-75"
                        />
                      )}
                    </div>
                  </div>

                  {/* Estado conductor (activo/inactivo) */}
                  {isEditing && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Estado
                      </label>
                      <select
                        value={editEstado ? 'true' : 'false'}
                        onChange={(e) => setEditEstado(e.target.value === 'true')}
                        disabled={generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                      </select>
                    </div>
                  )}

                  {isEditing && (
                    <div className="pt-4 border-t border-border/30 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setGeneralError('');
                        }}
                        disabled={generalLoading}
                        className="rounded-lg h-9"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={generalLoading} className="rounded-lg h-9 px-4">
                        {generalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                      </Button>
                    </div>
                  )}
                </form>

                {/* Timeline de asignaciones históricas */}
                <div className="mt-8 pt-8 border-t border-border/30">
                  <h3 className="text-sm font-bold text-foreground mb-4">Historial de Camiones Asignados</h3>
                  {asignacionesOrdenadas.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No hay historial de vehículos registrados.</p>
                  ) : (
                    <div className="relative pl-6 border-l border-border/40 space-y-5">
                      {asignacionesOrdenadas.map((a) => {
                        const cam = a.camiones;
                        const dInicio = new Date(a.fecha_inicio).toLocaleDateString('es-MX', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        });
                        const dFin = a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString('es-MX', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        }) : 'Presente';

                        return (
                          <div key={a.id} className="relative">
                            {/* Dot */}
                            <span className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                              a.activo ? 'bg-primary border-primary ring-4 ring-primary/20' : 'bg-muted-foreground border-muted-foreground'
                            }`} />

                            <div className="text-sm font-medium text-foreground">
                              {cam ? `Unidad #${cam.numero_unidad}` : 'Vehículo no especificado'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cam ? `${cam.marca} ${cam.modelo} (${cam.placas})` : ''}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-1">
                              Período: {dInicio} — {dFin}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Asignación Activa Lateral */}
            <div className="space-y-4">
              <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" /> Asignación Activa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {asignacionActiva && asignacionActiva.camiones ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Camión</span>
                          <span className="text-sm font-bold font-mono text-foreground">
                            #{asignacionActiva.camiones.numero_unidad}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Marca / Modelo</span>
                          <span className="text-xs text-foreground font-medium block">
                            {asignacionActiva.camiones.marca} {asignacionActiva.camiones.modelo}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Placas</span>
                          <span className="text-xs font-mono text-foreground block">
                            {asignacionActiva.camiones.placas}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-0.5">Asignado el</span>
                          <span className="text-xs text-muted-foreground block font-mono">
                            {new Date(asignacionActiva.fecha_inicio).toLocaleDateString('es-MX', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <RoleGate roles={['administrador']}>
                        <Button
                          variant="destructive"
                          onClick={() => handleTerminateAssignment(asignacionActiva.id)}
                          disabled={generalLoading}
                          className="w-full mt-4 h-9 rounded-xl font-medium"
                        >
                          Finalizar asignación
                        </Button>
                      </RoleGate>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-muted-foreground italic">Sin vehículo asignado actualmente.</p>
                      
                      <RoleGate roles={['administrador']}>
                        {conductor.estado && (
                          <Button
                            onClick={handleOpenAssignModal}
                            disabled={generalLoading}
                            className="mt-4 w-full h-9 rounded-xl font-semibold shadow-lg shadow-primary/20"
                          >
                            Asignar camión
                          </Button>
                        )}
                      </RoleGate>
                    </div>
                  )}

                  {/* Detalle de vigencia lateral */}
                  <div className="pt-4 border-t border-border/30 space-y-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block mb-1">Vigencia de Licencia</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${licVigenciaBadge.className}`}>
                        {licVigenciaBadge.text}
                      </span>
                    </div>
                  </div>

                  <RoleGate roles={['administrador']}>
                    {conductor.estado && (
                      <div className="pt-4 border-t border-border/30">
                        <Button
                          variant="outline"
                          onClick={handleSoftDelete}
                          disabled={generalLoading}
                          className="w-full rounded-xl gap-2 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-border/50"
                        >
                          Desactivar conductor
                        </Button>
                      </div>
                    )}
                  </RoleGate>
                </CardContent>
              </Card>
            </div>

            {/* Modal para Asignar Camión */}
            {showAssignModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                <Card className="w-full max-w-md border border-border/50 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <CardHeader className="border-b border-border/30 bg-muted/10 p-5 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Asignar Camión</CardTitle>
                      <CardDescription>Selecciona un vehículo libre de la sede.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowAssignModal(false)} className="rounded-lg w-8 h-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5">
                    {assignError && (
                      <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                        {assignError}
                      </div>
                    )}

                    <form onSubmit={handleAssignCamion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Vehículo disponible
                        </label>
                        {assignLoading && camionesDisponibles.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Cargando unidades...
                          </div>
                        ) : camionesDisponibles.length === 0 ? (
                          <p className="text-xs text-destructive font-medium py-2">
                            No hay vehículos con estado &quot;Disponible&quot; en la sede en este momento.
                          </p>
                        ) : (
                          <select
                            value={selectedCamionId}
                            onChange={(e) => setSelectedCamionId(e.target.value)}
                            required
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="">Selecciona unidad...</option>
                            {camionesDisponibles.map((cam) => (
                              <option key={cam.id} value={cam.id}>
                                Unidad #{cam.numero_unidad} — {cam.marca} {cam.modelo} ({cam.placas})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-border/30 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAssignModal(false)}
                          disabled={assignLoading}
                          className="rounded-lg h-9"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={assignLoading || camionesDisponibles.length === 0} className="rounded-lg h-9 px-4">
                          {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Asignar'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Tab Viajes */}
        {activeTab === 'viajes' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Historial de Viajes</h2>
              <p className="text-xs text-muted-foreground">Listado de rutas operadas por este conductor.</p>
            </div>

            <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha Estimada</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origen</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehículo utilizado</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {viajesListLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-20" /></td>
                          <td className="px-6 py-4 text-right"><div className="h-5 bg-muted/60 rounded w-16 ml-auto" /></td>
                        </tr>
                      ))
                    ) : viajes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                          No hay viajes registrados en el historial de este conductor.
                        </td>
                      </tr>
                    ) : (
                      viajes.map((v) => {
                        const status = VIAJE_ESTADO_CONFIG[v.estado] || { label: v.estado, className: 'bg-muted text-muted-foreground border-border' };
                        return (
                          <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono font-medium text-foreground">
                              {new Date(v.fecha_estimada).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">{v.origen}</td>
                            <td className="px-6 py-4 text-foreground">{v.destino}</td>
                            <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                              {v.camiones ? `Unidad #${v.camiones.numero_unidad}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!viajesListLoading && viajes.length > 0 && (
                <PaginationControls
                  page={viajesPage}
                  perPage={viajesPerPage}
                  total={viajesTotal}
                  totalPages={viajesTotalPages}
                  onPageChange={setViajesPage}
                />
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
