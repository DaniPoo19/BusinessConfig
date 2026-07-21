// ============================================
// Promotions API Service for BusinessConfig
// CRUD and bulk import for promotions via /api/v1/promotions
// ============================================

import { fetchWithAuth } from './authApi';
import { env as environment } from '../config/environment';
import type {
  Promotion,
  CreatePromotionRequest,
  PromotionsImportResult,
} from '../types/promotion';

const API = environment.apiUrl;

export const promotionsApi = {
  /**
   * Fetch all promotions, optionally filtered by sale_point_id
   */
  async getAll(salePointId?: string): Promise<Promotion[]> {
    const url = `${API}/api/v1/promotions${
      salePointId ? `?sale_point_id=${encodeURIComponent(salePointId)}` : ''
    }`;

    const res = await fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener las promociones');
    }

    const json = await res.json();
    return json.data || json.promotions || [];
  },

  /**
   * Create a single promotion
   */
  async create(promo: CreatePromotionRequest): Promise<Promotion> {
    const res = await fetchWithAuth(`${API}/api/v1/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promo),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear la promoción');
    }

    const json = await res.json();
    return json.data || json;
  },

  /**
   * Import all promotions from a source sale point to a target sale point.
   * Clones each promotion definition targeting the target sale point scope.
   */
  async importPromotions(
    sourceSalePointId: string,
    _targetCompanyId: string,
    targetSalePointId: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<PromotionsImportResult> {
    // 1. Fetch promotions from source sale point
    const sourcePromos = await this.getAll(sourceSalePointId);
    if (sourcePromos.length === 0) {
      throw new Error('No hay promociones en la sucursal de origen');
    }

    const result: PromotionsImportResult = {
      total: sourcePromos.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // 2. Clone each promotion targeting the target sale point
    for (let i = 0; i < sourcePromos.length; i++) {
      const src = sourcePromos[i];
      try {
        const createReq: CreatePromotionRequest = {
          sale_point_id: targetSalePointId,
          name: src.name,
          description: src.description || '',
          type: src.type,
          rules: src.rules || {},
          scope: src.scope || { applies_to: 'ALL_PRODUCTS' },
          schedule: src.schedule,
          priority: src.priority ?? 1,
          is_active: src.is_active ?? true,
          is_stackable: src.is_stackable ?? false,
          max_uses: src.max_uses,
          start_date: src.start_date,
          end_date: src.end_date,
        };

        await this.create(createReq);
        result.successful++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `${src.name}: ${err instanceof Error ? err.message : 'Error al copiar'}`
        );
      }

      onProgress?.(i + 1, sourcePromos.length);
    }

    return result;
  },
};
