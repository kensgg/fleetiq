'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck, ArrowLeft, Loader2, Calendar, FileText, Wrench, Clock,
  Upload, Trash2, Edit2, X, AlertTriangle, ExternalLink, Plus
} from 'lucide-react';
import { usePaginatedFetch } from '@/lib/hooks/usePaginatedFetch';
import { PaginationControls } from '@/components/dashboard/PaginationControls';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import type { Camion, DocumentoCamion, Mantenimiento, AsignacionConductorCamion } from '@/modules/vehiculos/types';
import type { TipoDocumentoCamion } from '@/lib/types';

// Configuración de tipos de documentos
const DOCUMENTOS_CONFIG: Record<TipoDocumentoCamion, { label: string; placeholder: string }> = {
  tarjeta_circulacion: { label: 'Tarjeta de Circulación', placeholder: 'Verificar placas y número de motor' },
  seguro: { label: 'Póliza de Seguro', placeholder: 'Póliza de cobertura contra siniestros y daños' },
  verificacion: { label: 'Verificación Vehicular', placeholder: 'Emisiones contaminantes y estado físico-mecánico' },
  permiso_sct: { label: 'Permiso SCT', placeholder: 'Autorización para autotransporte federal de carga' }
};

interface AsignacionConductor extends AsignacionConductorCamion {
  conductores?: {
    id: string;
    nombre_completo: string;
    licencia_numero: string;
    tipo_licencia: string;
    estado: boolean;
  };
}

type TabType = 'general' | 'documentos' | 'mantenimientos' | 'asignaciones';

