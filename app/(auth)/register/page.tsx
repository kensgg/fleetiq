"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Activity, Shield, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AVISO_PRIVACIDAD, POLITICA_PRIVACIDAD } from '@/lib/legal/documentosPrivacidad';

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
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [openAviso, setOpenAviso] = useState(false);
  const [openPolitica, setOpenPolitica] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!aceptaTerminos) {
      setError('Debes aceptar el Aviso de Privacidad y la Política de Privacidad para continuar.');
      return;
    }

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
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
      <div className="glass-panel w-full max-w-[1100px] min-h-[600px] rounded-[2.5rem] flex relative z-10 mx-4 lg:mx-8 border-[1.5px] border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden my-12">
        
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
                Tu operación, <br />
                <span className="text-primary">bajo control total.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                Crea tu cuenta, registra tu empresa y comienza a gestionar tu flota en minutos.
              </p>
            </div>

            <div className="space-y-5">
              {[
                { icon: Activity, title: 'Listo en minutos', desc: 'Configura y empieza a operar rápido' },
                { icon: Shield, title: 'Tú eres el administrador', desc: 'Control total de usuarios y roles' },
                { icon: BarChart3, title: 'Sin costo de setup', desc: 'Empieza sin inversión inicial' },
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
              Crea tu cuenta
            </h1>
            <p className="mt-2 mb-8 text-sm text-muted-foreground">
              Configura tu empresa y comienza a operar
            </p>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nombre de Empresa */}
              <div>
                <label htmlFor="register-nombre-sede" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
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
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                  autoComplete="organization"
                />
              </div>

              {/* Nombre Completo */}
              <div>
                <label htmlFor="register-nombre" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
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
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="register-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
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
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="register-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
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
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/50"
                    autoComplete="new-password"
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

              {/* Confirmar Password */}
              <div>
                <label htmlFor="register-confirm-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-1 uppercase tracking-wider">
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
                    className={`w-full bg-black/20 border ${
                      confirmPassword && confirmPassword !== formData.password
                        ? 'border-destructive/50 focus:border-destructive/50'
                        : 'border-white/10 focus:border-primary/50'
                    } rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground focus:outline-none focus:bg-black/40 transition-all placeholder:text-muted-foreground/50`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== formData.password && (
                  <p className="mt-1.5 text-xs text-destructive ml-1">
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>

              {/* Checkbox Acepta Términos */}
              <div className="flex items-start gap-3 mt-4">
                <input
                  id="register-acepta-terminos"
                  name="aceptaTerminos"
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
                <label htmlFor="register-acepta-terminos" className="cursor-pointer select-none text-xs text-muted-foreground leading-relaxed">
                  He leído y acepto el{' '}
                  <button
                    type="button"
                    onClick={() => setOpenAviso(true)}
                    className="underline hover:text-foreground transition-colors font-semibold inline text-primary"
                  >
                    Aviso de Privacidad
                  </button>{' '}
                  y la{' '}
                  <button
                    type="button"
                    onClick={() => setOpenPolitica(true)}
                    className="underline hover:text-foreground transition-colors font-semibold inline text-primary"
                  >
                    Política de Privacidad
                  </button>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold rounded-xl px-4 py-3.5 text-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-4 disabled:opacity-50 disabled:pointer-events-none"
                disabled={loading || !aceptaTerminos}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creando cuenta…</span>
                  </>
                ) : (
                  <>
                    <span>Crear cuenta</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Link a login */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-semibold text-foreground hover:text-primary transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </main>
      </div>

      {/* Diálogos de Privacidad */}
      <Dialog open={openAviso} onOpenChange={setOpenAviso}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-xl border border-zinc-800 bg-[#18181B] text-zinc-200">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-zinc-100">
              Aviso de Privacidad
            </DialogTitle>
            <DialogDescription className="sr-only">
              Aviso de Privacidad oficial para la protección de datos personales de FleetIQ conforme a la LFPDPPP.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-[13px] leading-relaxed text-zinc-400 whitespace-pre-wrap select-text">
            {AVISO_PRIVACIDAD}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-zinc-800">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto cursor-pointer">
                Entendido
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openPolitica} onOpenChange={setOpenPolitica}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-xl border border-zinc-800 bg-[#18181B] text-zinc-200">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-zinc-100">
              Política de Privacidad
            </DialogTitle>
            <DialogDescription className="sr-only">
              Política de Privacidad y seguridad de la información recopilada en FleetIQ.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-[13px] leading-relaxed text-zinc-400 whitespace-pre-wrap select-text">
            {POLITICA_PRIVACIDAD}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-zinc-800">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto cursor-pointer">
                Entendido
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
