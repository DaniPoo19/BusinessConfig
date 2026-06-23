import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../ui';
import { salePointsApi } from '../../services/adminApi';
import { toast } from '../ui/Toast';
import type { SalePoint, CreateSalePointRequest, UpdateSalePointRequest } from '../../types/company';

const salePointSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').trim(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type SalePointFormData = z.infer<typeof salePointSchema>;

interface SalePointFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  salePoint?: SalePoint | null;
}

export function SalePointForm({ isOpen, onClose, onSaved, companyId, salePoint }: SalePointFormProps) {
  const isEditing = !!salePoint;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SalePointFormData>({
    resolver: zodResolver(salePointSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: salePoint?.name ?? '',
        address: salePoint?.address ?? '',
        phone: salePoint?.phone ?? '',
      });
    }
  }, [salePoint, isOpen, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (data: SalePointFormData) => {
      if (isEditing && salePoint) {
        const payload: UpdateSalePointRequest = {};
        if (data.name !== salePoint.name) payload.name = data.name;
        if (data.address !== salePoint.address) payload.address = data.address;
        if (data.phone !== salePoint.phone) payload.phone = data.phone;
        return salePointsApi.update(salePoint.id, payload);
      } else {
        const payload: CreateSalePointRequest = {
          name: data.name,
          address: data.address || undefined,
          phone: data.phone || undefined,
        };
        return salePointsApi.create(companyId, payload);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Sucursal actualizada' : 'Sucursal creada');
      queryClient.invalidateQueries({ queryKey: ['salePoints', companyId] });
      onSaved();
      handleClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    },
  });

  const onSubmit = (data: SalePointFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Sucursal' : 'Nueva Sucursal'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {...register('name')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Sucursal Centro"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            {...register('address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Calle 10 #15-20"
          />
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting || mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