export default function DetalleVehiculoPage() {
  const params = useParams();
  const camionId = params.id as string;

  // Estados generales
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [camion, setCamion] = useState<Camion | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoCamion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Tab General: Edición inline
  const [isEditing, setIsEditing] = useState(false);
  const [editNumeroUnidad, setEditNumeroUnidad] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editModelo, setEditModelo] = useState('');
  const [editAnio, setEditAnio] = useState(0);
  const [editPlacas, setEditPlacas] = useState('');
  const [editNumeroSerie, setEditNumeroSerie] = useState('');
  const [editTipoCarga, setEditTipoCarga] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [generalLoading, setGeneralLoading] = useState(false);

  // 2. Tab Documentos: Carga e ingreso de fechas
  const [selectedDocType, setSelectedDocType] = useState<TipoDocumentoCamion | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docVencimiento, setDocVencimiento] = useState('');
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [docError, setDocError] = useState('');

  // 3. Tab Mantenimientos: Paginación y modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintFecha, setMaintFecha] = useState(new Date().toISOString().split('T')[0]);
  const [maintTipo, setMaintTipo] = useState('');
  const [maintCosto, setMaintCosto] = useState('');
  const [maintProveedor, setMaintProveedor] = useState('');
  const [maintKilometraje, setMaintKilometraje] = useState('');
  const [maintError, setMaintError] = useState('');
  const [maintLoading, setMaintLoading] = useState(false);

  const {
    items: mantenimientos,
    total: maintTotal,
    page: maintPage,
    perPage: maintPerPage,
    totalPages: maintTotalPages,
    loading: maintListLoading,
    setPage: setMaintPage,
    refresh: refreshMantenimientos
  } = usePaginatedFetch<Mantenimiento>(`/api/camiones/${camionId}/mantenimientos`, {
    initialPerPage: 5
  });

  // 4. Tab Asignaciones
  const [asignaciones, setAsignaciones] = useState<AsignacionConductor[]>([]);
  const [asignacionesLoading, setAsignacionesLoading] = useState(false);

  // Carga asíncrona pura del camión inicial en useEffect (evita warnings de setState síncronos)
  useEffect(() => {
    let active = true;

    apiClient.get<Camion & { documentos_camion: DocumentoCamion[] }>(`/api/camiones/${camionId}`)
      .then((data) => {
        if (active) {
          setCamion(data);
          setDocumentos(data.documentos_camion || []);
          setEditNumeroUnidad(data.numero_unidad);
          setEditMarca(data.marca);
          setEditModelo(data.modelo);
          setEditAnio(data.anio);
          setEditPlacas(data.placas);
          setEditNumeroSerie(data.numero_serie);
          setEditTipoCarga(data.tipo_carga || '');
          setEditEstado(data.estado);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al cargar los datos del camión');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [camionId]);

  // Función manual para refrescar datos de camión cuando ocurren eventos en cliente (POST, DELETE, PUT)
  const refreshCamion = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Camion & { documentos_camion: DocumentoCamion[] }>(`/api/camiones/${camionId}`);
      setCamion(data);
      setDocumentos(data.documentos_camion || []);
      setEditNumeroUnidad(data.numero_unidad);
      setEditMarca(data.marca);
      setEditModelo(data.modelo);
      setEditAnio(data.anio);
      setEditPlacas(data.placas);
      setEditNumeroSerie(data.numero_serie);
      setEditTipoCarga(data.tipo_carga || '');
      setEditEstado(data.estado);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al recargar los datos del camión');
    } finally {
      setLoading(false);
    }
  }, [camionId]);

  // Manejador del cambio de pestañas (Tab change handler) — Ejecuta el fetch asíncrono sin efectos reactivos
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (tabId === 'asignaciones') {
      setAsignacionesLoading(true);
      apiClient.get<AsignacionConductor[]>(`/api/camiones/${camionId}/asignaciones`)
        .then((data) => {
          setAsignaciones(data || []);
        })
        .catch((err) => {
          console.error("Error al cargar asignaciones:", err);
        })
        .finally(() => {
          setAsignacionesLoading(false);
        });
    }
  };

  // Guardar Cambios de Info General
  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setGeneralLoading(true);

    const body = {
      numero_unidad: editNumeroUnidad.trim(),
      marca: editMarca.trim(),
      modelo: editModelo.trim(),
      anio: Number(editAnio),
      placas: editPlacas.trim().toUpperCase(),
      numero_serie: editNumeroSerie.trim().toUpperCase(),
      tipo_carga: editTipoCarga.trim() || null,
      estado: editEstado
    };

    try {
      const updated = await apiClient.put<Camion>(`/api/camiones/${camionId}`, body);
      setCamion(updated);
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

  // Dar de Baja (Soft-delete)
  const handleSoftDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas dar de baja este vehículo? Se cambiará su estado a Fuera de Servicio.')) {
      return;
    }
    setGeneralLoading(true);
    setGeneralError('');
    try {
      await apiClient.delete(`/api/camiones/${camionId}`);
      await refreshCamion();
      setIsEditing(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error al dar de baja');
      }
    } finally {
      setGeneralLoading(false);
    }
  };

  // Extraer el path de Supabase Storage de la URL pública
  const getPathFromUrl = (url: string): string | null => {
    const marker = '/storage/v1/object/public/documentos/';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.substring(index + marker.length);
  };

  // Subir Documento a Storage y registrar en la base de datos
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocType || !docFile) {
      setDocError('Por favor selecciona un tipo de documento y arrastra un archivo.');
      return;
    }

    setDocUploadLoading(true);
    setDocError('');

    try {
      const supabase = createClient();
      
      // Buscar si ya existe un documento de este tipo para borrarlo del storage primero
      const docExistente = documentos.find(d => d.tipo_documento === selectedDocType);
      if (docExistente && docExistente.archivo_url) {
        const oldPath = getPathFromUrl(docExistente.archivo_url);
        if (oldPath) {
          await supabase.storage.from('documentos').remove([oldPath]);
        }
      }

      // 1. Subir nuevo archivo a Storage
      const fileExt = docFile.name.split('.').pop();
      const filePath = `camiones/${camionId}/${selectedDocType}_${Date.now()}.${fileExt}`;
      
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .upload(filePath, docFile, { cacheControl: '3600', upsert: true });

      if (storageError) {
        throw new Error(`Error en Storage: ${storageError.message}`);
      }

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      // 3. Registrar o actualizar en la API
      const body = {
        tipo_documento: selectedDocType,
        archivo_url: publicUrl,
        fecha_vencimiento: docVencimiento || null
      };

      if (docExistente) {
        // PUT para actualizar
        await apiClient.put(`/api/camiones/${camionId}/documentos/${docExistente.id}`, body);
      } else {
        // POST para crear
        await apiClient.post(`/api/camiones/${camionId}/documentos`, body);
      }

      // Recargar datos
      await refreshCamion();
      
      // Limpiar formulario
      setSelectedDocType(null);
      setDocFile(null);
      setDocVencimiento('');
    } catch (err: unknown) {
      setDocError(err instanceof Error ? err.message : 'Error al subir el documento');
    } finally {
      setDocUploadLoading(false);
    }
  };

  // Eliminar Documento (Storage físico primero, luego API)
  const handleDeleteDocument = async (doc: DocumentoCamion) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }

    try {
      const supabase = createClient();

      // 1. Borrado físico del Storage
      if (doc.archivo_url) {
        const path = getPathFromUrl(doc.archivo_url);
        if (path) {
          const { error: storageError } = await supabase.storage
            .from('documentos')
            .remove([path]);
          if (storageError) {
            console.error("Storage delete warning:", storageError.message);
          }
        }
      }

      // 2. Borrado lógico de la Base de Datos
      await apiClient.delete(`/api/camiones/${camionId}/documentos/${doc.id}`);
      
      // Recargar datos
      await refreshCamion();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el documento');
    }
  };

  // Crear Mantenimiento
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintError('');
    setMaintLoading(true);

    const body = {
      fecha: maintFecha,
      tipo: maintTipo.trim(),
      costo: Number(maintCosto),
      proveedor: maintProveedor.trim() || null,
      kilometraje: maintKilometraje ? Number(maintKilometraje) : null
    };

    try {
      await apiClient.post(`/api/camiones/${camionId}/mantenimientos`, body);
      setShowMaintModal(false);
      
      // Limpiar modal
      setMaintTipo('');
      setMaintCosto('');
      setMaintProveedor('');
      setMaintKilometraje('');
      
      // Recargar mantenimientos
      refreshMantenimientos();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setMaintError(err.message);
      } else {
        setMaintError(err instanceof Error ? err.message : 'Error al registrar el mantenimiento');
      }
    } finally {
      setMaintLoading(false);
    }
  };

  // Helper para formato de badge de fecha de expiración
  const getExpirationBadge = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) {
      return { text: 'Sin fecha', className: 'bg-muted/40 text-muted-foreground border-border/50' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(fechaVencimiento);
    expDate.setHours(0, 0, 0, 0);

    const diff = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const dateFormatted = new Date(fechaVencimiento).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    if (diffDays < 0) {
      return {
        text: `Vencido (${dateFormatted})`,
        className: 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
      };
    } else if (diffDays < 30) {
      return {
        text: `Vence pronto (${dateFormatted})`,
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium'
      };
    } else {
      return {
        text: `Vigente (${dateFormatted})`,
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

  if (errorMsg || !camion) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-muted-foreground mt-2">{errorMsg || 'Vehículo no encontrado'}</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/dashboard/vehiculos">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back and title header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/vehiculos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la flota
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" /> #{camion.numero_unidad}
            </h1>
            <p className="text-sm text-muted-foreground">
              {camion.marca} {camion.modelo} ({camion.anio}) · Placas: <span className="font-mono">{camion.placas}</span>
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
              camion.estado === 'disponible' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
              camion.estado === 'en_ruta' ? 'bg-primary/10 text-primary border-primary/20' :
              camion.estado === 'mantenimiento' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-muted/50 text-muted-foreground border-border/50'
            }`}>
              {camion.estado.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-border/30 flex gap-2 overflow-x-auto pb-px">
        {[
          { id: 'general', label: 'Información general', icon: Truck },
          { id: 'documentos', label: 'Documentos', icon: FileText },
          { id: 'mantenimientos', label: 'Mantenimientos', icon: Wrench },
          { id: 'asignaciones', label: 'Asignaciones', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
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

      {/* Tab content wrapper */}
      <div className="pt-2">

        {/* 1. Tab General */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border border-border/50 bg-card shadow-lg">
              <CardHeader className="border-b border-border/30 bg-muted/10 p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Ficha Técnica</CardTitle>
                  <CardDescription>Detalles del registro del vehículo.</CardDescription>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Número de Unidad
                      </label>
                      <input
                        type="text"
                        value={editNumeroUnidad}
                        onChange={(e) => setEditNumeroUnidad(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Placas
                      </label>
                      <input
                        type="text"
                        value={editPlacas}
                        onChange={(e) => setEditPlacas(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={editMarca}
                        onChange={(e) => setEditMarca(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={editModelo}
                        onChange={(e) => setEditModelo(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Año
                      </label>
                      <input
                        type="number"
                        value={editAnio}
                        onChange={(e) => setEditAnio(Number(e.target.value))}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Tipo de Carga
                      </label>
                      <input
                        type="text"
                        value={editTipoCarga}
                        onChange={(e) => setEditTipoCarga(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Estado
                      </label>
                      <select
                        value={editEstado}
                        onChange={(e) => setEditEstado(e.target.value)}
                        disabled={!isEditing || generalLoading}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed text-foreground"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="en_ruta">En Ruta</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="fuera_servicio">Fuera de Servicio</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Número de Serie (VIN)
                    </label>
                    <input
                      type="text"
                      value={editNumeroSerie}
                      onChange={(e) => setEditNumeroSerie(e.target.value)}
                      disabled={!isEditing || generalLoading}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary disabled:opacity-75 disabled:cursor-not-allowed font-mono uppercase"
                    />
                  </div>

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
              </CardContent>
            </Card>

            {/* Panel de acciones rápidas */}
            <div className="space-y-4">
              <Card className="border border-border/50 bg-card shadow-lg">
                <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
                  <CardTitle className="text-base font-bold">Estado e Historial</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block mb-1">REGISTRADO EN SISTEMA</span>
                    <span className="text-sm font-medium">
                      {new Date(camion.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block mb-1">ÚLTIMA MODIFICACIÓN</span>
                    <span className="text-sm font-medium">
                      {new Date(camion.updated_at).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <RoleGate roles={['administrador']}>
                    {camion.estado !== 'fuera_servicio' && (
                      <div className="pt-4 border-t border-border/30">
                        <Button
                          variant="destructive"
                          onClick={handleSoftDelete}
                          disabled={generalLoading}
                          className="w-full rounded-xl gap-2 font-semibold shadow-lg shadow-destructive/15"
                        >
                          <Trash2 className="w-4 h-4" />
                          Dar de baja vehículo
                        </Button>
                      </div>
                    )}
                  </RoleGate>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 2. Tab Documentos */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            {/* Formulario de subida (solo Admin) */}
            <RoleGate roles={['administrador']}>
              <Card className="border border-border/50 bg-card shadow-lg">
                <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
                  <CardTitle className="text-base font-bold">Actualizar Documento Digital</CardTitle>
                  <CardDescription>Sube un archivo PDF o imagen para registrar un documento vehicular.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {docError && (
                    <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                      {docError}
                    </div>
                  )}

                  <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Tipo documento */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Tipo de Documento
                      </label>
                      <select
                        value={selectedDocType || ''}
                        onChange={(e) => setSelectedDocType(e.target.value as TipoDocumentoCamion)}
                        required
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Selecciona tipo...</option>
                        <option value="tarjeta_circulacion">Tarjeta de Circulación</option>
                        <option value="seguro">Seguro</option>
                        <option value="verificacion">Verificación Vehicular</option>
                        <option value="permiso_sct">Permiso SCT</option>
                      </select>
                    </div>

                    {/* Selector de Archivo */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Archivo (PDF o Imagen)
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                        required
                        className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </div>

                    {/* Vencimiento */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={docVencimiento}
                        onChange={(e) => setDocVencimiento(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" disabled={docUploadLoading} className="h-10 rounded-xl font-medium w-full">
                      {docUploadLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" /> Subir archivo
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </RoleGate>

            {/* Listado de documentos en Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(DOCUMENTOS_CONFIG) as TipoDocumentoCamion[]).map((type) => {
                const config = DOCUMENTOS_CONFIG[type];
                const doc = documentos.find((d) => d.tipo_documento === type);
                const badge = getExpirationBadge(doc?.fecha_vencimiento || null);

                return (
                  <Card key={type} className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden">
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="p-4 border-b border-border/30 bg-muted/10 flex items-start justify-between">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                          {doc ? badge.text : 'No registrado'}
                        </span>
                      </div>

                      {/* Info del Documento */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="text-sm font-bold text-foreground leading-snug">{config.label}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-normal">{config.placeholder}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pie de la tarjeta */}
                    <div className="p-4 border-t border-border/30 bg-muted/5 flex items-center justify-between">
                      {doc && doc.archivo_url ? (
                        <a
                          href={doc.archivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          Ver archivo <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin archivo</span>
                      )}

                      {doc && (
                        <RoleGate roles={['administrador']}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc)}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                            aria-label="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </RoleGate>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Tab Mantenimientos */}
        {activeTab === 'mantenimientos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-foreground">Historial de Mantenimientos</h2>
                <p className="text-xs text-muted-foreground">Registro de todas las intervenciones del camión.</p>
              </div>
              <RoleGate roles={['administrador']}>
                <Button onClick={() => setShowMaintModal(true)} className="rounded-xl h-9">
                  <Plus className="w-4 h-4 mr-1.5" /> Agregar registro
                </Button>
              </RoleGate>
            </div>

            {/* Listado en tabla */}
            <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo / Trabajo</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proveedor</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kilometraje</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {maintListLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-32" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-4 bg-muted/60 rounded w-16" /></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-muted/60 rounded w-12 ml-auto" /></td>
                        </tr>
                      ))
                    ) : mantenimientos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                          No hay mantenimientos registrados para este vehículo.
                        </td>
                      </tr>
                    ) : (
                      mantenimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono font-medium text-foreground">
                            {new Date(m.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{m.tipo}</td>
                          <td className="px-6 py-4 text-muted-foreground">{m.proveedor || '—'}</td>
                          <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                            {m.kilometraje ? `${m.kilometraje.toLocaleString()} km` : '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                            ${Number(m.costo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!maintListLoading && mantenimientos.length > 0 && (
                <PaginationControls
                  page={maintPage}
                  perPage={maintPerPage}
                  total={maintTotal}
                  totalPages={maintTotalPages}
                  onPageChange={setMaintPage}
                />
              )}
            </Card>

            {/* Modal para Crear Mantenimiento */}
            {showMaintModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                <Card className="w-full max-w-md border border-border/50 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <CardHeader className="border-b border-border/30 bg-muted/10 p-5 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Registrar Mantenimiento</CardTitle>
                      <CardDescription>Agrega los datos de la intervención mecánica.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowMaintModal(false)} className="rounded-lg w-8 h-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5">
                    {maintError && (
                      <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                        {maintError}
                      </div>
                    )}

                    <form onSubmit={handleCreateMaintenance} className="space-y-4">
                      {/* Fecha */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Fecha *
                        </label>
                        <input
                          type="date"
                          value={maintFecha}
                          onChange={(e) => setMaintFecha(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Tipo */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Tipo de Mantenimiento *
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Cambio de aceite, Reparación de frenos"
                          value={maintTipo}
                          onChange={(e) => setMaintTipo(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Costo */}
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Costo ($) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Costo total"
                            value={maintCosto}
                            onChange={(e) => setMaintCosto(e.target.value)}
                            required
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary font-mono"
                          />
                        </div>

                        {/* Kilometraje */}
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Kilometraje (km)
                          </label>
                          <input
                            type="number"
                            placeholder="Opcional"
                            value={maintKilometraje}
                            onChange={(e) => setMaintKilometraje(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary font-mono"
                          />
                        </div>
                      </div>

                      {/* Proveedor */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Taller / Proveedor
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre del proveedor o taller mecánico"
                          value={maintProveedor}
                          onChange={(e) => setMaintProveedor(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-border/30 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowMaintModal(false)}
                          disabled={maintLoading}
                          className="rounded-lg h-9"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={maintLoading} className="rounded-lg h-9 px-4">
                          {maintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* 4. Tab Asignaciones */}
        {activeTab === 'asignaciones' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">Timeline de Asignaciones</h2>
              <p className="text-xs text-muted-foreground">Historial de conductores vinculados a esta unidad.</p>
            </div>

            {asignacionesLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : asignaciones.length === 0 ? (
              <Card className="border border-border/50 bg-card p-8 text-center italic text-muted-foreground text-sm">
                No hay conductores asignados ni registrados en el historial de esta unidad.
              </Card>
            ) : (
              <div className="relative pl-6 border-l border-border/40 space-y-6 max-w-xl">
                {asignaciones.map((a) => {
                  const cond = a.conductores;
                  const dateInicio = new Date(a.fecha_inicio).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  });
                  const dateFin = a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  }) : 'Presente';

                  return (
                    <div key={a.id} className="relative">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        a.activo
                          ? 'bg-teal-400 border-teal-400 ring-4 ring-teal-400/20'
                          : 'bg-muted-foreground border-muted-foreground'
                      }`} />

                      <div className="p-4 border border-border/50 bg-card rounded-xl shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-foreground">
                            {cond?.nombre_completo || 'Conductor no especificado'}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            a.activo
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : 'bg-muted/50 text-muted-foreground border border-border/50'
                          }`}>
                            {a.activo ? 'Activa' : 'Histórica'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>
                            Licencia: <span className="font-mono text-foreground">{cond?.licencia_numero || '—'}</span> ({cond?.tipo_licencia || '—'})
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                            <Calendar className="w-3 h-3" /> {dateInicio} — {dateFin}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
