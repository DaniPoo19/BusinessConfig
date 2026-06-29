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
import { LocationSelector } from './LocationSelector';

const companySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').trim(),
  email: z.string().email('Email inválido').min(1, 'El email es obligatorio').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  city_code: z.string().optional(),
  state: z.string().optional(),
  state_code: z.string().optional(),
  nit: z.string().optional(),
  email_from_address: z.union([z.string().email('Email de remitente inválido'), z.literal('')]).optional(),
  email_from_name: z.string().optional(),
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      city_code: '',
      state: '',
      state_code: '',
      nit: '',
      email_from_address: '',
      email_from_name: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: company?.name ?? '',
        email: company?.email ?? '',
        phone: company?.phone ?? '',
        address: company?.address ?? '',
        city: company?.city ?? '',
        city_code: company?.city_code ?? '',
        state: company?.state ?? '',
        state_code: company?.state_code ?? '',
        nit: company?.nit ?? '',
        email_from_address: company?.email_from_address ?? '',
        email_from_name: company?.email_from_name ?? '',
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
        if (data.city !== company.city) payload.city = data.city;
        if (data.city_code !== company.city_code) payload.city_code = data.city_code;
        if (data.state !== company.state) payload.state = data.state;
        if (data.state_code !== company.state_code) payload.state_code = data.state_code;
        if (data.nit !== company.nit) payload.nit = data.nit;
        if (data.email_from_address !== company.email_from_address) payload.email_from_address = data.email_from_address;
        if (data.email_from_name !== company.email_from_name) payload.email_from_name = data.email_from_name;
        return companiesApi.update(company.id, payload);
      } else {
        const payload = {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          city_code: data.city_code || undefined,
          state: data.state || undefined,
          state_code: data.state_code || undefined,
          email_from_address: data.email_from_address || undefined,
          email_from_name: data.email_from_name || undefined,
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

        {/* Email Sender Customization (Resend) */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Configuración de Correo Remitente (Resend)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email From Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Remitente
              </label>
              <input
                type="text"
                {...register('email_from_address')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email_from_address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="notificaciones@tudominio.com"
              />
              <p className="text-gray-400 text-[11px] mt-1 leading-normal">
                Debe pertenecer a tu dominio verificado en Resend. Si se deja vacío, usará el correo global.
              </p>
              {errors.email_from_address && <p className="text-red-500 text-xs mt-1">{errors.email_from_address.message}</p>}
            </div>

            {/* Email From Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Remitente
              </label>
              <input
                type="text"
                {...register('email_from_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Nombre Empresa"
              />
              <p className="text-gray-400 text-[11px] mt-1 leading-normal">
                Nombre que verán los destinatarios (ej: "Heladería La Coquera").
              </p>
            </div>
          </div>
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
