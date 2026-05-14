import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../ui';
import { companiesApi } from '../../services/adminApi';
import { toast } from '../ui/Toast';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../types/company';

const companySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').trim(),
  email: z.string().email('Email inválido').min(1, 'El email es obligatorio').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  nit: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  company?: Company | null;
}

export function CompanyForm({ isOpen, onClose, onSaved, company }: CompanyFormProps) {
  const isEditing = !!company;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      nit: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: company?.name ?? '',
        email: company?.email ?? '',
        phone: company?.phone ?? '',
        address: company?.address ?? '',
        nit: company?.nit ?? '',
      });
    }
  }, [company, isOpen, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (isEditing && company) {
        const payload: UpdateCompanyRequest = {};
        if (data.name !== company.name) payload.name = data.name;
        if (data.email !== company.email) payload.email = data.email;
        if (data.phone !== company.phone) payload.phone = data.phone;
        if (data.address !== company.address) payload.address = data.address;
        if (data.nit !== company.nit) payload.nit = data.nit;
        return companiesApi.update(company.id, payload);
      } else {
        const payload = {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          address: data.address || undefined,
        };
        return companiesApi.create(payload as CreateCompanyRequest);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Empresa actualizada' : 'Empresa creada');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onSaved();
      handleClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {...register('name')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Heladería Ejemplo S.A.S"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...register('email')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="admin@ejemplo.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="+57 300 123 4567"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            {...register('address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Calle 10 #15-20, Centro"
          />
        </div>

        {/* NIT */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
          <input
            type="text"
            {...register('nit')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="123456789-0"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting || mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEditing ? 'Guardar Cambios' : 'Crear Empresa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
