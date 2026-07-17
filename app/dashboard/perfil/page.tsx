'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function PerfilPage() {
  // ── State ──
  const [profile, setProfile] = useState<{
    nombre_completo: string;
    email: string;
    rol: string;
    sede_nombre: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit name
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Fetch profile ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
          setEditName(data.data.nombre_completo);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Handle update name ──
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg(null);
    if (editName.trim().length < 3) {
      setNameMsg({ type: 'error', text: 'El nombre debe tener al menos 3 caracteres.' });
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => prev ? { ...prev, nombre_completo: editName.trim() } : prev);
        setNameMsg({ type: 'success', text: 'Nombre actualizado correctamente.' });
      } else {
        setNameMsg({ type: 'error', text: data.message || 'Error al actualizar.' });
      }
    } catch {
      setNameMsg({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSavingName(false);
    }
  };

  // ── Handle change password ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPassMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg({ type: 'error', text: data.message || 'Error al actualizar.' });
      }
    } catch {
      setPassMsg({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const initials = profile.nombre_completo
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ROL_DISPLAY: Record<string, string> = {
    administrador: 'Administrador',
    gerente_operaciones: 'Gerente de Operaciones',
    supervisor: 'Supervisor',
    conductor: 'Conductor',
    capturista: 'Capturista',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cuenta
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Consulta y edita la información de tu cuenta.
        </p>
      </div>

      {/* Profile card */}
      <Card className="border border-border/50 bg-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs">
                  {ROL_DISPLAY[profile.rol] || profile.rol}
                </Badge>
                {profile.sede_nombre && (
                  <span className="text-xs text-muted-foreground">
                    · {profile.sede_nombre}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit name form */}
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="auth-label">
                Nombre completo
              </label>
              <input
                id="profile-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="auth-input"
                placeholder="Tu nombre completo"
              />
            </div>

            {nameMsg && (
              <FeedbackMsg type={nameMsg.type} text={nameMsg.text} />
            )}

            <button
              type="submit"
              disabled={savingName || editName.trim() === profile.nombre_completo}
              className="auth-btn"
              style={{ maxWidth: 220 }}
            >
              {savingName ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <Save className="w-[18px] h-[18px]" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Change password card */}
      <Card className="border border-border/50 bg-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Cambiar contraseña</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="auth-label">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="auth-input"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="auth-label">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`auth-input ${
                  confirmPassword && confirmPassword !== newPassword ? 'has-error' : ''
                }`}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--auth-error)' }}>
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {passMsg && (
              <FeedbackMsg type={passMsg.type} text={passMsg.text} />
            )}

            <button
              type="submit"
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="auth-btn"
              style={{ maxWidth: 260 }}
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  <span>Actualizando…</span>
                </>
              ) : (
                <>
                  <Lock className="w-[18px] h-[18px]" />
                  <span>Actualizar contraseña</span>
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Feedback message sub-component
// ─────────────────────────────────────────────────────────────

function FeedbackMsg({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div className={type === 'success' ? 'auth-success-msg' : 'auth-error-msg'}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0" />
        )}
        <span>{text}</span>
      </div>
    </div>
  );
}
