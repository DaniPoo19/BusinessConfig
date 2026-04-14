import { useState, useEffect, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import { Modal, Button } from '../ui';
import { companiesApi } from '../../services/adminApi';
import { toast } from '../ui/Toast';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../types/company';

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  company?: Company | null;
}

export function CompanyForm({ isOpen, onClose, onSaved, company }: CompanyFormProps) {
  const isEditing = !!company;
  const [name, setName] = useState(company?.name ?? '');
  const [email, setEmail] = useState(company?.email ?? '');
  const [phone, setPhone] = useState(company?.phone ?? '');
  const [address, setAddress] = useState(company?.address ?? '');
  const [nit, setNit] = useState(company?.nit ?? '');
  const [saving, setSaving] = useState(false);

  // Sync form fields when company prop changes (e.g. opening edit modal)
  useEffect(() => {
    if (isOpen) {
      setName(company?.name ?? '');
      setEmail(company?.email ?? '');
      setPhone(company?.phone ?? '');
      setAddress(company?.address ?? '');
      setNit(company?.nit ?? '');
    }
  }, [company, isOpen]);

  const resetForm = () => {
    setName(company?.name ?? '');
    setEmail(company?.email ?? '');
    setPhone(company?.phone ?? '');
    setAddress(company?.address ?? '');
    setNit(company?.nit ?? '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    try {
      if (isEditing && company) {
        const payload: UpdateCompanyRequest = {};
        if (name !== company.name) payload.name = name.trim();
        if (email !== company.email) payload.email = email.trim();
        if (phone !== company.phone) payload.phone = phone.trim();
        if (address !== company.address) payload.address = address.trim();
        if (nit !== company.nit) payload.nit = nit.trim();
        await companiesApi.update(company.id, payload);
        toast.success('Empresa actualizada');
      } else {
        // Quick creation without owner (legacy path — full creation uses CompanyCreatePage)
        const payload: UpdateCompanyRequest = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        };
        await companiesApi.create(payload as CreateCompanyRequest);
        toast.success('Empresa creada');
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
      title={isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg mb-2">
          <Building2 className="h-5 w-5 text-primary-600" />
          <span className="text-sm text-primary-700 font-medium">
            {isEditing ? 'Actualiza la información de la empresa' : 'Completa los datos de la nueva empresa'}
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
            placeholder="Heladería Ejemplo S.A.S"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="admin@ejemplo.com"
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

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Calle 10 #15-20, Centro"
          />
        </div>

        {/* NIT */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
          <input
            type="text"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="123456789-0"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving} disabled={!name.trim() || !email.trim()}>
            {isEditing ? 'Guardar Cambios' : 'Crear Empresa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
