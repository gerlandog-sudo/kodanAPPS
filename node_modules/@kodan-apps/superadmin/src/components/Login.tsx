import { useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input } from '@kodan-apps/ui-core';
import { LogIn, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onGoToSetPassword: () => void;
}

export function Login({ onLoginSuccess, onGoToSetPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post<any>('/api/auth/login', {
        email,
        password,
        app_id: 'superadmin',
      });

      if (response && response.success) {
        onLoginSuccess(response.user);
      } else {
        toast.error('Error en la autenticación.');
      }
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--sys-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="kodan" className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-hanken)' }}>kodanAPPS</span>
          </div>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)', fontFamily: 'var(--font-hanken)' }} htmlFor="email">
                CORREO ELECTRÓNICO
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)', fontFamily: 'var(--font-hanken)' }} htmlFor="password">
                CONTRASEÑA
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--sys-text-muted)' }}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button variant="primary" type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" />
                  Iniciando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Iniciar Sesión
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <button
              type="button"
              className="text-xs font-medium inline-flex items-center gap-1"
              style={{ color: 'var(--sys-text-muted)' }}
              onClick={onGoToSetPassword}
            >
              Establecer o recuperar contraseña
              <ArrowRight size={12} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
