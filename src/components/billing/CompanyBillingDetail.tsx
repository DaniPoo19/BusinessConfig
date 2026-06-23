import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, CreditCard, Crown, Clock, Zap, CheckCircle, XCircle,
  History, Plus, Trash2, RefreshCw, AlertTriangle, Store, Banknote
} from 'lucide-react';
import { Card, CardHeader, Spinner, Button, Modal } from '../ui';
import { toast } from '../ui/Toast';
import {
  STATUS_CONFIG, PERIOD_LABELS, formatCOP, calcFinalPrice,
} from '../../types/subscription';
import type {
  Subscription, SubscriptionPlan, PeriodType,
} from '../../types/subscription';


import { parametersApi } from '../../services/parametersApi';
import { ENABLED_MODULES_KEY, DEFAULT_MODULES_NEW } from '../../types/modules';
import type { ModuleId, ModuleConfig, EnabledModulesValue } from '../../types/modules';
import { SalePointModulesModal } from '../companies/SalePointModulesModal';
import {
  useCompanies,
  usePlans,
  usePaymentMethods,
  useCompanyPaymentMethods,
  useCompanySubscriptions,
  useSalePoints,
  useSubscriptionHistory,
  useActivateSubscription,
  useRecordPayment,
  useCancelSubscription,
  useCreateSubscription,
  useChangePlan,
  useAddPaymentMethod,
  useRemovePaymentMethod,
} from '../../hooks';

// Helper to sync modules automatically
async function syncModulesForSalePoint(companyId: string, salePointId: string, planModules: { slug: string }[]) {
  try {
    const param = await parametersApi.getByKey(ENABLED_MODULES_KEY, companyId, salePointId);
    let currentModules = { ...DEFAULT_MODULES_NEW.modules };
    let paramExists = false;

    if (param && param.sale_point_id === salePointId) {
      const value = param.value as unknown as EnabledModulesValue;
      if (value?.modules) {
        for (const [key, config] of Object.entries(value.modules)) {
          if (key in currentModules) {
            currentModules[key as ModuleId] = config as ModuleConfig;
          }
        }
      }
      paramExists = true;
    }

    const now = new Date().toISOString();
    let updated = false;

    // Enable plan modules
    for (const mod of planModules) {
      const modId = mod.slug as ModuleId;
      if (modId in currentModules && !currentModules[modId].enabled) {
        currentModules[modId] = { enabled: true, activated_at: now };
        updated = true;
      }
    }

    if (updated || !paramExists) {
      const value: EnabledModulesValue = { modules: currentModules };
      if (paramExists) {
        await parametersApi.update(ENABLED_MODULES_KEY, {
          company_id: companyId,
          sale_point_id: salePointId,
          value: value as unknown as Record<string, unknown>,
        });
      } else {
        await parametersApi.create({
          key: ENABLED_MODULES_KEY,
          company_id: companyId,
          sale_point_id: salePointId,
          value: value as unknown as Record<string, unknown>,
        });
      }
    }
  } catch (err) {
    console.error('Error syncing modules:', err);
  }
}

interface Props {
  companyId: string;
  onBack: () => void;
}

