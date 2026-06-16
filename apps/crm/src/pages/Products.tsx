import { useEffect, useState } from 'react';
import { Card, Button, Input, Modal } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { Plus, Edit, Trash2, Tag, DollarSign, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';

export function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '0',
    is_active: '1',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await crmApi.listProducts();
      setProducts(data);
    } catch {
      toast.error('Error al cargar catálogo de productos.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setForm({
      name: '',
      sku: '',
      description: '',
      price: '0',
      is_active: '1',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setSelectedProduct(p);
    setForm({
      name: p.name || '',
      sku: p.sku || '',
      description: p.description || '',
      price: String(p.price || '0'),
      is_active: String(p.is_active ?? 1),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre del producto es obligatorio.');
      return;
    }
    const priceVal = parseFloat(form.price);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error('El precio debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      const payload = {
        ...form,
        price: priceVal,
        is_active: parseInt(form.is_active, 10),
      };

      if (selectedProduct) {
        await crmApi.updateProduct(selectedProduct.id, payload);
        toast.success('Producto actualizado.');
      } else {
        await crmApi.createProduct(payload);
        toast.success('Producto agregado al catálogo.');
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el producto.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este producto del catálogo?')) return;
    try {
      await crmApi.deleteProduct(id);
      toast.success('Producto eliminado del catálogo.');
      loadProducts();
    } catch {
      toast.error('Error al eliminar producto.');
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(String(val)) || 0);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 w-full">
        <Button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nuevo Producto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <Card key={p.id} className="p-5 double-bevel-card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                      <Tag size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{p.name}</h4>
                      {p.sku && <p className="text-[10px] uppercase font-mono" style={{ color: 'var(--sys-text-muted)' }}>SKU: {p.sku}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Editar">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs line-clamp-2 mt-2" style={{ color: 'var(--sys-text-muted)' }}>{p.description || 'Sin descripción comercial disponible.'}</p>
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <div className="flex items-center gap-1">
                  <DollarSign size={14} style={{ color: 'var(--sys-primary)' }} />
                  <span className="font-bold text-sm">{formatCurrency(p.price)}</span>
                </div>
                <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {p.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </Card>
          ))}

          {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-10 bg-slate-50 dark:background-slate-900 rounded-xl border border-dashed">
              <PackageOpen size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
              <p className="text-sm italic mt-2" style={{ color: 'var(--sys-text-muted)' }}>No hay productos registrados en el catálogo comercial.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Creación / Edición */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedProduct ? 'Editar Producto del Catálogo' : 'Nuevo Producto del Catálogo'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>NOMBRE DEL PRODUCTO / SERVICIO *</label>
            <Input 
              value={form.name} 
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="Ej: Licencia Anual Cloud SAAS" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>CÓDIGO / SKU</label>
              <Input 
                value={form.sku} 
                onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))} 
                placeholder="Ej: LIC-CLOUD-01" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>PRECIO DE VENTA (ARS) *</label>
              <Input 
                type="number"
                value={form.price} 
                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))} 
                placeholder="0.00" 
                required 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>DESCRIPCIÓN COMERCIAL</label>
            <textarea 
              className="input text-xs" 
              rows={3}
              value={form.description} 
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Escribe una breve descripción del producto, características o alcance del servicio..." 
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>ESTADO</label>
            <select 
              className="input select" 
              value={form.is_active} 
              onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.value }))}
            >
              <option value="1">Activo (Disponible para cotizar)</option>
              <option value="0">Inactivo (No disponible)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="btn-primary">
              {selectedProduct ? 'Actualizar Producto' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
