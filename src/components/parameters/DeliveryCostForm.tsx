import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button } from '../ui';
import { parametersApi } from '../../services/parametersApi';
import { toast } from '../ui/Toast';
import { useState } from 'react';
import type { DeliveryNeighbourhood } from '../../types/company';

const schema = z.object({
  neighbourhood: z.string().min(1, 'El nombre del barrio es obligatorio').trim(),
  price: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'El precio debe ser un número positivo')
  ),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface DeliveryCostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  salePointId: string;
  neighbourhoodToEdit: DeliveryNeighbourhood | null;
  existingList: DeliveryNeighbourhood[];
  parameterExists: boolean;
}

export function DeliveryCostForm({
  isOpen,
  onClose,
  onSaved,
  companyId,
  salePointId,
  neighbourhoodToEdit,
  existingList,
  parameterExists,
}: DeliveryCostFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      neighbourhood: neighbourhoodToEdit?.neighbourhood || '',
      price: neighbourhoodToEdit?.price ?? 0,
      is_active: neighbourhoodToEdit?.is_active ?? true,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      let updatedList: DeliveryNeighbourhood[] = [];

      if (neighbourhoodToEdit) {
        // Edit mode: replace the item in the list
        updatedList = existingList.map((item) =>
          item.neighbourhood.toLowerCase().trim() === neighbourhoodToEdit.neighbourhood.toLowerCase().trim()
            ? { ...item, neighbourhood: data.neighbourhood, price: data.price, is_active: data.is_active }
            : item
        );
      } else {
        // Add mode: check if it already exists
        const exists = existingList.some(
          (item) => item.neighbourhood.toLowerCase().trim() === data.neighbourhood.toLowerCase().trim()
        );
        if (exists) {
          toast.error('Este barrio ya está en la lista');
          setIsSaving(false);
          return;
        }
        updatedList = [...existingList, { ...data }];
      }

      // Save list to database
      if (parameterExists) {
        await parametersApi.update('DELIVERY_COST', {
          company_id: companyId,
          sale_point_id: salePointId,
          value: { data: updatedList },
        });
      } else {
        await parametersApi.create({
          key: 'DELIVERY_COST',
          company_id: companyId,
          sale_point_id: salePointId,
          value: { data: updatedList },
        });
      }

      toast.success(
        neighbourhoodToEdit
          ? 'Barrio actualizado correctamente'
          : 'Nuevo barrio agregado correctamente'
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar cobertura');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={neighbourhoodToEdit ? 'Editar Costo de Barrio' : 'Agregar Nuevo Barrio'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Active toggle */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="text-sm font-semibold text-gray-800 cursor-pointer">
            Barrio Activo (Habilitar Domicilios)
          </label>
        </div>

        {/* Neighbourhood name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
            Nombre del Barrio / Zona
          </label>
          <input
            type="text"
            placeholder="Ej: Barrio Norte"
            {...register('neighbourhood')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.neighbourhood ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {errors.neighbourhood && (
            <p className="text-xs text-red-500 mt-1">{errors.neighbourhood.message}</p>
          )}
        </div>

        {/* Delivery Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
            Costo de Envío ($)
          </label>
          <input
            type="number"
            placeholder="0"
            {...register('price')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.price ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {errors.price && (
            <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {neighbourhoodToEdit ? 'Guardar Cambios' : 'Agregar Barrio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
