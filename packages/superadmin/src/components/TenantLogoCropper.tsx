import { useRef, useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@kodan-apps/ui-core';
import { Building2, X } from 'lucide-react';
import { getCroppedImg } from '../utils/imageCropper';

type LogoState = 'empty' | 'cropping' | 'cropped';

interface TenantLogoCropperProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

export function TenantLogoCropper({ value, onChange, label = 'Logo de la Empresa' }: TenantLogoCropperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<LogoState>(value ? 'cropped' : 'empty');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      onChange(value); // keep previous
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setState('cropping');
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onChange(croppedDataUrl);
      setState('cropped');
    } catch {
      // error handled upstream via toast
    }
  };

  const handleCropCancel = () => {
    setImageSrc(null);
    setState(value ? 'cropped' : 'empty');
    setCroppedAreaPixels(null);
  };

  const handleRemove = () => {
    setImageSrc(null);
    setState('empty');
    setCroppedAreaPixels(null);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--sys-primary-container)' }}>
          <Building2 size={14} style={{ color: 'var(--sys-on-primary-container)' }} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>{label}</span>
      </div>

      {state === 'empty' && (
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

      {state === 'cropping' && imageSrc && (
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

      {state === 'cropped' && (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl" style={{ background: 'var(--sys-surface)' }}>
          <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {value ? (
              <img src={value} alt="Logo preview" className="w-full h-full object-contain" />
            ) : (
              <Building2 size={36} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-xs" onClick={() => fileInputRef.current?.click()}>
              Cambiar
            </Button>
            <Button variant="ghost" className="text-xs" onClick={handleRemove}>
              <X size={14} /> Eliminar
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>
      )}
    </div>
  );
}
