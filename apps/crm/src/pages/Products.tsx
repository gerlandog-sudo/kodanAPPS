import { useEffect, useState } from 'react';
import { Button, Input, Modal, Table } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { Plus, Edit, Trash2, Tag, PackageOpen } from 'lucide-react';
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

      <Table
        data={products}
        columns={[
          {
            key: 'product',
            header: 'Producto',
            render: p => (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <Tag size={14} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  {p.sku && <p className="text-xs font-normal uppercase" style={{ color: 'var(--sys-text-muted)' }}>SKU: {p.sku}</p>}
                </div>
              </>
            ),
          },
          {
            key: 'description',
            header: 'Descripción',
            render: p => (
              <span className="text-xs font-normal line-clamp-2" style={{ color: 'var(--sys-text-muted)' }}>
                {p.description || 'Sin descripción'}
              </span>
            ),
          },
          {
            key: 'price',
            header: 'Precio',
            align: 'right',
            render: p => (
              <span className="font-semibold text-sm">{formatCurrency(p.price)}</span>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            render: p => (
              <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {p.is_active ? 'Activo' : 'Inactivo'}
              </span>
            ),
          },
        ]}
        keyExtractor={p => p.id}
        loading={loading}
        emptyState={{
          icon: <PackageOpen size={40} />,
          title: 'No hay productos registrados en el catálogo',
          description: '',
        }}
        actions={[
          { icon: <Edit size={14} />, label: 'Editar', onClick: p => handleOpenEdit(p) },
          { icon: <Trash2 size={14} />, label: 'Eliminar', variant: 'danger', onClick: p => handleDelete(p.id) },
        ]}
        pageSize={15}
      />

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
