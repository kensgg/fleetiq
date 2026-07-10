"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Truck, Loader2, Eye, EyeOff, ArrowRight, Building2, User, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre_completo: '',
    nombre_sede: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  const fields = [
    {
      id: 'nombre_sede',
      label: 'Nombre de la Empresa',
      placeholder: 'Ej. Logística ABC S.A.',
      type: 'text',
      icon: Building2,
    },
    {
      id: 'nombre_completo',
      label: 'Tu Nombre Completo',
      placeholder: 'Juan Pérez García',
      type: 'text',
      icon: User,
    },
    {
      id: 'email',
      label: 'Correo Electrónico',
      placeholder: 'correo@empresa.com',
      type: 'email',
      icon: Mail,
    },
  ];

  return (
    <div className="w-full max-w-lg rounded-3xl overflow-hidden glass-card glow-primary p-8 md:p-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Truck className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">Fleet<span className="text-primary">IQ</span></span>
      </div>

      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-1">Crea tu empresa</h1>
        <p className="text-muted-foreground text-sm">Configura tu cuenta y empieza a gestionar tu flota</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ id, label, placeholder, type, icon: Icon }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              {label}
            </Label>
            <Input
              id={id}
              type={type}
              placeholder={placeholder}
              value={formData[id as keyof typeof formData]}
              onChange={handleChange}
              required
              className="h-11 bg-muted/50 border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 rounded-xl"
            />
          </div>
        ))}

        {/* Password field con toggle */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            Contraseña
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
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
          className="w-full h-11 font-semibold shadow-lg shadow-primary/25 rounded-xl mt-2"
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando cuenta...</>
            : <><span>Crear Cuenta</span><ArrowRight className="w-4 h-4 ml-2" /></>
          }
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}
