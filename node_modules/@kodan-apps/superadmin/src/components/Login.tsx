import { useState } from 'react';
import { api } from '../api/client';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onGoToSetPassword: () => void;
}

export function Login({ onLoginSuccess, onGoToSetPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
        setError('Error en la autenticación.');
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      const msg = err?.data?.error || err?.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="double-bevel-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">kodanAPPS</h2>
          <p className="text-sm text-muted mt-1">Super Admin Console</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted" htmlFor="email">
              CORREO ELECTRÓNICO
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="superadmin@kodan.software"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted" htmlFor="password">
              CONTRASEÑA
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={onGoToSetPassword}
          >
            Establecer / Recuperar Contraseña
          </button>
        </div>
      </div>
    </div>
  );
}
