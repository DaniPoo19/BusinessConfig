import { useState, useEffect, type FormEvent } from 'react';
import { Store } from 'lucide-react';
import { Modal, Button } from '../ui';
import { salePointsApi } from '../../services/adminApi';
import { toast } from '../ui/Toast';
import type { SalePoint, CreateSalePointRequest, UpdateSalePointRequest } from '../../types/company';

interface SalePointFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  salePoint?: SalePoint | null;
}

export function SalePointForm({ isOpen, onClose, onSaved, companyId, salePoint }: SalePointFormProps) {
  const isEditing = !!salePoint;
  const [name, setName] = useState(salePoint?.name ?? '');
  const [address, setAddress] = useState(salePoint?.address ?? '');
  const [phone, setPhone] = useState(salePoint?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Sync form fields when salePoint prop changes (e.g. opening edit modal)
  useEffect(() => {
    if (isOpen) {
      setName(salePoint?.name ?? '');
      setAddress(salePoint?.address ?? '');
      setPhone(salePoint?.phone ?? '');
    }
  }, [salePoint, isOpen]);

  const resetForm = () => {
    setName(salePoint?.name ?? '');
    setAddress(salePoint?.address ?? '');
    setPhone(salePoint?.phone ?? '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (isEditing && salePoint) {
        const payload: UpdateSalePointRequest = {};
        if (name !== salePoint.name) payload.name = name.trim();
        if (address !== salePoint.address) payload.address = address.trim();
        if (phone !== salePoint.phone) payload.phone = phone.trim();
        await salePointsApi.update(salePoint.id, payload);
        toast.success('Sucursal actualizada');
      } else {
        const payload: CreateSalePointRequest = {
          name: name.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        };
        await salePointsApi.create(companyId, payload);
        toast.success('Sucursal creada');
      }
      onSaved();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Sucursal' : 'Nueva Sucursal'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-2">
          <Store className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">
            {isEditing ? 'Actualiza la información de la sucursal' : 'Datos de la nueva sucursal'}
          </span>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Sucursal Centro"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Calle 10 #15-20"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="+57 300 123 4567"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving} disabled={!name.trim()}>
            {isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