export function CompanyBillingDetail({ companyId, onBack }: Props) {
  // Modal states
  const [createModalSpId, setCreateModalSpId] = useState<string | null>(null);
  const [changePlanSub, setChangePlanSub] = useState<Subscription | null>(null);
  const [modulesModalSp, setModulesModalSp] = useState<{ id: string, name: string, planModules: string[] } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
  } | null>(null);

  // TanStack Query Hooks
  const { companies = [], isLoading: loadingComps, refetch: refetchComps } = useCompanies();
  const { salePoints = [], isLoading: loadingSP, refetch: refetchSP } = useSalePoints(companyId);
  const { data: subscriptions = [], isLoading: loadingSubs, refetch: refetchSubs } = useCompanySubscriptions(companyId);
  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans } = usePlans(true);
  const { data: allPaymentMethods = [], isLoading: loadingAllPM } = usePaymentMethods();
  const { data: companyPaymentMethods = [], isLoading: loadingCPM, refetch: refetchCPM } = useCompanyPaymentMethods(companyId);

  // Mutations
  const activateMutation = useActivateSubscription();
  const recordPaymentMutation = useRecordPayment();
  const cancelMutation = useCancelSubscription();
  const addPMMutation = useAddPaymentMethod();
  const removePMMutation = useRemovePaymentMethod();

  const company = companies.find((c) => c.id === companyId);
  const isLoading = loadingComps || loadingSP || loadingSubs || loadingPlans || loadingAllPM || loadingCPM;

  const handleRefresh = () => {
    refetchComps();
    refetchSP();
    refetchSubs();
    refetchPlans();
    refetchCPM();
  };

  const handleActivate = async (subId: string) => {
    try {
      await activateMutation.mutateAsync(subId);
      toast.success('Suscripción activada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al activar');
    }
  };

  const handleRecordPayment = (subId: string) => {
    setConfirmModal({
      title: 'Registrar Pago',
      message: '¿Registrar pago para esta sucursal? Se extenderá la fecha de vencimiento.',
      onConfirm: async () => {
        try {
          await recordPaymentMutation.mutateAsync(subId);
          toast.success('Pago registrado y fechas actualizadas');
        } catch (err: any) {
          toast.error(err.message || 'Error al registrar pago');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleCancel = (subId: string) => {
    setConfirmModal({
      title: 'Cancelar Suscripción',
      message: '¿Estás seguro de que deseas cancelar esta suscripción?',
      onConfirm: async () => {
        try {
          await cancelMutation.mutateAsync(subId);
          toast.success('Suscripción cancelada');
        } catch (err: any) {
          toast.error(err.message || 'Error al cancelar');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleAddPaymentMethod = async (pmId: string) => {
    try {
      await addPMMutation.mutateAsync({ companyId, paymentMethodId: pmId });
      toast.success('Método de pago agregado');
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar método');
    }
  };

  const handleRemovePaymentMethod = async (pmId: string) => {
    try {
      await removePMMutation.mutateAsync({ companyId, paymentMethodId: pmId });
      toast.success('Método de pago eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  const assignedPMIds = new Set(companyPaymentMethods.map((m) => m.payment_method_id));
  const availablePMs = allPaymentMethods.filter((m) => !assignedPMIds.has(m.id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Volver
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{company?.name || 'Empresa'}</h2>
          <p className="text-sm text-gray-500">{company?.email}</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={handleRefresh} className="ml-auto">
          Actualizar
        </Button>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 px-1 border-b border-gray-200 pb-2">Sucursales (Puntos de Venta)</h3>
        
        {salePoints.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
            <Store className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h4 className="text-gray-900 font-semibold mb-1">Sin sucursales</h4>
            <p className="text-gray-500 text-sm">Esta empresa aún no tiene sucursales registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {salePoints.map((sp) => {
              const sub = subscriptions.find(s => s.sale_point_id === sp.id);
              const statusCfg = sub ? (STATUS_CONFIG[sub.status] || STATUS_CONFIG.expired) : null;

              return (
                <Card key={sp.id} className="overflow-hidden border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary-500" />
                        {sp.name}
                      </h4>
                      <p className="text-sm text-gray-500 font-mono mt-0.5">{sp.id}</p>
                    </div>
                    {sub ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Banknote className="h-4 w-4" />}
                          onClick={() => handleRecordPayment(sub.id)}
                          disabled={recordPaymentMutation.isPending}
                        >
                          {recordPaymentMutation.isPending && recordPaymentMutation.variables === sub.id ? 'Registrando...' : 'Registrar Pago'}
                        </Button>
                        {sub.status === 'trial' && (
                          <Button
                            size="sm"
                            icon={<CheckCircle className="h-4 w-4" />}
                            onClick={() => handleActivate(sub.id)}
                            disabled={activateMutation.isPending}
                          >
                            {activateMutation.isPending && activateMutation.variables === sub.id ? 'Activando...' : 'Activar'}
                          </Button>
                        )}
                        {(sub.status === 'trial' || sub.status === 'active') && (
                          <>
                            <Button variant="secondary" size="sm" icon={<Zap className="h-4 w-4" />} onClick={() => setChangePlanSub(sub)}>
                              Cambiar Plan
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<XCircle className="h-4 w-4" />}
                              onClick={() => handleCancel(sub.id)}
                              disabled={cancelMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {sub && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            icon={<Zap className="h-4 w-4" />} 
                            onClick={() => {
                              const spPlan = plans.find(p => p.id === sub.plan_id);
                              const planModules = spPlan ? spPlan.modules.map(m => m.slug) : [];
                              setModulesModalSp({ id: sp.id, name: sp.name, planModules });
                            }}
                          >
                            Módulos
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalSpId(sp.id)}>
                        Crear Suscripción
                      </Button>
                    )}
                  </div>

                  <div className="p-6">
                    {!sub ? (
                      <div className="text-center py-6 text-gray-500 flex flex-col items-center">
                        <CreditCard className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-sm">Esta sucursal no tiene un plan activo.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InfoBlock label="Plan" value={sub.plan_name || '—'} icon={<Crown className="h-4 w-4 text-primary-500" />} />
                          <InfoBlock label="Estado" value={statusCfg!.label} icon={<span className={`inline-block h-2.5 w-2.5 rounded-full ${sub.status === 'active' ? 'bg-emerald-400' : sub.status === 'trial' ? 'bg-amber-400' : 'bg-gray-400'}`} />} />
                          <InfoBlock label="Precio Final" value={formatCOP(sub.final_price)} icon={<CreditCard className="h-4 w-4 text-emerald-500" />} />
                          <InfoBlock label="Periodo" value={PERIOD_LABELS[sub.period_type] || sub.period_type} icon={<Clock className="h-4 w-4 text-accent-500" />} />
                        </div>

                        {/* Plan Modules display */}
                        {plans.find(p => p.id === sub.plan_id)?.modules && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {plans.find(p => p.id === sub.plan_id)!.modules.map(mod => (
                              <span key={mod.id} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-md border border-primary-100 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
                                {mod.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {sub.discount_applied > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700">
                            Descuento aplicado: <strong>{sub.discount_applied}%</strong> — Precio base: {formatCOP(sub.base_price)}
                          </div>
                        )}

                        {sub.status === 'trial' && sub.trial_ends_at && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-amber-800">Periodo de prueba (Pendiente Primer Pago)</p>
                              <p className="text-xs text-amber-600">Finaliza el: {new Date(sub.trial_ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                          </div>
                        )}

                        {(sub.status === 'active' || sub.status === 'past_due') && sub.ends_at && (
                          <div className={`${sub.status === 'past_due' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg px-4 py-3 flex items-center gap-3`}>
                            <Clock className={`h-5 w-5 flex-shrink-0 ${sub.status === 'past_due' ? 'text-red-600' : 'text-blue-600'}`} />
                            <div>
                              <p className={`text-sm font-medium ${sub.status === 'past_due' ? 'text-red-800' : 'text-blue-800'}`}>Próximo corte de facturación</p>
                              <p className={`text-xs ${sub.status === 'past_due' ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
                                El próximo pago se debe realizar el: {new Date(sub.ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* History for this sub */}
                        <SubscriptionHistorySection subId={sub.id} />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader title="Métodos de Pago Globales (Empresa)" description="Métodos aceptados por esta empresa en todos sus puntos de venta" />
        {companyPaymentMethods.length > 0 && (
          <div className="space-y-2 mb-4">
            {companyPaymentMethods.map((cpm) => (
              <div key={cpm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cpm.payment_method_icon || '💳'}</span>
                  <span className="text-sm font-medium text-gray-900">{cpm.payment_method_name}</span>
                </div>
                <button
                  onClick={() => handleRemovePaymentMethod(cpm.payment_method_id)}
                  disabled={removePMMutation.isPending}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {availablePMs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Agregar método</p>
            <div className="flex flex-wrap gap-2">
              {availablePMs.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => handleAddPaymentMethod(pm.id)}
                  disabled={addPMMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/30 transition-all disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{pm.icon}</span> {pm.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {companyPaymentMethods.length === 0 && availablePMs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">No hay métodos de pago disponibles</p>
        )}
      </Card>

      {/* Confirm Modal */}
      {confirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancelar</Button>
              <Button onClick={confirmModal.onConfirm}>Confirmar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      {createModalSpId && (
        <CreateSubscriptionModal 
          isOpen={true} 
          onClose={() => setCreateModalSpId(null)} 
          companyId={companyId} 
          salePointId={createModalSpId}
          plans={plans} 
        />
      )}
      {/* Change Plan Modal */}
      {changePlanSub && (
        <ChangePlanModal 
          isOpen={true} 
          onClose={() => setChangePlanSub(null)} 
          subscription={changePlanSub} 
          plans={plans.filter((p) => p.id !== changePlanSub.plan_id)} 
        />
      )}
      {/* Modules Modal */}
      {modulesModalSp && (
        <SalePointModulesModal
          isOpen={true}
          onClose={() => setModulesModalSp(null)}
          companyId={companyId}
          salePointId={modulesModalSp.id}
          salePointName={modulesModalSp.name}
          planModules={modulesModalSp.planModules}
        />
      )}
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function InfoBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// ============================================
// Subscription History Subcomponent
// ============================================

function SubscriptionHistorySection({ subId }: { subId: string }) {
  const { data: history = [], isLoading } = useSubscriptionHistory(subId);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-2">Cargando historial...</div>;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
        <History className="h-3 w-3" /> Historial
      </h5>
      <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
            <div>
              <span className="font-medium text-gray-700 capitalize">{h.event_type.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-400 ml-2">por {h.performed_by || 'Sistema'}</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(h.created_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Create Subscription Modal
// ============================================

const createSubSchema = z.object({
  planId: z.string().min(1, 'Selecciona un plan'),
  periodType: z.enum(['monthly', '6_months', 'annual'] as const),
  useCustomPrice: z.boolean(),
  customPrice: z.number().min(0, 'El precio debe ser un número positivo').optional().or(z.nan()),
});

type CreateSubFormValues = z.infer<typeof createSubSchema>;

function CreateSubscriptionModal({ isOpen, onClose, companyId, salePointId, plans }: {
  isOpen: boolean; onClose: () => void; companyId: string; salePointId: string; plans: SubscriptionPlan[];
}) {
  const createSubMutation = useCreateSubscription();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<CreateSubFormValues>({
    resolver: zodResolver(createSubSchema),
    defaultValues: {
      planId: '',
      periodType: 'monthly',
      useCustomPrice: false,
      customPrice: undefined,
    },
  });

  const selectedPlan = watch('planId');
  const selectedPeriod = watch('periodType');
  const useCustomPrice = watch('useCustomPrice');
  const customPrice = watch('customPrice');

  const plan = plans.find((p) => p.id === selectedPlan);
  const discount = plan?.period_discounts?.find((d) => d.period_type === selectedPeriod);
  const discountPct = discount?.discount_percentage || 0;
  
  const parsedPrice = typeof customPrice === 'number' && !isNaN(customPrice) ? customPrice : 0;
  const basePrice = useCustomPrice ? parsedPrice : (plan?.base_price_monthly || 0);
  const finalPrice = plan ? calcFinalPrice(basePrice, discountPct) : 0;

  const onSubmit = async (data: CreateSubFormValues) => {
    if (!data.planId) return toast.error('Selecciona un plan');
    try {
      const override = data.useCustomPrice && typeof data.customPrice === 'number' && !isNaN(data.customPrice)
        ? data.customPrice
        : undefined;

      await createSubMutation.mutateAsync({
        companyId,
        salePointId,
        planId: data.planId,
        periodType: data.periodType,
        overridePrice: override,
      });
      
      if (plan && plan.modules) {
        await syncModulesForSalePoint(companyId, salePointId, plan.modules);
      }

      toast.success('Suscripción creada con 7 días de prueba');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear suscripción');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Suscripción para Sucursal" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
          <div className="grid grid-cols-1 gap-3">
            {plans.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setValue('planId', p.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === p.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                  <span className="font-bold text-primary-700">{formatCOP(p.base_price_monthly)}<span className="text-xs font-normal text-gray-500">/mes</span></span>
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Periodo</label>
          <div className="grid grid-cols-3 gap-2">
            {(['monthly', '6_months', 'annual'] as PeriodType[]).map((pt) => {
              const d = plan?.period_discounts?.find((dd) => dd.period_type === pt);
              return (
                <button
                  type="button"
                  key={pt}
                  onClick={() => setValue('periodType', pt)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${selectedPeriod === pt ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="block text-sm font-medium text-gray-900">{PERIOD_LABELS[pt]}</span>
                  {d && d.discount_percentage > 0 && <span className="block text-xs text-emerald-600 font-medium mt-0.5">-{d.discount_percentage}%</span>}
                </button>
              );
            })}
          </div>
        </div>

        {plan && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                <input type="checkbox" {...register('useCustomPrice')} className="rounded text-primary-600 focus:ring-primary-500" />
                Precio Base Personalizado
              </label>
              {useCustomPrice && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    {...register('customPrice', { valueAsNumber: true })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={`Precio base (Ej: ${plan.base_price_monthly})`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Este precio reemplazará al precio base del plan.</p>
                </div>
              )}
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Precio base</span>
              <span className={useCustomPrice ? 'font-bold text-primary-700' : 'font-medium'}>{formatCOP(basePrice)}</span>
            </div>
            {discountPct > 0 && <div className="flex justify-between text-sm mb-1"><span className="text-emerald-600">Descuento ({discountPct}%)</span><span className="text-emerald-600">-{formatCOP(basePrice - finalPrice)}</span></div>}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2"><span>Total mensual</span><span className="text-primary-700">{formatCOP(finalPrice)}</span></div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <strong>Nota:</strong> Se activará un periodo de prueba de 7 días.
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={!selectedPlan || isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear Suscripción'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// Change Plan Modal
// ============================================

const changePlanSchema = z.object({
  planId: z.string().min(1, 'Selecciona un plan'),
  useCustomPrice: z.boolean(),
  customPrice: z.number().min(0, 'El precio debe ser un número positivo').optional().or(z.nan()),
});

type ChangePlanFormValues = z.infer<typeof changePlanSchema>;

function ChangePlanModal({ isOpen, onClose, subscription, plans }: {
  isOpen: boolean; onClose: () => void; subscription: Subscription; plans: SubscriptionPlan[];
}) {
  const changePlanMutation = useChangePlan();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<ChangePlanFormValues>({
    resolver: zodResolver(changePlanSchema),
    defaultValues: {
      planId: '',
      useCustomPrice: false,
      customPrice: undefined,
    },
  });

  const selectedPlan = watch('planId');
  const useCustomPrice = watch('useCustomPrice');
  const customPrice = watch('customPrice');

  const plan = plans.find((p) => p.id === selectedPlan);
  const discountPct = subscription.discount_applied || 0;
  const parsedPrice = typeof customPrice === 'number' && !isNaN(customPrice) ? customPrice : 0;
  const basePrice = useCustomPrice ? parsedPrice : (plan?.base_price_monthly || 0);
  const finalPrice = plan ? calcFinalPrice(basePrice, discountPct) : 0;

  const onSubmit = async (data: ChangePlanFormValues) => {
    if (!data.planId) return toast.error('Selecciona un plan');
    try {
      const override = data.useCustomPrice && typeof data.customPrice === 'number' && !isNaN(data.customPrice)
        ? data.customPrice
        : undefined;

      await changePlanMutation.mutateAsync({
        id: subscription.id,
        newPlanId: data.planId,
        overridePrice: override,
      });
      
      if (plan && plan.modules) {
        await syncModulesForSalePoint(subscription.company_id, subscription.sale_point_id, plan.modules);
      }

      toast.success('Plan cambiado exitosamente');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar plan');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Plan">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">Plan actual: <strong>{subscription.plan_name}</strong></p>
        <div className="space-y-3">
          {plans.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setValue('planId', p.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === p.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex justify-between"><span className="font-semibold text-sm">{p.name}</span><span className="font-bold text-primary-700">{formatCOP(p.base_price_monthly)}/mes</span></div>
              <p className="text-xs text-gray-500 mt-1">{p.description}</p>
            </button>
          ))}
        </div>
        
        {plan && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-4">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                <input type="checkbox" {...register('useCustomPrice')} className="rounded text-primary-600 focus:ring-primary-500" />
                Precio Base Personalizado
              </label>
              {useCustomPrice && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    {...register('customPrice', { valueAsNumber: true })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={`Precio base (Ej: ${plan.base_price_monthly})`}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Nuevo precio base</span>
              <span className={useCustomPrice ? 'font-bold text-primary-700' : 'font-medium'}>{formatCOP(basePrice)}</span>
            </div>
            {discountPct > 0 && <div className="flex justify-between text-sm mb-1"><span className="text-emerald-600">Mantiene descuento ({discountPct}%)</span><span className="text-emerald-600">-{formatCOP(basePrice - finalPrice)}</span></div>}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2"><span>Nuevo total</span><span className="text-primary-700">{formatCOP(finalPrice)}</span></div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={!selectedPlan || isSubmitting}>{isSubmitting ? 'Cambiando...' : 'Cambiar Plan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
