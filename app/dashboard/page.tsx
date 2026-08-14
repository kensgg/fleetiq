'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck, AlertTriangle, AlertCircle, Info, BarChart3, TrendingUp, ShieldAlert,
  ArrowRight, Users, Plus, ShieldCheck, Wrench, Ban, Activity, Loader2, MapPin, Maximize2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { RoleGate } from '@/components/dashboard/RoleGate';
import { apiClient } from '@/lib/api/client';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface FlotaData {
  total: number;
  disponibles: number;
  en_ruta: number;
  mantenimiento: number;
  fuera_servicio: number;
  conductores_activos: number;
}

const LiveMap = dynamic(() => import('@/components/dashboard/LiveMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-xl flex items-center justify-center text-muted-foreground flex-col gap-2"><MapPin className="w-8 h-8 opacity-50" /><span>Cargando mapa en vivo...</span></div>
});

interface AlertaReciente {
  id: string;
  titulo: string;
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  created_at: string;
}

interface AlertasData {
  total_no_leidas: number;
  por_prioridad: { alta: number; media: number; baja: number };
  recientes: AlertaReciente[];
}

interface KpisData {
  semanas: number;
  combustible_semanal: unknown[];
  km_recorridos_semanal: Array<{
    semana: string;
    inicio: string;
    fin: string;
    km_total: number;
    registros: number;
  }>;
  eficiencia_rutas_semanal: Array<{
    semana: string;
    inicio: string;
    fin: string;
    completadas: number;
    canceladas: number;
    en_curso: number;
    total: number;
    porcentaje: number;
  }>;
  resumen_mantenimiento: {
    costo_total_periodo: number;
    mantenimientos_realizados: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  // Estados de datos
  const [flota, setFlota] = useState<FlotaData | null>(null);
  const [alertas, setAlertas] = useState<AlertasData | null>(null);
  const [kpis, setKpis] = useState<KpisData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  // 1. Proteger ruta a nivel URL: Conductor y capturista NO entran al dashboard operativo
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/login');
      } else if (['conductor', 'capturista'].includes(user.rol)) {
        router.push('/dashboard/notificaciones');
      }
    }
  }, [user, userLoading, router]);

  // 2. Hydration match flag (evita setState síncrono en cuerpo del efecto)
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setMounted(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // 3. Carga de datos paralela
  useEffect(() => {
    let active = true;
    if (user && ['administrador', 'gerente_operaciones', 'supervisor'].includes(user.rol)) {
      Promise.resolve().then(() => {
        if (active) {
          setLoading(true);
          setErrorMsg('');
        }
      });

      Promise.all([
        apiClient.get<FlotaData>('/api/dashboard/flota'),
        apiClient.get<AlertasData>('/api/dashboard/alertas'),
        apiClient.get<KpisData>('/api/dashboard/kpis?semanas=4')
      ])
        .then(([flotaRes, alertasRes, kpisRes]) => {
          if (active) {
            setFlota(flotaRes);
            setAlertas(alertasRes);
            setKpis(kpisRes);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error al cargar datos del dashboard:", err);
          if (active) {
            setErrorMsg('Error al consultar métricas operacionales del dashboard.');
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  if (userLoading || loading || !flota || !alertas || !kpis) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─────────────── ONBOARDING BIENVENIDA (Si flota.total === 0) ───────────────
  if (flota.total === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        <Card className="border border-primary/20 bg-card shadow-2xl overflow-hidden relative">
          <span className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10" />
          <CardHeader className="p-8 text-center border-b border-border/30 bg-muted/10">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold tracking-tight">Bienvenido a FleetIQ</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Tu centro inteligente de control logístico. Para comenzar a monitorear la operación, registra los primeros elementos en tu sede.
            </p>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CTA Vehículo */}
              <div className="p-5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col justify-between">
                <div>
                  <Truck className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-foreground">Alta de Vehículos</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Registra los camiones y unidades de transporte para controlar sus mantenimientos y asignaciones.
                  </p>
                </div>
                <Button asChild size="sm" className="mt-4 rounded-xl font-semibold w-full">
                  <Link href="/dashboard/vehiculos/nuevo">
                    <Plus className="w-4 h-4 mr-1.5" /> Registrar vehículo
                  </Link>
                </Button>
              </div>

              {/* CTA Conductor */}
              <div className="p-5 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col justify-between">
                <div>
                  <Users className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold text-foreground">Ficha de Conductores</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Ingresa a los conductores habilitados en tu sede para vincularlos a vehículos y planificar itinerarios.
                  </p>
                </div>
                <Button asChild size="sm" className="mt-4 rounded-xl font-semibold w-full">
                  <Link href="/dashboard/conductores/nuevo">
                    <Plus className="w-4 h-4 mr-1.5" /> Agregar conductor
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────── DASHBOARD OPERATIVO COMPLETO ───────────────
  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* MAPA HERO: Ocupa 80% del alto de la pantalla (un poco más de 3/4) */}
      <div className="relative w-full h-[80vh] bg-slate-900 border-b border-border/50 shadow-2xl z-0">
        <LiveMap />
        
        {/* Capa de gradiente oscuro encima del mapa para que destaque el texto/header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/90 to-transparent pointer-events-none z-10" />
        
        {/* Header flotante encima del mapa */}
        <div className="absolute top-6 left-6 right-6 z-20 pointer-events-none">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground drop-shadow-md">Centro de Comando</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1 drop-shadow-md bg-background/50 backdrop-blur-md px-3 py-1 rounded-full inline-block border border-border/50">
                Monitoreo logístico y métricas en tiempo real
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 p-4 rounded-xl bg-destructive/90 border border-destructive/20 text-sm text-destructive-foreground font-medium shadow-xl backdrop-blur-md">
            {errorMsg}
          </div>
        )}

        {/* KPIs Flotantes (Row 1) superpuestos en la parte inferior del mapa */}
        <div className="absolute bottom-6 left-0 right-0 z-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Camiones totales */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Flota</span>
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-foreground">{flota.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unidades registradas</p>
            </div>
          </CardContent>
        </Card>

        {/* Disponibles */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Disponibles</span>
              <ShieldCheck className="w-4 h-4 text-teal-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-teal-500">{flota.disponibles}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Listos para ruta</p>
            </div>
          </CardContent>
        </Card>

        {/* En ruta */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">En ruta</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-primary">{flota.en_ruta}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Viajes activos</p>
            </div>
          </CardContent>
        </Card>

        {/* Mantenimiento */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Taller</span>
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-amber-500">{flota.mantenimiento}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">En mantenimiento</p>
            </div>
          </CardContent>
        </Card>

        {/* Fuera de servicio */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Fuera servicio</span>
              <Ban className="w-4 h-4 text-destructive" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-destructive">{flota.fuera_servicio}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Baja temporal</p>
            </div>
          </CardContent>
        </Card>

        {/* Conductores */}
        <Card className="border border-border/40 bg-card/90 backdrop-blur hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Conductores</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-foreground">{flota.conductores_activos}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Activos y validados</p>
            </div>
          </CardContent>
        </Card>


          </div>
        </div>
      </div>

      {/* Row 2: Gráficas y Alertas (Debajo del mapa) */}
      <div className="max-w-7xl mx-auto px-6 w-full mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Lado izquierdo: KPIs de Rendimiento (Eficiencia y Kilómetros) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfica 1: Eficiencia de Rutas Semanal */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-bold">Eficiencia Semanal de Rutas</CardTitle>
              </div>
              <CardDescription>
                Porcentaje de itinerarios completados con éxito del total planificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {mounted && kpis.eficiencia_rutas_semanal.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpis.eficiencia_rutas_semanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="semana" className="text-[10px] font-medium text-muted-foreground" />
                      <YAxis tickFormatter={(val) => `${val}%`} className="text-[10px] font-medium text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderRadius: '12px',
                          borderColor: 'hsl(var(--border))'
                        }}
                      />
                      <Bar dataKey="porcentaje" name="Eficiencia (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted-foreground italic">
                  Sin registros suficientes de viajes para calcular eficiencia semanal.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfica 2: Kilometraje Recorrido Semanal */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <CardTitle className="text-base font-bold">Kilómetros Recorridos</CardTitle>
                  
                  {/* Tooltip informativo sobre aproximación */}
                  <div className="relative group inline-block">
                    <Info className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors shrink-0" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-popover text-popover-foreground text-[10px] leading-relaxed rounded-xl border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      Aproximación basada en kilometraje reportado en mantenimientos. No es telemetría en tiempo real.
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-0.5">
                  Distancia estimada recorrida por la flota por semana.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {mounted && kpis.km_recorridos_semanal.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpis.km_recorridos_semanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="semana" className="text-[10px] font-medium text-muted-foreground" />
                      <YAxis tickFormatter={(val) => `${val} km`} className="text-[10px] font-medium text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderRadius: '12px',
                          borderColor: 'hsl(var(--border))'
                        }}
                      />
                      <Line type="monotone" dataKey="km_total" name="Distancia" stroke="hsl(var(--primary))" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-muted-foreground italic">
                  Sin reportes de kilometraje esta semana.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lado derecho: Alertas, Costos y Sección Combustible */}
        <div className="space-y-6">
          {/* Alertas Recientes */}
          <Card className="border border-border/50 bg-card shadow-lg flex flex-col">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <CardTitle className="text-base font-bold">Alertas Críticas</CardTitle>
                </div>
                {alertas.total_no_leidas > 0 && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                    {alertas.total_no_leidas} ACTIVAS
                  </span>
                )}
              </div>
              <CardDescription>Reportes urgentes de la sede.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              {alertas.recientes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4">No hay alertas de alta prioridad no leídas.</p>
              ) : (
                <div className="space-y-4">
                  {alertas.recientes.map((alerta) => (
                    <div key={alerta.id} className="flex gap-2 text-xs border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-foreground">{alerta.titulo}</div>
                        <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{alerta.mensaje}</p>
                        <span className="text-[9px] text-muted-foreground/60 block mt-1 font-mono">
                          {new Date(alerta.created_at).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button asChild variant="outline" className="w-full mt-5 rounded-xl border-border/50">
                <Link href="/dashboard/notificaciones" className="flex items-center justify-center gap-1.5 text-xs">
                  Ver notificaciones <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Costos de Mantenimiento (Protegido para administrador y gerente_operaciones) */}
          <RoleGate roles={['administrador', 'gerente_operaciones']}>
            <Card className="border border-border/50 bg-card shadow-lg">
              <CardHeader className="border-b border-border/30 bg-muted/10 p-5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-bold">Costos de Mantenimiento</CardTitle>
                </div>
                <CardDescription>Resumen del costo total en las últimas 4 semanas.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                    Costo Total del Periodo
                  </div>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    ${kpis.resumen_mantenimiento.costo_total_periodo.toLocaleString('es-MX', {
                      minimumFractionDigits: 2, maximumFractionDigits: 2
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Intervenciones realizadas:</span>
                  <span className="font-bold text-foreground font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                    {kpis.resumen_mantenimiento.mantenimientos_realizados}
                  </span>
                </div>
              </CardContent>
            </Card>
          </RoleGate>

          {/* Sección de Combustible (Explicación de limitación técnica) */}
          <Card className="border border-border/50 bg-card shadow-lg bg-gradient-to-r from-muted/5 to-muted/15">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold text-muted-foreground">Consumo de Combustible</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="p-3.5 rounded-xl border border-border/40 bg-card text-xs text-muted-foreground leading-relaxed italic">
                &quot;Consumo de combustible: aún no se captura este dato en el sistema.&quot;
              </div>
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-2.5">
                Para activar estas métricas se requiere registrar cargas de diésel por viaje en una tabla de consumo dedicada.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
