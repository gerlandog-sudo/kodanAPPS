import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { KeyRound, Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';

interface SetPasswordProps {
  title?: string;
  logo?: string;
  logoIcon?: ReactNode;
  cardClassName?: string;
  labelClassName?: string;
  emailPlaceholder?: string;
  onBackToLogin: () => void;
}

export function SetPassword({
  title = 'kodanAPPS',
  logo = '/logo.png',
  logoIcon,
  cardClassName = 'p-8',
  labelClassName = 'text-xs font-medium',
  emailPlaceholder = 'superadmin@kodan.software',
  onBackToLogin,
}: SetPasswordProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const tokenParam = params.get('token') || '';
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<any>('/api/auth/set-password', {
        email,
        token,
        password,
      });

      if (response && response.success) {
        setSuccess('Contraseña establecida con éxito. Redirigiendo al login...');
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          onBackToLogin();
        }, 2500);
      } else {
        setError('Error al procesar la solicitud.');
      }
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Error al establecer la contraseña. El token podría estar vencido.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--sys-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 mb-2">
            {logoIcon || <img src={logo} alt="kodan" className="h-8 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-hanken)' }}>{title}</span>
          </div>
        </div>

        <div className={`bg-surface border border-border-soft rounded-2xl shadow-xl ${cardClassName}`}>
          {error && (
            <div className="mb-6 p-3 rounded-lg text-sm bg-error-container text-on-error-container">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 rounded-lg text-sm flex items-center gap-2 bg-primary-container text-on-primary-container">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClassName} style={{ color: 'var(--sys-text-muted)' }} htmlFor="set-email">
                CORREO ELECTRÓNICO
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  id="set-email"
                  type="email"
                  className="pl-10 pr-4 py-2.5 bg-surface-raised border border-border-soft rounded-lg text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || !!success}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClassName} style={{ color: 'var(--sys-text-muted)' }} htmlFor="set-token">
                TOKEN DE ACTIVACIÓN
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  id="set-token"
                  type="text"
                  className="pl-10 pr-4 py-2.5 bg-surface-raised border border-border-soft rounded-lg text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="a1b2c3d4..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  disabled={loading || !!success}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClassName} style={{ color: 'var(--sys-text-muted)' }} htmlFor="set-password">
                NUEVA CONTRASEÑA
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  id="set-password"
                  type="password"
                  className="pl-10 pr-4 py-2.5 bg-surface-raised border border-border-soft rounded-lg text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !!success}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClassName} style={{ color: 'var(--sys-text-muted)' }} htmlFor="set-confirm">
                CONFIRMAR CONTRASEÑA
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input
                  id="set-confirm"
                  type="password"
                  className="pl-10 pr-4 py-2.5 bg-surface-raised border border-border-soft rounded-lg text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !!success}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-primary text-on-primary border-none px-5 py-2.5 rounded-lg font-semibold text-sm w-full cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              disabled={loading || !!success}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Establecer Contraseña'
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-4" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <button
              type="button"
              className="text-xs font-medium inline-flex items-center gap-1"
              style={{ color: 'var(--sys-text-muted)' }}
              onClick={onBackToLogin}
              disabled={loading}
            >
              <ArrowLeft size={12} />
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
