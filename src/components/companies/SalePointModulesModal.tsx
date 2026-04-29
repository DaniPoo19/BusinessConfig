import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, toast } from '../ui';
import { parametersApi } from '../../services/parametersApi';
import type { Parameter } from '../../types/company';
import {
  MODULE_CATALOG,
  DEFAULT_MODULES_NEW,
  ENABLED_MODULES_KEY,
  type ModuleId,
  type EnabledModulesValue,
  type ModuleConfig,
} from '../../types/modules';

interface SalePointModulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  salePointId: string;
  salePointName: string;
  planModules: string[]; // Modules included in the active subscription
}

export function SalePointModulesModal({
  isOpen,
  onClose,
  companyId,
  salePointId,
  salePointName,
  planModules,
}: SalePointModulesModalProps) {
  const [modules, setModules] = useState<Record<ModuleId, ModuleConfig>>(
    DEFAULT_MODULES_NEW.modules
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paramExists, setParamExists] = useState(false);

  // Load current module config
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    try {
      // Read specific for sale point.
      const param: Parameter | null = await parametersApi.getByKey(
        ENABLED_MODULES_KEY,
        companyId,
        salePointId
      );
      
      let currentModules = { ...DEFAULT_MODULES_NEW.modules };
      
      if (param && param.sale_point_id === salePointId) {
        // Param exists exactly for this sale point
        const value = param.value as unknown as EnabledModulesValue;
        if (value?.modules) {
          for (const [key, config] of Object.entries(value.modules)) {
            if (key in currentModules) {
              currentModules[key as ModuleId] = config as ModuleConfig;
            }
          }
        }
        setParamExists(true);
      } else {
        // Fallback to default
        setParamExists(false);
      }

      // Enforce plan modules are enabled
      const now = new Date().toISOString();
      for (const modId of planModules) {
        if (modId in currentModules) {
          if (!currentModules[modId as ModuleId].enabled) {
            currentModules[modId as ModuleId] = { enabled: true, activated_at: now };
          }
        }
      }

      setModules(currentModules);
      
      // If we had to auto-enable plan modules and param exists, we should probably save it.
      // But for now, we just show it correctly.

    } catch (err) {
      console.error('Error loading modules:', err);
      toast.error('Error al cargar configuración de módulos');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, salePointId, planModules]);

  useEffect(() => {
    if (isOpen) {
      loadModules();
    }
  }, [isOpen, loadModules]);

  // Toggle a module and save immediately
  const handleToggle = async (moduleId: ModuleId) => {
    // Prevent toggling modules that are included in the plan
    if (planModules.includes(moduleId)) {
      toast.error('Este módulo está incluido en el plan y no puede desactivarse manualmente.');
      return;
    }

    const current = modules[moduleId];
    const newEnabled = !current.enabled;
    const now = new Date().toISOString();

    const updated: Record<ModuleId, ModuleConfig> = {
      ...modules,
      [moduleId]: {
        enabled: newEnabled,
        activated_at: newEnabled ? now : current.activated_at,
      },
    };

    setModules(updated);
    setIsSaving(true);

    try {
      const value: EnabledModulesValue = { modules: updated };

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
        setParamExists(true);
      }

      const label = MODULE_CATALOG.find(m => m.id === moduleId)?.label || moduleId;
      toast.success(`Módulo "${label}" ${newEnabled ? 'activado' : 'desactivado'}`);
    } catch (err) {
      // Rollback
      setModules(modules);
      console.error('Error saving modules:', err);
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Módulos de ${salePointName}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Activa o desactiva módulos extra para esta sucursal. Los módulos incluidos en el plan están fijos.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULE_CATALOG.map((mod) => {
              const config = modules[mod.id];
              const isEnabled = config?.enabled ?? false;
              const isIncludedInPlan = planModules.includes(mod.id);

              return (
                <div
                  key={mod.id}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                    ${isEnabled
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                    }
                    ${isIncludedInPlan ? 'opacity-80' : ''}
                  `}
                >
                  <span className="text-3xl flex-shrink-0">{mod.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{mod.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                    {isIncludedInPlan && (
                      <p className="text-[10px] text-primary-600 mt-1 font-medium">
                        Incluido en el plan
                      </p>
                    )}
                    {!isIncludedInPlan && isEnabled && config?.activated_at && (
                      <p className="text-[10px] text-green-600 mt-1 font-medium">
                        Extra activado: {new Date(config.activated_at).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggle(mod.id)}
                    disabled={isSaving || isIncludedInPlan}
                    className={`
                      relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${isEnabled
                        ? 'bg-green-500 focus:ring-green-400'
                        : 'bg-gray-300 focus:ring-gray-400'
                      }
                      ${isSaving || isIncludedInPlan ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm
                        transition-transform duration-200
                        ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
