"use client"

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Activity, Shield, BarChart3 } from 'lucide-react';

export default function LoginPage() {
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

      router.push('/dashboard/usuarios');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel lateral de marca (40%) ── */}
      <aside
        className="auth-brand-panel relative hidden lg:flex flex-col justify-between p-10 xl:p-12"
        style={{ width: '40%', minWidth: 380 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 36,
              height: 36,
              background: 'var(--auth-accent)',
            }}
          >
            <Truck className="w-[18px] h-[18px] text-white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--auth-text-primary)' }}
          >
            Fleet
            <span style={{ color: 'var(--auth-accent)' }}>IQ</span>
          </span>
        </div>

        {/* Contenido central */}
        <div className="space-y-8">
          {/* Headline serif */}
          <div>
            <h2
              className="font-serif leading-tight"
              style={{
                fontFamily: 'var(--font-dm-serif), "DM Serif Display", Georgia, serif',
                fontSize: 'clamp(28px, 3vw, 40px)',
                color: 'var(--auth-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Gestiona tu flota
              <br />
              <span style={{ color: 'var(--auth-accent)' }}>con inteligencia.</span>
            </h2>
            <p
              className="mt-3 leading-relaxed"
              style={{
                color: 'var(--auth-text-secondary)',
                fontSize: 14,
                maxWidth: 320,
              }}
            >
              Monitorea rutas, conductores y vehículos desde un solo lugar.
              Decisiones más rápidas, operaciones más eficientes.
            </p>
          </div>

          {/* Bullets de valor */}
          <div className="space-y-4">
            {[
              { icon: Activity, title: 'Monitoreo en tiempo real', desc: 'Estado de tu flota al instante' },
              { icon: Shield, title: 'Control de acceso por roles', desc: 'Multi-sede, multi-usuario' },
              { icon: BarChart3, title: 'Reportes operativos', desc: 'Datos para tomar mejores decisiones' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="auth-bullet">
                <div className="auth-bullet-icon">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className="block text-[13px] font-medium"
                    style={{ color: 'var(--auth-text-primary)' }}
                  >
                    {title}
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--auth-text-tertiary)' }}>
                    {desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <p className="text-xs" style={{ color: 'var(--auth-text-tertiary)' }}>
          © {new Date().getFullYear()} FleetIQ · 3 Guerras
        </p>
      </aside>

      {/* ── Panel de formulario (60%) ── */}
      <main
        className="flex-1 flex items-center justify-start"
        style={{ background: 'var(--auth-bg-base)' }}
      >
        <div
          className="auth-animate-in w-full max-w-[420px] mx-auto lg:mx-0 px-6 sm:px-8 lg:pl-16 xl:pl-24"
        >
          {/* Logo móvil */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36,
                height: 36,
                background: 'var(--auth-accent)',
              }}
            >
              <Truck className="w-[18px] h-[18px] text-white" />
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--auth-text-primary)' }}
            >
              Fleet<span style={{ color: 'var(--auth-accent)' }}>IQ</span>
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-dm-serif), "DM Serif Display", Georgia, serif',
              fontSize: 32,
              color: 'var(--auth-text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
            }}
          >
            Bienvenido de nuevo
          </h1>
          <p
            className="mt-2 mb-8"
            style={{ color: 'var(--auth-text-secondary)', fontSize: 14 }}
          >
            Ingresa tus credenciales para continuar
          </p>

          {/* Mensaje de registro exitoso */}
          {justRegistered && (
            <div className="auth-success-msg mb-6">
              Cuenta creada exitosamente. Inicia sesión para continuar.
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="auth-label">
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="auth-label" style={{ marginBottom: 0 }}>
                  Contraseña
                </label>
                <Link
                  href="/recovery"
                  className="auth-link"
                  style={{ fontSize: 12 }}
                >
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
                  className="auth-input"
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--auth-text-tertiary)' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword
                    ? <EyeOff className="w-[18px] h-[18px]" />
                    : <Eye className="w-[18px] h-[18px]" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="auth-error-msg">{error}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </form>

          {/* Link a registro */}
          <p
            className="mt-8 text-center lg:text-left"
            style={{ color: 'var(--auth-text-secondary)', fontSize: 13 }}
          >
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="auth-link">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
