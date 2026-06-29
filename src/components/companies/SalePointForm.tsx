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
import { LocationSelector } from './LocationSelector';

const salePointSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').trim(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  city_code: z.string().optional(),
  state: z.string().optional(),
  state_code: z.string().optional(),
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SalePointFormData>({
    resolver: zodResolver(salePointSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      city: '',
      city_code: '',
      state: '',
      state_code: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: salePoint?.name ?? '',
        address: salePoint?.address ?? '',
        phone: salePoint?.phone ?? '',
        city: salePoint?.city ?? '',
        city_code: salePoint?.city_code ?? '',
        state: salePoint?.state ?? '',
        state_code: salePoint?.state_code ?? '',
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
        if (data.city !== salePoint.city) payload.city = data.city;
        if (data.city_code !== salePoint.city_code) payload.city_code = data.city_code;
        if (data.state !== salePoint.state) payload.state = data.state;
        if (data.state_code !== salePoint.state_code) payload.state_code = data.state_code;
        return salePointsApi.update(salePoint.id, payload);
      } else {
        const payload: CreateSalePointRequest = {
          name: data.name,
          address: data.address || undefined,
          phone: data.phone || undefined,
          city: data.city || undefined,
          city_code: data.city_code || undefined,
          state: data.state || undefined,
          state_code: data.state_code || undefined,
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

        {/* Location Selector (State & City) */}
        <LocationSelector
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          isRequired={true}
        />

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (Detalle)</label>
          <input
            type="text"
            {...register('address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Calle 10 #15-20, Barrio Centro"
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
