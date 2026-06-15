import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface SetPasswordProps {
  onBackToLogin: () => void;
}

export function SetPassword({ onBackToLogin }: SetPasswordProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Leer parámetros de URL al montar
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
          // Limpiar parámetros de la URL para evitar re-usos
          window.history.replaceState({}, document.title, window.location.pathname);
          onBackToLogin();
        }, 2500);
      } else {
        setError('Error al procesar la solicitud.');
      }
    } catch (err: any) {
      console.error('[SetPassword] Error:', err);
      const msg = err?.data?.error || err?.message || 'Error al establecer la contraseña. El token podría estar vencido.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="double-bevel-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Establecer Contraseña</h2>
          <p className="text-sm text-muted mt-1">Configuración inicial de Super Admin</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded bg-success/10 border border-success/20 text-success text-sm">
            {success}
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
              disabled={loading || !!success}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted" htmlFor="token">
              TOKEN DE ACTIVACIÓN (RESET TOKEN)
            </label>
            <input
              id="token"
              type="text"
              className="input"
              placeholder="a1b2c3d4..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              disabled={loading || !!success}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted" htmlFor="password">
              NUEVA CONTRASEÑA
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || !!success}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted" htmlFor="confirmPassword">
              CONFIRMAR CONTRASEÑA
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || !!success}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={loading || !!success}
          >
            {loading ? 'Procesando...' : 'Establecer Contraseña'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={onBackToLogin}
            disabled={loading}
          >
            Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}
