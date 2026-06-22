import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@kodan-apps/ui-core';
import { Loader2, Save, X } from 'lucide-react';
import { TenantLogoCropper } from './TenantLogoCropper';

interface Tenant {
  tenant_id: number;
  name: string;
  logo_url: string | null;
  subscription_plan_id: number | null;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  currency: string;
}

interface TenantEditModalProps {
  tenant: Tenant | null;
  plans: Plan[];
  open: boolean;
  saving: boolean;
  onSave: (data: { name: string; subscription_plan_id: number; logo_url: string | null }) => void;
  onClose: () => void;
}

export function TenantEditModal({ tenant, plans, open, saving, onSave, onClose }: TenantEditModalProps) {
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState(0);
  const [logo, setLogo] = useState<string | null>(tenant?.logo_url ?? null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPlanId(tenant.subscription_plan_id ?? 0);
      setLogo(tenant.logo_url);
    }
  }, [tenant]);

  const handleSave = () => {
    if (!name.trim()) return;
    if (!planId) return;
    onSave({ name: name.trim(), subscription_plan_id: planId, logo_url: logo });
  };

  return (
    <AnimatePresence>
      {open && tenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl overflow-hidden shadow-2xl my-4"
            style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sys-border-soft)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Editar Tenant</h3>
              <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ color: 'var(--sys-text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre</label>
                <input
                  type="text"
                  className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nombre del tenant"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Plan de Suscripción</label>
                <select
                  className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
                  value={planId}
                  onChange={e => setPlanId(parseInt(e.target.value))}
                >
                  <option value={0}>Seleccionar plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}/{plan.currency}</option>
                  ))}
                </select>
              </div>

              <TenantLogoCropper value={logo} onChange={setLogo} label="Logo" />

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar</>}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
