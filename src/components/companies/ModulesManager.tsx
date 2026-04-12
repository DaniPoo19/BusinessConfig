// ============================================
// ModulesManager — Toggle UI for enabling/disabling premium modules
// Used inside CompanyDetail to manage per-company module access
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, toast } from '../ui';
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

interface ModulesManagerProps {
  companyId: string;
}

export function ModulesManager({ companyId }: ModulesManagerProps) {
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
      const param: Parameter | null = await parametersApi.getByKey(
        ENABLED_MODULES_KEY,
        companyId
      );
      if (param) {
        const value = param.value as unknown as EnabledModulesValue;
        if (value?.modules) {
          // Merge with defaults to handle any new modules added after initial setup
          const merged = { ...DEFAULT_MODULES_NEW.modules };
          for (const [key, config] of Object.entries(value.modules)) {
            if (key in merged) {
              merged[key as ModuleId] = config as ModuleConfig;
            }
          }
          setModules(merged);
        }
        setParamExists(true);
      } else {
        // No parameter yet — show defaults for new companies (all disabled)
        setModules(DEFAULT_MODULES_NEW.modules);
        setParamExists(false);
      }
    } catch (err) {
      console.error('Error loading modules:', err);
      toast.error('Error al cargar configuración de módulos');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Toggle a module and save immediately
  const handleToggle = async (moduleId: ModuleId) => {
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

    // Optimistic update
    setModules(updated);
    setIsSaving(true);

    try {
      const value: EnabledModulesValue = { modules: updated };

      if (paramExists) {
        await parametersApi.update(ENABLED_MODULES_KEY, {
          company_id: companyId,
          value: value as unknown as Record<string, unknown>,
        });
      } else {
        await parametersApi.create({
          key: ENABLED_MODULES_KEY,
          company_id: companyId,
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Módulos Contratados" />
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Módulos Contratados"
        description="Activa o desactiva módulos premium para esta empresa"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULE_CATALOG.map((mod) => {
          const config = modules[mod.id];
          const isEnabled = config?.enabled ?? false;

          return (
            <div
              key={mod.id}
              className={`
                relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                ${isEnabled
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-200 bg-gray-50/50'
                }
              `}
            >
              {/* Icon */}
              <span className="text-3xl flex-shrink-0">{mod.icon}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{mod.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                {isEnabled && config?.activated_at && (
                  <p className="text-[10px] text-green-600 mt-1 font-medium">
                    Activado: {new Date(config.activated_at).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(mod.id)}
                disabled={isSaving}
                className={`
                  relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isEnabled
                    ? 'bg-green-500 focus:ring-green-400'
                    : 'bg-gray-300 focus:ring-gray-400'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                aria-label={`${isEnabled ? 'Desactivar' : 'Activar'} ${mod.label}`}
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
    </Card>
  );
}
