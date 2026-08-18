"use client"

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Activity, Shield, BarChart3 } from 'lucide-react';

// ── Inner component — uses useSearchParams(), must be inside <Suspense> ──
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';

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

      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* ── Background Floating Elements ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />
      
      {/* Decoración extra: grid de puntos sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* ── Glass Container ── */}
      <div className="glass-panel w-full max-w-[1100px] min-h-[600px] rounded-[2.5rem] flex relative z-10 mx-4 lg:mx-8 border-[1.5px] border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Panel lateral de marca */}
        <aside className="relative hidden lg:flex w-[45%] flex-col justify-between p-12 bg-black/20 border-r border-white/5 overflow-hidden">
          {/* Subtle gradient inside brand panel */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          {/* Logo */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center justify-center rounded-xl w-10 h-10 bg-primary shadow-lg shadow-primary/20">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Fleet<span className="text-primary">IQ</span>
            </span>
          </div>

          {/* Contenido central */}
          <div className="space-y-8 relative z-10">
            <div>
              <h2 className="text-4xl font-bold leading-[1.15] text-foreground tracking-tight">
                Gestiona tu flota <br />
                <span className="text-primary">con inteligencia.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                Monitorea rutas, conductores y vehículos desde un solo lugar. Decisiones más rápidas, operaciones más eficientes.
              </p>
            </div>

            <div className="space-y-5">
              {[
                { icon: Activity, title: 'Monitoreo en tiempo real', desc: 'Estado de tu flota al instante' },
                { icon: Shield, title: 'Control de acceso', desc: 'Multi-sede, multi-usuario' },
                { icon: BarChart3, title: 'Reportes operativos', desc: 'Datos para tomar mejores decisiones' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-foreground">{title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/30 relative z-10">
            © {new Date().getFullYear()} FleetIQ · 3 Guerras
          </p>
        </aside>

        {/* Panel de formulario */}
        <main className="flex-1 flex items-center justify-center p-8 lg:p-12 relative z-10">
          <div className="w-full max-w-[380px]">
            {/* Logo móvil */}
            <div className="flex lg:hidden items-center gap-3 mb-10">
              <div className="flex items-center justify-center rounded-xl w-10 h-10 bg-primary">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Fleet<span className="text-primary">IQ</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Bienvenido
            </h1>
            <p className="mt-2 mb-8 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>

            {justRegistered && (
              <div className="mb-6 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm text-center font-medium">
                Cuenta creada exitosamente. Inicia sesión.
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1 pr-1">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contraseña
                  </label>
                  <Link href="/recovery" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold rounded-xl px-4 py-3.5 text-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Iniciando sesión…</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Link a registro */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link href="/register" className="font-semibold text-foreground hover:text-primary transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Page export — wraps LoginForm in Suspense (required for useSearchParams) ──
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--auth-bg-base)' }}
        >
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: 'var(--auth-accent)' }}
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
