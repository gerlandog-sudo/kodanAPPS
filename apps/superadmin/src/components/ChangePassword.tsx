import { useState } from 'react';
import { superAdminApi } from '../api/client';
import { Modal, Button } from '@kodan-apps/ui-core';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordProps {
  onClose: () => void;
}

export function ChangePassword({ onClose }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await superAdminApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Contraseña actualizada correctamente');
      onClose();
    } catch (err: any) {
      const msg = err?.data?.errors?.current_password || err?.data?.message || err?.message || 'Error al cambiar la contraseña';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Cambiar Contraseña">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }} htmlFor="current_password">
            CONTRASEÑA ACTUAL
          </label>
          <div className="relative">
            <input
              id="current_password"
              type={showCurrent ? 'text' : 'password'}
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
              style={{ paddingRight: '2.5rem' }}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }} htmlFor="new_password">
            NUEVA CONTRASEÑA
          </label>
          <div className="relative">
            <input
              id="new_password"
              type={showNew ? 'text' : 'password'}
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
              style={{ paddingRight: '2.5rem' }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} onClick={() => setShowNew(!showNew)} tabIndex={-1}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }} htmlFor="confirm_password">
            CONFIRMAR NUEVA CONTRASEÑA
          </label>
          <input
            id="confirm_password"
            type="password"
            className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="flex-1">
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
