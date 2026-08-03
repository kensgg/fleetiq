'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { apiClient, ApiClientError } from '@/lib/api/client';

interface ProfileOption {
  id: string;
  nombre_completo: string;
  rol: string;
  estado: boolean;
}

export default function NuevoConductorPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [licenciaNumero, setLicenciaNumero] = useState('');
  const [tipoLicencia, setTipoLicencia] = useState('');
  const [licenciaVigencia, setLicenciaVigencia] = useState('');
  const [profileId, setProfileId] = useState('');

  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // 1. Proteger ruta
  useEffect(() => {
    if (!userLoading && (!user || user.rol !== 'administrador')) {
      router.push('/dashboard/conductores');
    }
  }, [user, userLoading, router]);

  // 2. Cargar perfiles de usuario disponibles en la sede para la vinculación
  useEffect(() => {
    let active = true;
    if (user && user.rol === 'administrador') {
      Promise.resolve().then(() => {
        if (active) setProfilesLoading(true);
      });
      apiClient.get<ProfileOption[]>('/api/users')
        .then((data) => {
          if (active) {
            setProfiles(data || []);
            setProfilesLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error al cargar perfiles de usuario:", err);
          if (active) setProfilesLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [user]);

  if (userLoading || !user || user.rol !== 'administrador') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setFormLoading(true);

    const body = {
      nombre_completo: nombreCompleto.trim(),
      licencia_numero: licenciaNumero.trim().toUpperCase(),
      tipo_licencia: tipoLicencia.trim().toUpperCase(),
      licencia_vigencia: licenciaVigencia,
      profile_id: profileId || null,
      estado: true
    };

    try {
      await apiClient.post('/api/conductores', body);
      router.push('/dashboard/conductores');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
        if (err.errors && typeof err.errors === 'object' && !Array.isArray(err.errors)) {
          setFieldErrors(err.errors as Record<string, string[]>);
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido al crear el conductor');
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back navigation */}
      <Link
        href="/dashboard/conductores"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a conductores
      </Link>

      <Card className="border border-border/50 bg-card shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Registrar Nuevo Conductor</CardTitle>
              <CardDescription>Completa la información laboral del chofer.</CardDescription>
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
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                placeholder="Nombre del chofer"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
              {fieldErrors.nombre_completo && (
                <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.nombre_completo[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Licencia Numero */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Número de Licencia *
                </label>
                <input
                  type="text"
                  placeholder="Número de registro"
                  value={licenciaNumero}
                  onChange={(e) => setLicenciaNumero(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all uppercase font-mono"
                />
                {fieldErrors.licencia_numero && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.licencia_numero[0]}</p>
                )}
              </div>

              {/* Tipo Licencia */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tipo de Licencia *
                </label>
                <input
                  type="text"
                  placeholder="ej. Federal Tipo A"
                  value={tipoLicencia}
                  onChange={(e) => setTipoLicencia(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.tipo_licencia && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.tipo_licencia[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Licencia Vigencia */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Fecha de Vigencia *
                </label>
                <input
                  type="date"
                  value={licenciaVigencia}
                  onChange={(e) => setLicenciaVigencia(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]} // Validar vigencia futura en HTML5
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.licencia_vigencia && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.licencia_vigencia[0]}</p>
                )}
              </div>

              {/* Vincular Perfil de Usuario */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Vincular Cuenta de Usuario
                </label>
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  disabled={profilesLoading}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-75"
                >
                  <option value="">Ninguno (Conductor sin cuenta)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_completo} ({p.rol.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {profilesLoading && <p className="text-xs text-muted-foreground mt-1">Cargando perfiles...</p>}
                {fieldErrors.profile_id && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.profile_id[0]}</p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/conductores')}
                disabled={formLoading}
                className="h-10 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="h-10 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar conductor'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
