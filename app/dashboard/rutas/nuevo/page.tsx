'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, ArrowLeft, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { Camion } from '@/modules/vehiculos/types';
import type { Conductor } from '@/modules/conductores/types';
import type { PuntoIntermedio } from '@/modules/rutas/types';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), { ssr: false });

interface CamionesResponse {
  items: Camion[];
}

interface ConductoresResponse {
  items: Conductor[];
}

interface RutasResponse {
  items: Array<{
    id: string;
    conductor_id: string;
    camion_id: string;
    estado: string;
  }>;
}

interface OptimizacionRes {
  optimizado: boolean;
  mensaje: string;
  distancia_estimada_km: number;
  duracion_estimada_min: number;
}

interface RutaCreadaResponse {
  id: string;
  _optimizacion: OptimizacionRes;
}

export default function NuevaRutaPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  // Inputs
  const [selectedCamionId, setSelectedCamionId] = useState('');
  const [selectedConductorId, setSelectedConductorId] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [horaEstimada, setHoraEstimada] = useState('08:00');
  
  // Puntos intermedios
  const [puntos, setPuntos] = useState<{ id: string; nombre: string }[]>([]);

  // Opciones de selects
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Estados de submit y optimización
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [optimResult, setOptimResult] = useState<{
    distancia: number;
    duracion: number;
    mensaje: string;
  } | null>(null);

  // Estado del mapa
  const [mapData, setMapData] = useState<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 1. Proteger ruta: Administradores, gerente_operaciones y supervisor pueden crear rutas
  useEffect(() => {
    if (!userLoading && (!user || !['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol))) {
      router.push('/dashboard/rutas');
    }
  }, [user, userLoading, router]);

  // 2. Cargar camiones disponibles y conductores libres en la sede
  useEffect(() => {
    let active = true;
    if (user && ['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol)) {
      Promise.resolve().then(() => {
        if (active) {
          setLoadingOptions(true);
          setErrorMsg('');
        }
      });

      // Fetch paralelo de camiones disponibles, todos los conductores y rutas activas
      Promise.all([
        apiClient.get<CamionesResponse>('/api/camiones?estado=disponible&per_page=100'),
        apiClient.get<ConductoresResponse>('/api/conductores?estado=true&per_page=100'),
        apiClient.get<RutasResponse>('/api/rutas?estado=en_curso&per_page=100')
      ])
        .then(([camionesRes, conductoresRes, rutasRes]) => {
          if (active) {
            // Filtrar camiones y conductores que ya tengan una ruta en curso
            const activeConductorIds = (rutasRes.items || []).map(r => r.conductor_id);
            const activeCamionIds = (rutasRes.items || []).map(r => r.camion_id);

            const camionesLibres = (camionesRes.items || []).filter(
              c => !activeCamionIds.includes(c.id)
            );
            setCamiones(camionesLibres);

            const conductoresLibres = (conductoresRes.items || []).filter(
              c => !activeConductorIds.includes(c.id)
            );
            setConductores(conductoresLibres);
            setLoadingOptions(false);
          }
        })
        .catch((err) => {
          console.error("Error al cargar opciones:", err);
          if (active) {
            setErrorMsg('Error al consultar camiones o conductores libres en la sede.');
            setLoadingOptions(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  if (userLoading || !user || !['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePreviewMap = async () => {
    if (!origen || !destino) {
      setMapError('Debes ingresar al menos el origen y el destino para previsualizar.');
      return;
    }
    
    setIsMapLoading(true);
    setMapError(null);
    
    try {
      const paradas = puntos
        .filter(p => p.nombre.trim() !== '')
        .map(p => ({ nombre: p.nombre.trim() }));
        
      const res = await apiClient.post<any>('/api/rutas/preview', {
        origen: origen.trim(),
        destino: destino.trim(),
        puntos_intermedios: paradas
      });
      
      setMapData(res);
      if (res._advertencias && res._advertencias.length > 0) {
        setMapError(res._advertencias.join('. '));
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setMapError(err.message);
      } else {
        setMapError('Error desconocido al previsualizar la ruta.');
      }
    } finally {
      setIsMapLoading(false);
    }
  };

  // Manejo de paradas intermedias
  const handleAddPunto = () => {
    setPuntos([...puntos, { id: Math.random().toString(36).substring(2, 9), nombre: '' }]);
  };

  const handleUpdatePunto = (id: string, val: string) => {
    setPuntos(puntos.map(p => p.id === id ? { ...p, nombre: val } : p));
  };

  const handleRemovePunto = (id: string) => {
    setPuntos(puntos.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setOptimResult(null);

    if (!selectedCamionId || !selectedConductorId || !fechaEstimada || !horaEstimada) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    // Unir fecha y hora en formato ISO 8601 UTC
    const localDateTimeStr = `${fechaEstimada}T${horaEstimada}:00`;
    const datetime = new Date(localDateTimeStr).toISOString();

    // Estructurar paradas
    const paradas: PuntoIntermedio[] = puntos
      .map(p => ({ nombre: p.nombre.trim() }))
      .filter(p => p.nombre.length > 0);

    const body = {
      camion_id: selectedCamionId,
      conductor_id: selectedConductorId,
      origen: origen.trim(),
      destino: destino.trim(),
      puntos_intermedios: paradas,
      fecha_estimada: datetime
    };

    setFormLoading(true);

    try {
      const res = await apiClient.post<RutaCreadaResponse>('/api/rutas', body);
      
      // Mostrar resumen de optimización (IA stub)
      if (res._optimizacion) {
        setOptimResult({
          distancia: res._optimizacion.distancia_estimada_km,
          duracion: res._optimizacion.duracion_estimada_min,
          mensaje: res._optimizacion.mensaje
        });
      } else {
        router.push('/dashboard/rutas');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
        if (err.errors && typeof err.errors === 'object' && !Array.isArray(err.errors)) {
          setFieldErrors(err.errors as Record<string, string[]>);
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido al crear la ruta');
      }
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard/rutas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a rutas
      </Link>

      {optimResult ? (
        /* Tarjeta de optimización y éxito */
        <Card className="border border-teal-500/30 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="bg-teal-500/10 border-b border-teal-500/20 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto mb-3" />
            <CardTitle className="text-xl font-bold text-teal-400">Ruta Planificada Correctamente</CardTitle>
            <CardDescription className="text-muted-foreground">
              Se ha creado el viaje y asignado la tripulación de forma exitosa.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Map className="w-4 h-4 text-primary" /> Estimación preliminar (IA Route Optimizer)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Distancia Estimada</div>
                  <div className="text-2xl font-bold font-mono text-primary">{optimResult.distancia} km</div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Duración Estimada</div>
                  <div className="text-2xl font-bold font-mono text-primary">{optimResult.duracion} min</div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed italic bg-card p-3 rounded-lg border border-border/30">
                &quot;{optimResult.mensaje}&quot;
              </p>
            </div>

            <Button asChild className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/10">
              <Link href="/dashboard/rutas">Volver al tablero de logística</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Formulario normal */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/50 bg-card shadow-xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Planificar Nueva Ruta</CardTitle>
                <CardDescription>Crea un itinerario asignando vehículo, conductor y paradas.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Origen y Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Origen (Dirección o Localidad) *
                  </label>
                  <input
                    type="text"
                    placeholder="Punto inicial de partida"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                  {fieldErrors.origen && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.origen[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Destino (Dirección o Localidad) *
                  </label>
                  <input
                    type="text"
                    placeholder="Punto final de llegada"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                  {fieldErrors.destino && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.destino[0]}</p>
                  )}
                </div>
              </div>

              {/* Camión y Conductor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Camión Asignado *
                  </label>
                  <select
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                    required
                    disabled={loadingOptions}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-70"
                  >
                    <option value="">Selecciona camión disponible...</option>
                    {camiones.map(c => (
                      <option key={c.id} value={c.id}>
                        Unidad #{c.numero_unidad} — {c.marca} {c.modelo} ({c.placas})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.camion_id && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.camion_id[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Conductor Asignado *
                  </label>
                  <select
                    value={selectedConductorId}
                    onChange={(e) => setSelectedConductorId(e.target.value)}
                    required
                    disabled={loadingOptions}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-70"
                  >
                    <option value="">Selecciona chofer libre...</option>
                    {conductores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_completo} (Lic: {c.licencia_numero})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.conductor_id && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.conductor_id[0]}</p>
                  )}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Fecha de Salida *
                  </label>
                  <input
                    type="date"
                    value={fechaEstimada}
                    onChange={(e) => setFechaEstimada(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                  {fieldErrors.fecha_estimada && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.fecha_estimada[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Hora de Salida *
                  </label>
                  <input
                    type="time"
                    value={horaEstimada}
                    onChange={(e) => setHoraEstimada(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Puntos intermedios builder */}
              <div className="pt-4 border-t border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Paradas Intermedias</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Agrega puntos intermedios por los que pasará la ruta.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPunto}
                    className="rounded-lg h-8 px-3 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Parada
                  </Button>
                </div>

                {puntos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/30">
                    Sin paradas intermedias añadidas. Trayecto directo origen a destino.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {puntos.map((p, index) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-semibold font-mono w-6 text-center">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Nombre de la localidad o parada"
                          value={p.nombre}
                          onChange={(e) => handleUpdatePunto(p.id, e.target.value)}
                          required
                          className="flex-1 h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePunto(p.id)}
                          className="w-9 h-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handlePreviewMap}
                  disabled={isMapLoading || !origen || !destino}
                  className="rounded-xl font-medium"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Previsualizar Ruta en Mapa
                </Button>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/rutas')}
                  disabled={formLoading}
                  className="h-10 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading || loadingOptions}
                  className="h-10 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Planificando...
                    </>
                  ) : (
                    'Crear ruta'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Mapa de Vista Previa */}
        <div className="flex flex-col h-[500px] lg:h-auto sticky top-6">
          <Card className="border border-border/50 bg-card shadow-xl overflow-hidden h-full flex flex-col">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-4 shrink-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Vista Previa de Ruta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative min-h-[400px]">
              <RouteMap 
                origen={mapData?.origen}
                destino={mapData?.destino}
                puntosIntermedios={mapData?.puntos_intermedios}
                geometria={mapData?.geometria_ruta}
                isLoading={isMapLoading}
                errorMsg={mapError}
              />
              {mapData && mapData.distancia_km && (
                <div className="absolute bottom-4 right-4 z-[400] bg-background/90 backdrop-blur-sm border border-border px-3 py-2 rounded-lg shadow-lg flex gap-4 text-xs font-medium">
                  <div><span className="text-muted-foreground">Distancia:</span> {mapData.distancia_km} km</div>
                  <div><span className="text-muted-foreground">Tiempo est.:</span> {mapData.duracion_estimada_min} min</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </div>
  );
}
