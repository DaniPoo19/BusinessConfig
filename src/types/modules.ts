// ============================================
// Module System Types & Catalog
// Defines the premium modules that can be toggled per company
// ============================================

export type ModuleId = 'kitchen' | 'delivery' | 'metrics' | 'inventory';

export interface ModuleConfig {
  enabled: boolean;
  activated_at: string | null;
}

export interface EnabledModulesValue {
  modules: Record<ModuleId, ModuleConfig>;
}

export interface ModuleCatalogEntry {
  id: ModuleId;
  label: string;
  description: string;
  icon: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { id: 'kitchen',   label: 'Cocina',     description: 'Monitor de preparación en tiempo real',  icon: '👨‍🍳' },
  { id: 'delivery',  label: 'Domicilios', description: 'Gestión de repartidores y entregas',     icon: '🛵' },
  { id: 'metrics',   label: 'Métricas',   description: 'Estadísticas y reportes de ventas',      icon: '📊' },
  { id: 'inventory', label: 'Inventario', description: 'Control de stock y materias primas',     icon: '📦' },
];

export const ALL_MODULE_IDS: ModuleId[] = ['kitchen', 'delivery', 'metrics', 'inventory'];

/** Default for NEW companies — all premium disabled */
export const DEFAULT_MODULES_NEW: EnabledModulesValue = {
  modules: {
    kitchen:   { enabled: false, activated_at: null },
    delivery:  { enabled: false, activated_at: null },
    metrics:   { enabled: false, activated_at: null },
    inventory: { enabled: false, activated_at: null },
  },
};

/** Default for EXISTING companies (no parameter yet) — all premium enabled (Option B) */
export const DEFAULT_MODULES_EXISTING: EnabledModulesValue = {
  modules: {
    kitchen:   { enabled: true,  activated_at: null },
    delivery:  { enabled: true,  activated_at: null },
    metrics:   { enabled: true,  activated_at: null },
    inventory: { enabled: true,  activated_at: null },
  },
};

export const ENABLED_MODULES_KEY = 'ENABLED_MODULES';
