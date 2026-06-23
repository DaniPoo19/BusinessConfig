import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button } from '../ui';
import { parametersApi } from '../../services/parametersApi';
import { toast } from '../ui/Toast';
import { useState } from 'react';
import type { BusinessHoursValue } from '../../types/company';

const schema = z.object({
  open_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido (HH:MM)'),
  close_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido (HH:MM)'),
  enabled: z.boolean(),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

interface BusinessHoursFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  salePointId: string;
  currentValue: BusinessHoursValue | null;
}

export function BusinessHoursForm({
  isOpen,
  onClose,
  onSaved,
  companyId,
  salePointId,
  currentValue,
}: BusinessHoursFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      open_time: currentValue?.open_time || '08:00',
      close_time: currentValue?.close_time || '23:00',
      enabled: currentValue?.enabled ?? true,
      timezone: currentValue?.timezone || 'America/Bogota',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      if (currentValue) {
        // Parameter exists, update it
        await parametersApi.update('BUSINESS_HOURS', {
          company_id: companyId,
          sale_point_id: salePointId,
          value: data as unknown as Record<string, unknown>,
        });
      } else {
        // Create new parameter
        await parametersApi.create({
          key: 'BUSINESS_HOURS',
          company_id: companyId,
          sale_point_id: salePointId,
          value: data as unknown as Record<string, unknown>,
        });
      }
      toast.success('Horario de atención guardado correctamente');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar horario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Horario de Atención">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
          <input
            type="checkbox"
            id="enabled"
            {...register('enabled')}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="text-sm font-semibold text-gray-800 cursor-pointer">
            Sucursal Abierta para Pedidos
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Hora de Apertura
            </label>
            <input
              type="text"
              placeholder="08:00"
              {...register('open_time')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.open_time ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.open_time && (
              <p className="text-xs text-red-500 mt-1">{errors.open_time.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Hora de Cierre
            </label>
            <input
              type="text"
              placeholder="23:00"
              {...register('close_time')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.close_time ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.close_time && (
              <p className="text-xs text-red-500 mt-1">{errors.close_time.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
            Zona Horaria
          </label>
          <input
            type="text"
            placeholder="America/Bogota"
            {...register('timezone')}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.timezone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {errors.timezone && (
            <p className="text-xs text-red-500 mt-1">{errors.timezone.message}</p>
          )}
          <p className="text-[10px] text-gray-400 mt-1">
            Ejemplos válidos: America/Bogota, America/Caracas, America/Mexico_City, UTC.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
