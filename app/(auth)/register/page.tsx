"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Activity, Shield, BarChart3 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre_sede: '',
    nombre_completo: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación client-side: contraseñas coinciden
    if (formData.password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.nombre_completo.length < 3) {
      setError('El nombre completo debe tener al menos 3 caracteres');
      return;
    }

    if (formData.nombre_sede.length < 3) {
      setError('El nombre de la empresa debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear la cuenta');

      router.push('/login?registered=true');
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
              Tu operación,
              <br />
              <span style={{ color: 'var(--auth-accent)' }}>bajo control total.</span>
            </h2>
            <p
              className="mt-3 leading-relaxed"
              style={{
                color: 'var(--auth-text-secondary)',
                fontSize: 14,
                maxWidth: 320,
              }}
            >
              Crea tu cuenta, registra tu empresa y comienza
              a gestionar tu flota en minutos.
            </p>
          </div>

          {/* Bullets de valor */}
          <div className="space-y-4">
            {[
              { icon: Activity, title: 'Listo en minutos', desc: 'Configura y empieza a operar rápido' },
              { icon: Shield, title: 'Tú eres el administrador', desc: 'Control total de usuarios y roles' },
              { icon: BarChart3, title: 'Sin costo de setup', desc: 'Empieza sin inversión inicial' },
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
          className="auth-animate-in w-full max-w-[420px] mx-auto lg:mx-0 px-6 sm:px-8 lg:pl-16 xl:pl-24 py-10"
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
            Crea tu cuenta para empezar
          </h1>
          <p
            className="mt-2 mb-8"
            style={{ color: 'var(--auth-text-secondary)', fontSize: 14 }}
          >
            Configura tu empresa y comienza a operar
          </p>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre de Empresa */}
            <div>
              <label htmlFor="register-nombre-sede" className="auth-label">
                Nombre de la empresa
              </label>
              <input
                id="register-nombre-sede"
                name="nombre_sede"
                type="text"
                placeholder="Ej. Logística ABC S.A."
                value={formData.nombre_sede}
                onChange={handleChange}
                required
                className="auth-input"
                autoComplete="organization"
              />
            </div>

            {/* Nombre Completo */}
            <div>
              <label htmlFor="register-nombre" className="auth-label">
                Tu nombre completo
              </label>
              <input
                id="register-nombre"
                name="nombre_completo"
                type="text"
                placeholder="Juan Pérez García"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
                className="auth-input"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="auth-label">
                Correo electrónico
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="correo@empresa.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="auth-label">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="auth-input"
                  style={{ paddingRight: 44 }}
                  autoComplete="new-password"
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

            {/* Confirmar Password */}
            <div>
              <label htmlFor="register-confirm-password" className="auth-label">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`auth-input ${
                    confirmPassword && confirmPassword !== formData.password
                      ? 'has-error'
                      : ''
                  }`}
                  style={{ paddingRight: 44 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--auth-text-tertiary)' }}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword
                    ? <EyeOff className="w-[18px] h-[18px]" />
                    : <Eye className="w-[18px] h-[18px]" />
                  }
                </button>
              </div>
              {confirmPassword && confirmPassword !== formData.password && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--auth-error)' }}>
                  Las contraseñas no coinciden
                </p>
              )}
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
                  <span>Creando cuenta…</span>
                </>
              ) : (
                <>
                  <span>Crear cuenta</span>
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </form>

          {/* Link a login */}
          <p
            className="mt-8 text-center lg:text-left"
            style={{ color: 'var(--auth-text-secondary)', fontSize: 13 }}
          >
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="auth-link">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
