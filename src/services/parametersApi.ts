// ============================================
// Parameters API Service
// GET/POST/PUT for parameters (business hours, delivery costs, etc.)
// ============================================

import { fetchWithAuth } from './authApi';
import { env as environment } from '../config/environment';
import type {
  Parameter,
  BusinessHoursValue,
  DeliveryCostValue,
  CreateParameterRequest,
  UpdateParameterRequest,
} from '../types/company';

const API = environment.apiUrl;

// ============================================
// Response types
// ============================================

interface ParameterApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedParameterResponse {
  data: Parameter[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// Parameters API
// ============================================

export const parametersApi = {
  /**
   * Get all parameters for a company+sale_point
   */
  async getAll(
    companyId: string,
    salePointId?: string,
    key?: string
  ): Promise<Parameter[]> {
    const params = new URLSearchParams();
    params.set('company_id', companyId);
    if (salePointId) params.set('sale_point_id', salePointId);
    if (key) params.set('key', key);
    params.set('limit', '100');

    const res = await fetch(`${API}/api/v1/parameters?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar parámetros');
    const json: PaginatedParameterResponse = await res.json();
    return json.data || [];
  },

  /**
   * Get a specific parameter by key with fallback (sale_point → company → global)
   */
  async getByKey(
    key: string,
    companyId?: string,
    salePointId?: string
  ): Promise<Parameter | null> {
    const params = new URLSearchParams();
    if (companyId) params.set('company_id', companyId);
    if (salePointId) params.set('sale_point_id', salePointId);

    const res = await fetch(
      `${API}/api/v1/parameters/${encodeURIComponent(key)}?${params.toString()}`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Error al cargar parámetro ${key}`);
    const json: ParameterApiResponse<Parameter> = await res.json();
    return json.data;
  },

  /**
   * Get business hours for a sale point
   */
  async getBusinessHours(
    companyId: string,
    salePointId: string
  ): Promise<Parameter<BusinessHoursValue> | null> {
    return this.getByKey('BUSINESS_HOURS', companyId, salePointId) as Promise<Parameter<BusinessHoursValue> | null>;
  },

  /**
   * Get delivery costs (barrios) for a sale point
   */
  async getDeliveryCosts(
    companyId: string,
    salePointId: string
  ): Promise<Parameter<DeliveryCostValue> | null> {
    return this.getByKey('DELIVERY_COST', companyId, salePointId) as Promise<Parameter<DeliveryCostValue> | null>;
  },

  /**
   * Create a new parameter
   */
  async create(data: CreateParameterRequest): Promise<Parameter> {
    const res = await fetchWithAuth(`${API}/api/v1/parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear parámetro');
    }
    const json: ParameterApiResponse<Parameter> = await res.json();
    return json.data;
  },

  /**
   * Update an existing parameter
   */
  async update(key: string, data: UpdateParameterRequest): Promise<Parameter> {
    const res = await fetchWithAuth(
      `${API}/api/v1/parameters/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar parámetro');
    }
    const json: ParameterApiResponse<Parameter> = await res.json();
    return json.data;
  },

  /**
   * Import a parameter from one sale point to another.
   * Reads from source, then uses "update-first, create-fallback" pattern
   * to handle both new and existing parameters at the target scope.
   */
  async importParameter(
    key: string,
    sourceCompanyId: string,
    sourceSalePointId: string,
    targetCompanyId: string,
    targetSalePointId: string
  ): Promise<void> {
    // 1. Read from source (uses fallback: sale_point → company → global)
    const source = await this.getByKey(key, sourceCompanyId, sourceSalePointId);
    if (!source) {
      throw new Error(`Parámetro "${key}" no encontrado en origen`);
    }

    const targetValue = source.value as Record<string, unknown>;

    // 2. Try UPDATE first — if the parameter already exists at the exact
    //    target scope (key + company_id + sale_point_id), this succeeds.
    const updateRes = await fetchWithAuth(
      `${API}/api/v1/parameters/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: targetCompanyId,
          sale_point_id: targetSalePointId,
          value: targetValue,
        }),
      }
    );

    if (updateRes.ok) return; // Updated successfully

    // 3. If UPDATE returned 404 (parameter doesn't exist at target scope),
    //    fall back to CREATE.
    if (updateRes.status === 404) {
      const createRes = await fetchWithAuth(`${API}/api/v1/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          company_id: targetCompanyId,
          sale_point_id: targetSalePointId,
          value: targetValue,
        }),
      });

      if (createRes.ok) return; // Created successfully

      // If CREATE fails with 409 (race condition: someone just created it),
      // retry UPDATE once.
      if (createRes.status === 409) {
        const retryRes = await fetchWithAuth(
          `${API}/api/v1/parameters/${encodeURIComponent(key)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_id: targetCompanyId,
              sale_point_id: targetSalePointId,
              value: targetValue,
            }),
          }
        );

        if (retryRes.ok) return;

        const err = await retryRes.json().catch(() => ({}));
        throw new Error(err.error || 'Error al importar parámetro (retry)');
      }

      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear parámetro en destino');
    }

    // 4. Any other error from UPDATE is unexpected
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar parámetro en destino');
  },
};
