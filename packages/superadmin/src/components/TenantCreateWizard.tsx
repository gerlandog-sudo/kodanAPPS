import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@kodan-apps/ui-core';
import {
  Building2, Check, ChevronRight, ChevronLeft, Save, Loader2,
  Palette, Users, AlertCircle,
} from 'lucide-react';
import { TenantLogoCropper } from './TenantLogoCropper';

interface Plan {
  id: number;
  name: string;
  price: number;
  currency: string;
}

interface FormData {
  name: string;
  subscription_plan_id: number;
  logo_url: string | null;
  theme_preference: 'light' | 'dark';
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

interface FormErrors {
  name?: string;
  subscription_plan_id?: string;
  logo_url?: string;
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
  general?: string;
}

interface TenantCreateWizardProps {
  open: boolean;
  plans: Plan[];
  submitting: boolean;
  onSubmit: (data: FormData) => void;
  onClose: () => void;
}

const initialFormData: FormData = {
  name: '',
  subscription_plan_id: 0,
  logo_url: null,
  theme_preference: 'dark',
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

export function TenantCreateWizard({ open, plans, submitting, onSubmit, onClose }: TenantCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({ ...initialFormData });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'El nombre es requerido' }));
      return;
    }
    if (currentStep === 1 && !formData.subscription_plan_id) {
      setErrors(prev => ({ ...prev, subscription_plan_id: 'Seleccione un plan' }));
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    else if (formData.name.trim().length < 2) newErrors.name = 'Mínimo 2 caracteres';
    if (!formData.subscription_plan_id) newErrors.subscription_plan_id = 'Seleccione un plan';
    if (!formData.admin_name.trim()) newErrors.admin_name = 'Nombre requerido';
    else if (formData.admin_name.trim().length < 2) newErrors.admin_name = 'Mínimo 2 caracteres';
    if (!formData.admin_email.trim()) newErrors.admin_email = 'Email requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) newErrors.admin_email = 'Email inválido';
    if (!formData.admin_password.trim()) newErrors.admin_password = 'Contraseña requerida';
    else if (formData.admin_password.length < 8) newErrors.admin_password = 'Mínimo 8 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setErrors({});
    onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl overflow-hidden shadow-2xl my-4"
            style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
          >
            {/* Stepper */}
            <div className="px-8 py-5" style={{ background: 'var(--sys-surface)', borderBottom: '1px solid var(--sys-border-soft)' }}>
              <div className="relative flex justify-between max-w-2xl mx-auto">
                <div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2 z-0" style={{ background: 'var(--sys-border-soft)' }} />
                <motion.div
                  className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 z-0"
                  style={{ background: 'var(--sys-primary)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
                  transition={{ duration: 0.3 }}
                />

                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{
                        background: currentStep >= step ? 'var(--sys-primary)' : 'var(--sys-surface)',
                        border: currentStep >= step ? '3px solid var(--sys-primary-container)' : '3px solid var(--sys-border-soft)',
                        color: currentStep >= step ? '#fff' : 'var(--sys-text-muted)',
                      }}
                    >
                      {currentStep > step ? <Check size={14} /> : step}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: currentStep >= step ? 'var(--sys-primary)' : 'var(--sys-text-muted)' }}
                    >
                      {step === 1 ? 'Información' : step === 2 ? 'Tema' : 'Administrador'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8" style={{ minHeight: '380px' }}>
                <AnimatePresence mode="wait">
                  {/* Step 1: Company Info */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
                            <Building2 size={14} style={{ color: 'var(--sys-on-primary-container)' }} />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Datos de la Empresa</span>
                        </div>

                        {errors.general && (
                          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--sys-error-container)', color: 'var(--color-on-error-container)' }}>
                            <AlertCircle size={14} />
                            {errors.general}
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
                          <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="Ej: Mi Empresa SRL"
                            autoFocus
                          />
                          {errors.name && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Plan de Suscripción *</label>
                          <select
                            className="input select"
                            value={formData.subscription_plan_id}
                            onChange={e => handleChange('subscription_plan_id', parseInt(e.target.value))}
                          >
                            <option value={0}>Seleccionar plan</option>
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}/{plan.currency}</option>
                            ))}
                          </select>
                          {errors.subscription_plan_id && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.subscription_plan_id}</p>}
                        </div>

                        <p className="text-xs" style={{ color: 'var(--sys-text-muted)', opacity: 0.7 }}>
                          Las aplicaciones disponibles se determinan según el plan de suscripción seleccionado.
                        </p>
                      </div>

                      {/* Logo */}
                      <TenantLogoCropper
                        value={formData.logo_url}
                        onChange={(val) => handleChange('logo_url', val)}
                      />
                    </motion.div>
                  )}

                  {/* Step 2: Theme */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
                          <Palette size={14} style={{ color: 'var(--sys-on-primary-container)' }} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Tema de la Plataforma</span>
                      </div>

                      <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>Selecciona el tema visual por defecto para el administrador del tenant.</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(['light', 'dark'] as const).map((theme) => (
                          <div
                            key={theme}
                            onClick={() => handleChange('theme_preference', theme)}
                            className="p-6 rounded-xl border-2 cursor-pointer transition-all"
                            style={{
                              borderColor: formData.theme_preference === theme ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                              background: 'var(--sys-surface)',
                              boxShadow: formData.theme_preference === theme ? '0 0 0 1px var(--sys-primary)' : 'none',
                            }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>
                                Tema {theme === 'light' ? 'Claro' : 'Oscuro'}
                              </span>
                              {formData.theme_preference === theme && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sys-primary)' }}>
                                  <Check size={14} color="#fff" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--sys-text-muted)' }}>
                              {theme === 'light'
                                ? 'Paleta optimizada para entornos de alta luminosidad. Tonos limpios, grises suaves y acentos vibrantes.'
                                : 'Paleta de alto contraste para entornos de baja luminosidad. Negros profundos y reducción de fatiga visual.'}
                            </p>
                            <div className="flex gap-2 p-3 rounded-lg" style={{ background: theme === 'light' ? 'var(--sys-surface)' : '#0a0a1a' }}>
                              {theme === 'light' ? (
                                <>
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#4648d4' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#565e74' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#f8f9ff', border: '1px solid var(--sys-border-soft)' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#ffffff', border: '1px solid var(--sys-border-soft)' }} />
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#c0c1ff' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#bec6e0' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#031427' }} />
                                  <div className="w-6 h-6 rounded-md" style={{ background: '#000f21' }} />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Admin */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
                          <Users size={14} style={{ color: 'var(--sys-on-primary-container)' }} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Administrador Inicial</span>
                      </div>

                      <div className="p-5 rounded-xl" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
                            <input
                              type="text"
                              className="input"
                              value={formData.admin_name}
                              onChange={e => handleChange('admin_name', e.target.value)}
                              placeholder="Juan Pérez"
                            />
                            {errors.admin_name && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.admin_name}</p>}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Email *</label>
                            <input
                              type="email"
                              className="input"
                              value={formData.admin_email}
                              onChange={e => handleChange('admin_email', e.target.value)}
                              placeholder="admin@empresa.com"
                            />
                            {errors.admin_email && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.admin_email}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-4">
                          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Contraseña *</label>
                          <input
                            type="password"
                            className="input"
                            value={formData.admin_password}
                            onChange={e => handleChange('admin_password', e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                          />
                          {errors.admin_password && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.admin_password}</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={currentStep === 1 ? onClose : prevStep}
                >
                  {currentStep === 1 ? 'Cancelar' : (
                    <><ChevronLeft size={16} /> Anterior</>
                  )}
                </Button>

                <div className="flex items-center gap-3">
                  {currentStep < 3 ? (
                    <Button variant="primary" type="button" onClick={nextStep}>
                      Siguiente <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Creando...</>
                      ) : (
                        <><Save size={16} /> Crear Tenant</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
