import { useEffect, useState, useRef, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import { Button, Toggle } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import Cropper, { type Area } from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Plus,
  X,
  Check,
  Shield,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Palette,
  Users,
  Loader2,
  Pencil,
} from 'lucide-react';

interface Tenant {
  tenant_id: number;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  is_system_tenant: boolean;
  subscription_plan_id: number | null;
  plan_name: string;
  plan_price: number;
  plan_currency: string;
  created_at: string;
  apps: Array<{ app_id: string; is_active: boolean }>;
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

interface TenantFormData {
  name: string;
  subscription_plan_id: number;
  logo_url: string | null;
  theme_preference: 'light' | 'dark';
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="skeleton h-4 w-full" style={{ maxWidth: i === 0 ? '180px' : i === 4 ? '80px' : '100px' }} />
        </td>
      ))}
    </tr>
  );
}

// Canvas-based image cropper utility
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: number; currency: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo cropper state
  const [logoState, setLogoState] = useState<'empty' | 'cropping' | 'cropped'>('empty');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    subscription_plan_id: 0,
    logo_url: null,
    theme_preference: 'dark',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null);
  const [activateTarget, setActivateTarget] = useState<Tenant | null>(null);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlanId, setEditPlanId] = useState(0);
  const [editLogo, setEditLogo] = useState<string | null>(null);
  const [editLogoState, setEditLogoState] = useState<'empty' | 'cropping' | 'cropped'>('empty');
  const [editImageSrc, setEditImageSrc] = useState<string | null>(null);
  const [editCrop, setEditCrop] = useState({ x: 0, y: 0 });
  const [editZoom, setEditZoom] = useState(1);
  const [editCroppedAreaPixels, setEditCroppedAreaPixels] = useState<Area | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes] = await Promise.all([
        superAdminApi.listTenants(),
        superAdminApi.listPlans(),
      ]) as [Tenant[], Array<{ id: number; name: string; price: number; currency: string }>];
      setTenants(tenantsRes);
      setPlans(plansRes.map((p: any) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando datos';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TenantFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ---- Logo handlers ----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast.error('El logo es muy pesado (máx 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setLogoState('cropping');
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be reselected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      setFormData(prev => ({ ...prev, logo_url: croppedDataUrl }));
      setLogoState('cropped');
      setErrors(prev => ({ ...prev, logo_url: undefined }));
    } catch {
      toast.error('Error al procesar la imagen');
    }
  };

  const handleCropCancel = () => {
    setImageSrc(null);
    setLogoState('empty');
    setCroppedAreaPixels(null);
    setFormData(prev => ({ ...prev, logo_url: null }));
  };

  const handleRemoveLogo = () => {
    setImageSrc(null);
    setLogoState('empty');
    setCroppedAreaPixels(null);
    setFormData(prev => ({ ...prev, logo_url: null }));
  };

  // ---- Wizard navigation ----
  const nextStep = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'El nombre es requerido' }));
      return;
    }
    if (currentStep === 1 && !formData.subscription_plan_id) {
      setErrors(prev => ({ ...prev, subscription_plan_id: 'Seleccione un plan' }));
      return;
    }
    // If still cropping, confirm first
    if (currentStep === 1 && logoState === 'cropping') {
      toast.error('Confirma o cancela el recorte del logo antes de continuar');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setErrors({});

    try {
      await superAdminApi.createTenant({
        name: formData.name.trim(),
        subscription_plan_id: formData.subscription_plan_id,
        logo_url: formData.logo_url,
        theme_preference: formData.theme_preference,
        admin_name: formData.admin_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_password: formData.admin_password,
      });
      toast.success('Tenant creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      if (err.data && typeof err.data === 'object' && 'errors' in err.data) {
        setErrors(err.data.errors as FormErrors);
      } else {
        setErrors({ general: err.message || 'Error creando tenant' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (tenant: Tenant) => {
    if (tenant.is_system_tenant) {
      toast.error('No se puede desactivar el tenant de sistema');
      return;
    }
    setDeactivateTarget(tenant);
  };

  const handleToggleTenant = (tenant: Tenant) => {
    if (tenant.is_active) {
      handleDeactivate(tenant);
    } else {
      handleActivate(tenant);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await superAdminApi.deactivateTenant(deactivateTarget.tenant_id);
      toast.success(`Tenant "${deactivateTarget.name}" desactivado`);
      setDeactivateTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error desactivando tenant');
      setDeactivateTarget(null);
    }
  };

  const handleActivate = (tenant: Tenant) => {
    setActivateTarget(tenant);
  };

  const confirmActivate = async () => {
    if (!activateTarget) return;
    try {
      await superAdminApi.activateTenant(activateTarget.tenant_id);
      toast.success(`Tenant "${activateTarget.name}" reactivado`);
      setActivateTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error reactivando tenant');
      setActivateTarget(null);
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditTarget(tenant);
    setEditName(tenant.name);
    setEditPlanId(tenant.subscription_plan_id || 0);
    setEditLogo(tenant.logo_url);
    setEditLogoState(tenant.logo_url ? 'cropped' : 'empty');
    setEditImageSrc(null);
    setEditCrop({ x: 0, y: 0 });
    setEditZoom(1);
    setEditCroppedAreaPixels(null);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      toast.error('El logo es muy pesado (máx 500KB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImageSrc(reader.result as string);
      setEditLogoState('cropping');
      setEditZoom(1);
      setEditCrop({ x: 0, y: 0 });
      setEditCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const onEditCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setEditCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleEditCropConfirm = async () => {
    if (!editImageSrc || !editCroppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(editImageSrc, editCroppedAreaPixels);
      setEditLogo(cropped);
      setEditLogoState('cropped');
      setEditImageSrc(null);
    } catch {
      toast.error('Error al procesar el logo');
    }
  };

  const handleEditCropCancel = () => {
    setEditImageSrc(null);
    setEditLogoState(editLogo ? 'cropped' : 'empty');
  };

  const handleEditRemoveLogo = () => {
    setEditLogo(null);
    setEditLogoState('empty');
  };

  const saveEdit = async () => {
    if (!editTarget || !editName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!editPlanId) {
      toast.error('Seleccione un plan');
      return;
    }
    setEditSubmitting(true);
    try {
      await superAdminApi.updateTenant(editTarget.tenant_id, {
        name: editName.trim(),
        subscription_plan_id: editPlanId,
        logo_url: editLogo,
      });
      toast.success('Tenant actualizado');
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error actualizando tenant');
    } finally {
      setEditSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subscription_plan_id: 0,
      logo_url: null,
      theme_preference: 'dark',
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setErrors({});
    setCurrentStep(1);
    setLogoState('empty');
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={16} />
          Nuevo Tenant
        </Button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Estado</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 size={40} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                    <p className="mt-3 text-sm font-medium" style={{ color: 'var(--sys-text-muted)' }}>No hay tenants registrados</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--sys-text-muted)', opacity: 0.7 }}>Crea el primer tenant para comenzar</p>
                  </div>
                </td>
              </tr>
            ) : (
              tenants.map(tenant => (
                <tr key={tenant.tenant_id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden text-xs font-semibold" style={{ background: 'var(--sys-surface)' }}>
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span style={{ color: 'var(--sys-primary)' }}>{tenant.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tenant.name}</p>
                        <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>ID: {tenant.tenant_id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-plan">
                      {tenant.plan_name} (${tenant.plan_price}/{tenant.plan_currency})
                    </span>
                  </td>
                  <td>
                    {tenant.is_system_tenant ? (
                      <span className="badge badge-info flex items-center gap-1.5">
                        <Shield size={10} />
                        Protegido
                      </span>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Toggle
                          checked={tenant.is_active}
                          onChange={() => handleToggleTenant(tenant)}
                        />
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: tenant.is_active ? 'var(--sys-success)' : 'var(--sys-error)',
                        }}>
                          {tenant.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    <Button variant="ghost" className="text-xs flex items-center gap-1.5 ml-auto" onClick={() => openEditModal(tenant)}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Wizard Modal */}
      <AnimatePresence>
        {showCreateModal && (
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
                    {/* Step 1: Company Info + Logo */}
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

                        {/* Logo column */}
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
                              <Plus size={14} style={{ color: 'var(--sys-on-primary-container)' }} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Logo de la Empresa</span>
                          </div>

                          {logoState === 'empty' && (
                            <div
                              className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer border-2 border-dashed transition-all hover:opacity-80"
                              style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                                <Building2 size={36} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                              </div>
                              <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Haz clic para subir el logo</p>
                              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)', opacity: 0.6 }}>PNG, JPG o WEBP - Máx 500KB</p>
                              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                            </div>
                          )}

                          {logoState === 'cropping' && imageSrc && (
                            <div className="flex flex-col gap-3">
                              <div className="relative w-full" style={{ height: '260px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <Cropper
                                  image={imageSrc}
                                  crop={crop}
                                  zoom={zoom}
                                  aspect={1}
                                  onCropChange={setCrop}
                                  onZoomChange={setZoom}
                                  onCropComplete={onCropComplete}
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Zoom:</span>
                                <input
                                  type="range"
                                  min={1}
                                  max={3}
                                  step={0.1}
                                  value={zoom}
                                  onChange={e => setZoom(Number(e.target.value))}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleCropCancel} className="flex-1">Cancelar</Button>
                                <Button variant="primary" onClick={handleCropConfirm} className="flex-1">Confirmar</Button>
                              </div>
                            </div>
                          )}

                          {logoState === 'cropped' && formData.logo_url && (
                            <div className="flex flex-col items-center gap-3 p-6 rounded-xl" style={{ background: 'var(--sys-surface)' }}>
                              <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <img src={formData.logo_url} alt="Logo preview" className="w-full h-full object-contain" />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" className="text-xs" onClick={() => fileInputRef.current?.click()}>
                                  Cambiar
                                </Button>
                                <Button variant="ghost" className="text-xs" onClick={handleRemoveLogo}>
                                  <X size={14} /> Eliminar
                                </Button>
                              </div>
                              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                            </div>
                          )}

                          {errors.logo_url && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.logo_url}</p>}
                        </div>
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
                          {/* Light Theme */}
                          <div
                            onClick={() => handleChange('theme_preference', 'light')}
                            className="p-6 rounded-xl border-2 cursor-pointer transition-all"
                            style={{
                              borderColor: formData.theme_preference === 'light' ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                              background: formData.theme_preference === 'light' ? 'var(--sys-surface)' : 'var(--sys-surface)',
                              boxShadow: formData.theme_preference === 'light' ? '0 0 0 1px var(--sys-primary)' : 'none',
                            }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Tema Claro</span>
                              {formData.theme_preference === 'light' && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sys-primary)' }}>
                                  <Check size={14} color="#fff" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--sys-text-muted)' }}>
                              Paleta optimizada para entornos de alta luminosidad. Tonos limpios, grises suaves y acentos vibrantes.
                            </p>
                            <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'var(--sys-surface)' }}>
                              <div className="w-6 h-6 rounded-md" style={{ background: '#4648d4' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#565e74' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#f8f9ff', border: '1px solid var(--sys-border-soft)' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#ffffff', border: '1px solid var(--sys-border-soft)' }} />
                            </div>
                          </div>

                          {/* Dark Theme */}
                          <div
                            onClick={() => handleChange('theme_preference', 'dark')}
                            className="p-6 rounded-xl border-2 cursor-pointer transition-all"
                            style={{
                              borderColor: formData.theme_preference === 'dark' ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
                              background: formData.theme_preference === 'dark' ? 'var(--sys-surface)' : 'var(--sys-surface)',
                              boxShadow: formData.theme_preference === 'dark' ? '0 0 0 1px var(--sys-primary)' : 'none',
                            }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Tema Oscuro</span>
                              {formData.theme_preference === 'dark' && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sys-primary)' }}>
                                  <Check size={14} color="#fff" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--sys-text-muted)' }}>
                              Paleta de alto contraste para entornos de baja luminosidad. Negros profundos y reducción de fatiga visual.
                            </p>
                            <div className="flex gap-2 p-3 rounded-lg" style={{ background: '#0a0a1a' }}>
                              <div className="w-6 h-6 rounded-md" style={{ background: '#c0c1ff' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#bec6e0' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#031427' }} />
                              <div className="w-6 h-6 rounded-md" style={{ background: '#000f21' }} />
                            </div>
                          </div>
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
                    onClick={currentStep === 1 ? () => setShowCreateModal(false) : prevStep}
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

      {/* Confirm Dialog - Desactivar */}
      <AnimatePresence>
        {deactivateTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden shadow-2xl"
              style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
            >
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--sys-error-container)' }}>
                    <AlertCircle size={20} style={{ color: 'var(--sys-error)' }} />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Desactivar Tenant</h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
                  ¿Estás seguro de desactivar <strong>{deactivateTarget.name}</strong>? Los usuarios no podrán acceder inmediatamente.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
                  <Button variant="secondary" onClick={confirmDeactivate}>
                    Desactivar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog - Activar */}
      <AnimatePresence>
        {activateTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden shadow-2xl"
              style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
            >
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
                    <Check size={20} style={{ color: 'var(--sys-primary)' }} />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Activar Tenant</h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
                  ¿Estás seguro de reactivar <strong>{activateTarget.name}</strong>? Los usuarios podrán acceder nuevamente.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setActivateTarget(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={confirmActivate}>
                    <Check size={14} /> Activar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editTarget && (
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
                <button onClick={() => setEditTarget(null)} className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ color: 'var(--sys-text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre</label>
                  <input
                    type="text"
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nombre del tenant"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Plan de Suscripción</label>
                  <select
                    className="input select"
                    value={editPlanId}
                    onChange={e => setEditPlanId(parseInt(e.target.value))}
                  >
                    <option value={0}>Seleccionar plan</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}/{plan.currency}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Logo</label>
                  {editLogoState === 'empty' && (
                    <div
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl cursor-pointer border-2 border-dashed"
                      style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      <Building2 size={24} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                      <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Subir logo</p>
                      <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditFileSelect} className="hidden" />
                    </div>
                  )}
                  {editLogoState === 'cropping' && editImageSrc && (
                    <div className="flex flex-col gap-3">
                      <div className="relative w-full" style={{ height: '200px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <Cropper
                          image={editImageSrc}
                          crop={editCrop}
                          zoom={editZoom}
                          aspect={1}
                          onCropChange={setEditCrop}
                          onZoomChange={setEditZoom}
                          onCropComplete={onEditCropComplete}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Zoom:</span>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={editZoom}
                          onChange={e => setEditZoom(Number(e.target.value))}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleEditCropCancel} className="flex-1">Cancelar</Button>
                        <Button variant="primary" onClick={handleEditCropConfirm} className="flex-1">Confirmar</Button>
                      </div>
                    </div>
                  )}
                  {editLogoState === 'cropped' && (
                    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--sys-surface)' }}>
                      {editLogo ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center">
                          <img src={editLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                          <Building2 size={24} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{editLogo ? 'Logo actual' : 'Sin logo'}</p>
                        {!editLogo && <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>El tenant no tiene logo</p>}
                      </div>
                      <div className="flex gap-2">
                        {!editLogo ? (
                          <Button variant="ghost" onClick={() => editFileInputRef.current?.click()}>
                            <Plus size={14} /> Subir
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" onClick={() => editFileInputRef.current?.click()}>Cambiar</Button>
                            <Button variant="ghost" onClick={handleEditRemoveLogo}><X size={14} /></Button>
                          </>
                        )}
                      </div>
                      <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditFileSelect} className="hidden" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={saveEdit} disabled={editSubmitting}>
                    {editSubmitting ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
