'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { apiClient, ApiClientError } from '@/lib/api/client';

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  const [numeroUnidad, setNumeroUnidad] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [placas, setPlacas] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [tipoCarga, setTipoCarga] = useState('');
  
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Proteccion de ruta
  useEffect(() => {
    if (!userLoading && (!user || user.rol !== 'administrador')) {
      router.push('/dashboard/vehiculos');
    }
  }, [user, userLoading, router]);

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
      numero_unidad: numeroUnidad.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: Number(anio),
      placas: placas.trim().toUpperCase(),
      numero_serie: numeroSerie.trim().toUpperCase(),
      tipo_carga: tipoCarga.trim() || null,
      estado: 'disponible' // Estado inicial por defecto
    };

    try {
      await apiClient.post('/api/camiones', body);
      router.push('/dashboard/vehiculos');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
        if (err.errors && typeof err.errors === 'object' && !Array.isArray(err.errors)) {
          setFieldErrors(err.errors as Record<string, string[]>);
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido al crear la unidad');
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back navigation */}
      <Link
        href="/dashboard/vehiculos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la flota
      </Link>

      <Card className="border border-border/50 bg-card shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Registrar Nueva Unidad</CardTitle>
              <CardDescription>Completa la información técnica del camión.</CardDescription>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Numero unidad */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Número de Unidad *
                </label>
                <input
                  type="text"
                  placeholder="ej. 102"
                  value={numeroUnidad}
                  onChange={(e) => setNumeroUnidad(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.numero_unidad && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.numero_unidad[0]}</p>
                )}
              </div>

              {/* Placas */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Placas *
                </label>
                <input
                  type="text"
                  placeholder="ej. XX-YYYY-X"
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all uppercase"
                />
                {fieldErrors.placas && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.placas[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Marca */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Marca *
                </label>
                <input
                  type="text"
                  placeholder="ej. Kenworth"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.marca && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.marca[0]}</p>
                )}
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Modelo *
                </label>
                <input
                  type="text"
                  placeholder="ej. T680"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.modelo && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.modelo[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Año */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Año *
                </label>
                <input
                  type="number"
                  placeholder="ej. 2024"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  required
                  min={1990}
                  max={new Date().getFullYear() + 2}
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.anio && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.anio[0]}</p>
                )}
              </div>

              {/* Tipo de Carga */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tipo de Carga
                </label>
                <input
                  type="text"
                  placeholder="ej. Seca, Refrigerada"
                  value={tipoCarga}
                  onChange={(e) => setTipoCarga(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {fieldErrors.tipo_carga && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.tipo_carga[0]}</p>
                )}
              </div>
            </div>

            {/* Numero de Serie */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Número de Serie (VIN) *
              </label>
              <input
                type="text"
                placeholder="Número de identificación del chasis (17 caracteres)"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                required
                maxLength={17}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all uppercase font-mono"
              />
              {fieldErrors.numero_serie && (
                <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.numero_serie[0]}</p>
              )}
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/vehiculos')}
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
                  'Registrar unidad'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
