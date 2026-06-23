import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Settings, Edit2, Percent } from 'lucide-react';
import { Card, Button, Spinner, Modal, EmptyState } from '../components/ui';
import { toast } from '../components/ui/Toast';
import { usePlans, useUpdatePlanPrice, useUpdatePlanDiscount } from '../hooks';
import { formatCOP, PERIOD_LABELS } from '../types/subscription';
import type { SubscriptionPlan, PeriodType } from '../types/subscription';

export function PlansConfigPage() {
  const { data: plans = [], isLoading } = usePlans(false);

  // Modal states
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<{ plan: SubscriptionPlan, periodType: PeriodType, currentPct: number } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Settings className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Planes</h1>
          <p className="text-sm text-gray-500">
            Gestiona los precios base y descuentos por defecto de los planes de suscripción.
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={<Settings className="h-8 w-8 text-gray-400" />}
          title="No hay planes configurados"
          description="Actualmente no hay planes de suscripción en la base de datos."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEditPrice={() => setEditingPlan(plan)}
              onEditDiscount={(pt, pct) => setEditingDiscount({ plan, periodType: pt, currentPct: pct })}
            />
          ))}
        </div>
      )}

      {editingPlan && (
        <EditPriceModal
          isOpen={true}
          onClose={() => setEditingPlan(null)}
          plan={editingPlan}
        />
      )}

      {editingDiscount && (
        <EditDiscountModal
          isOpen={true}
          onClose={() => setEditingDiscount(null)}
          plan={editingDiscount.plan}
          periodType={editingDiscount.periodType}
          currentPct={editingDiscount.currentPct}
        />
      )}
    </motion.div>
  );
}

// ============================================
// Plan Card Component
// ============================================

function PlanCard({
  plan,
  onEditPrice,
  onEditDiscount,
}: {
  plan: SubscriptionPlan;
  onEditPrice: () => void;
  onEditDiscount: (pt: PeriodType, pct: number) => void;
}) {
  return (
    <Card className="flex flex-col h-full border-2 hover:border-primary-200 transition-all">
      <div className="flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {plan.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Precio Base (Mensual)</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{formatCOP(plan.base_price_monthly)}</span>
            <button onClick={onEditPrice} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descuentos por Periodo</p>
          
          {(['6_months', 'annual'] as PeriodType[]).map((pt) => {
            const d = plan.period_discounts?.find(pd => pd.period_type === pt);
            const pct = d ? d.discount_percentage : 0;
            return (
              <div key={pt} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{PERIOD_LABELS[pt]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${pct > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {pct}%
                  </span>
                  <button onClick={() => onEditDiscount(pt, pct)} className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors">
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Edit Price Modal
// ============================================

const editPriceSchema = z.object({
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
});

type EditPriceFormValues = z.infer<typeof editPriceSchema>;

function EditPriceModal({ isOpen, onClose, plan }: { isOpen: boolean; onClose: () => void; plan: SubscriptionPlan }) {
  const updatePriceMutation = useUpdatePlanPrice();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditPriceFormValues>({
    resolver: zodResolver(editPriceSchema),
    defaultValues: {
      price: plan.base_price_monthly,
    },
  });

  const onSubmit = async (data: EditPriceFormValues) => {
    try {
      await updatePriceMutation.mutateAsync({
        id: plan.id,
        basePriceMonthly: data.price,
      });
      toast.success('Precio base actualizado');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar precio');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Precio Base">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">Modificando el precio base mensual por defecto del plan <strong>{plan.name}</strong>.</p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mensual (COP)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              {...register('price', { valueAsNumber: true })}
              className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.price ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.price && (
            <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Este cambio <strong>no afectará</strong> a las empresas que ya tienen una suscripción activa con un precio fijado. Solo aplica para nuevas suscripciones que no usen un precio personalizado.
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Precio'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// Edit Discount Modal
// ============================================

const editDiscountSchema = z.object({
  pct: z.number()
  .min(0, 'El descuento mínimo es 0%')
  .max(100, 'El descuento máximo es 100%'),
});

type EditDiscountFormValues = z.infer<typeof editDiscountSchema>;

function EditDiscountModal({ isOpen, onClose, plan, periodType, currentPct }: { isOpen: boolean; onClose: () => void; plan: SubscriptionPlan; periodType: PeriodType; currentPct: number }) {
  const updateDiscountMutation = useUpdatePlanDiscount();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditDiscountFormValues>({
    resolver: zodResolver(editDiscountSchema),
    defaultValues: {
      pct: currentPct,
    },
  });

  const onSubmit = async (data: EditDiscountFormValues) => {
    try {
      await updateDiscountMutation.mutateAsync({
        planId: plan.id,
        periodType,
        discountPercentage: data.pct,
      });
      toast.success('Descuento actualizado');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar descuento');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Descuento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">
          Descuento para <strong>{plan.name}</strong> en el periodo <strong>{PERIOD_LABELS[periodType]}</strong>.
        </p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de Descuento (%)</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              {...register('pct', { valueAsNumber: true })}
              className={`w-full pr-8 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.pct ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
          </div>
          {errors.pct && (
            <p className="text-xs text-red-500 mt-1">{errors.pct.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Descuento'}</Button>
        </div>
      </form>
    </Modal>
  );
}

