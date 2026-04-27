// ============================================
// Subscription & Billing Types
// ============================================

export interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodDiscount {
  id: string;
  plan_id: string;
  period_type: PeriodType;
  period_months: number;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

export type PeriodType = 'monthly' | '6_months' | 'annual';

export const PERIOD_LABELS: Record<PeriodType, string> = {
  monthly: 'Mensual',
  '6_months': '6 Meses',
  annual: 'Anual',
};

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  base_price_monthly: number;
  is_active: boolean;
  sort_order: number;
  modules: Module[];
  period_discounts: PeriodDiscount[];
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

export const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bg: string }> = {
  trial: { label: 'Prueba', color: 'text-amber-700', bg: 'bg-amber-50' },
  active: { label: 'Activa', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  past_due: { label: 'Pago Pendiente', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: 'Cancelada', color: 'text-gray-700', bg: 'bg-gray-100' },
  expired: { label: 'Expirada', color: 'text-gray-500', bg: 'bg-gray-50' },
};

export interface Subscription {
  id: string;
  company_id: string;
  sale_point_id: string;
  plan_id: string;
  period_type: PeriodType;
  base_price: number;
  discount_applied: number;
  final_price: number;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  company_name?: string;
}

export interface SubscriptionHistory {
  id: string;
  subscription_id: string;
  event_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
}

export interface CompanyRef {
  id: string;
  name: string;
  email: string;
  synced_at: string;
}

export interface PaymentMethod {
  id: string;
  slug: string;
  name: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CompanyPaymentMethod {
  id: string;
  company_id: string;
  payment_method_id: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  payment_method_name?: string;
  payment_method_slug?: string;
  payment_method_icon?: string;
}

// ============================================
// Utility
// ============================================

/** Format COP price (e.g. 89900 → "$89.900") */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Calculate discounted price */
export function calcFinalPrice(basePrice: number, discountPct: number): number {
  if (discountPct <= 0) return basePrice;
  return Math.round(basePrice - basePrice * (discountPct / 100));
}
