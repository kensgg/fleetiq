"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');

      router.push('/dashboard/usuarios');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl flex rounded-3xl overflow-hidden glass-card glow-primary">
      {/* Panel izquierdo: branding */}
      <div className="hidden md:flex flex-col w-1/2 p-10 justify-between"
        style={{
          background: 'linear-gradient(135deg, oklch(0.746 0.16 232.661 / 20%) 0%, oklch(0.702 0.183 293.541 / 10%) 50%, oklch(0.777 0.152 181.912 / 15%) 100%)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Fleet<span className="text-primary">IQ</span></span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-tight">
              Gestiona tu flota
              <br />
              <span className="text-primary">con inteligencia.</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitorea rutas, conductores y vehículos desde un solo lugar. Decisiones más rápidas, operaciones más eficientes.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2">
            {[
              { icon: Zap, text: 'Alertas en tiempo real' },
              { icon: Truck, text: 'Gestión de flota completa' },
              { icon: ArrowRight, text: 'Multi-sede y multi-rol' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">© 2025 FleetIQ. Todos los derechos reservados.</p>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-muted/50 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Link href="/recovery" className="text-xs text-primary hover:text-primary/80 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 pr-10 bg-muted/50 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold shadow-lg shadow-primary/25 rounded-xl"
            disabled={loading}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Iniciando sesión...</>
              : <><span>Iniciar sesión</span><ArrowRight className="w-4 h-4 ml-2" /></>
            }
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
