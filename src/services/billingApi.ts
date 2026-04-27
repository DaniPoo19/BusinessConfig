// ============================================
// Billing / Subscription API Service
// CRUD for plans, subscriptions, and payment methods
// ============================================

import { fetchWithAuth } from './authApi';
import { env as environment } from '../config/environment';
import type {
  SubscriptionPlan,
  Subscription,
  SubscriptionHistory,
  CompanyRef,
  Module,
  PaymentMethod,
  CompanyPaymentMethod,
  PeriodType,
} from '../types/subscription';

const API = environment.apiUrl;

// ============================================
// Generic Response Types
// ============================================

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    total_pages: number;
    total_items: number;
    page_size: number;
  };
}

// ============================================
// Response Handler
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || `Error ${response.status}`);
  }
  return data.data as T;
}

async function handlePaginatedResponse<T>(response: Response): Promise<ApiPaginated<T>> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || `Error ${response.status}`);
  }
  return data as ApiPaginated<T>;
}

// ============================================
// Plans API
// ============================================

export const plansApi = {
  async list(activeOnly = true): Promise<SubscriptionPlan[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/plans?active_only=${activeOnly}`
    );
    return handleResponse<SubscriptionPlan[]>(res);
  },

  async getById(id: string): Promise<SubscriptionPlan> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/plans/${id}`);
    return handleResponse<SubscriptionPlan>(res);
  },

  async updatePrice(id: string, basePriceMonthly: number): Promise<void> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/plans/${id}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_price_monthly: basePriceMonthly }),
    });
    await handleResponse<null>(res);
  },

  async updateDiscount(
    planId: string,
    periodType: PeriodType,
    discountPercentage: number
  ): Promise<void> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/plans/${planId}/discounts/${periodType}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_percentage: discountPercentage }),
      }
    );
    await handleResponse<null>(res);
  },
};

// ============================================
// Modules API
// ============================================

export const modulesApi = {
  async list(): Promise<Module[]> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/modules`);
    return handleResponse<Module[]>(res);
  },
};

// ============================================
// Subscriptions API
// ============================================

export const subscriptionsApi = {
  async create(companyId: string, salePointId: string, planId: string, periodType: PeriodType, overridePrice?: number): Promise<Subscription> {
    const body: Record<string, any> = {
      company_id: companyId,
      sale_point_id: salePointId,
      plan_id: planId,
      period_type: periodType,
    };
    if (overridePrice !== undefined && overridePrice !== null) {
      body.override_price = overridePrice;
    }

    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<Subscription>(res);
  },

  async list(limit = 50, offset = 0): Promise<ApiPaginated<Subscription>> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions?limit=${limit}&offset=${offset}`
    );
    return handlePaginatedResponse<Subscription>(res);
  },

  async getById(id: string): Promise<Subscription> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/subscriptions/${id}`);
    return handleResponse<Subscription>(res);
  },

  async listByCompany(companyId: string): Promise<Subscription[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/company/${companyId}`
    );
    return handleResponse<Subscription[]>(res);
  },

  async recordPayment(id: string): Promise<Subscription> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/${id}/payments`,
      { method: 'POST' }
    );
    return handleResponse<Subscription>(res);
  },

  async activate(id: string): Promise<Subscription> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/${id}/activate`,
      { method: 'POST' }
    );
    return handleResponse<Subscription>(res);
  },

  async cancel(id: string): Promise<Subscription> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/${id}/cancel`,
      { method: 'POST' }
    );
    return handleResponse<Subscription>(res);
  },

  async changePlan(id: string, newPlanId: string, overridePrice?: number): Promise<Subscription> {
    const body: Record<string, any> = { new_plan_id: newPlanId };
    if (overridePrice !== undefined && overridePrice !== null) {
      body.override_price = overridePrice;
    }

    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/${id}/change-plan`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    return handleResponse<Subscription>(res);
  },

  async getHistory(id: string, limit = 20): Promise<SubscriptionHistory[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/subscriptions/${id}/history?limit=${limit}`
    );
    return handleResponse<SubscriptionHistory[]>(res);
  },
};

// ============================================
// Company Refs API
// ============================================

export const companyRefsApi = {
  async list(): Promise<CompanyRef[]> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/companies`);
    return handleResponse<CompanyRef[]>(res);
  },

  async sync(id: string, name: string, email: string): Promise<void> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/sync-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, email }),
    });
    await handleResponse<null>(res);
  },
};

// ============================================
// Payment Methods API
// ============================================

export const paymentMethodsApi = {
  async list(): Promise<PaymentMethod[]> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/billing/payment-methods`);
    return handleResponse<PaymentMethod[]>(res);
  },

  async setForCompany(
    companyId: string,
    paymentMethodId: string,
    config: Record<string, unknown> = {}
  ): Promise<void> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/companies/${companyId}/payment-methods`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId, config }),
      }
    );
    await handleResponse<null>(res);
  },

  async getForCompany(companyId: string): Promise<CompanyPaymentMethod[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/companies/${companyId}/payment-methods`
    );
    return handleResponse<CompanyPaymentMethod[]>(res);
  },

  async removeFromCompany(companyId: string, paymentMethodId: string): Promise<void> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/billing/companies/${companyId}/payment-methods/${paymentMethodId}`,
      { method: 'DELETE' }
    );
    await handleResponse<null>(res);
  },
};
