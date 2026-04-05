// ============================================
// Admin API Service
// CRUD for companies and sale points via /api/v1/admin/*
// ============================================

import { fetchWithAuth } from './authApi';
import { env as environment } from '../config/environment';
import type {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  SalePoint,
  CreateSalePointRequest,
  UpdateSalePointRequest,
} from '../types/company';

const API = environment.apiUrl;

// ============================================
// Response types (match backend format)
// ============================================

interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface SuccessApiResponse<T> {
  data: T;
  message?: string;
}

interface SalePointListResponse {
  sale_points: SalePoint[];
  count: number;
}

// ============================================
// Companies API
// ============================================

export const companiesApi = {
  async getAll(limit = 50, offset = 0): Promise<{ companies: Company[]; total: number }> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/companies?limit=${limit}&offset=${offset}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar empresas');
    }
    const json: PaginatedApiResponse<Company> = await res.json();
    return { companies: json.data || [], total: json.total || 0 };
  },

  async getById(id: string): Promise<Company> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/companies/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Empresa no encontrada');
    }
    const json: SuccessApiResponse<Company> = await res.json();
    return json.data;
  },

  async create(data: CreateCompanyRequest): Promise<Company> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear empresa');
    }
    const json: SuccessApiResponse<Company> = await res.json();
    return json.data;
  },

  async update(id: string, data: UpdateCompanyRequest): Promise<Company> {
    const res = await fetchWithAuth(`${API}/api/v1/admin/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar empresa');
    }
    const json: SuccessApiResponse<Company> = await res.json();
    return json.data;
  },
};

// ============================================
// Sale Points API (admin)
// ============================================

export const salePointsApi = {
  async getByCompany(companyId: string): Promise<{ salePoints: SalePoint[]; count: number }> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/companies/${companyId}/sale-points`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar sucursales');
    }
    const json: SalePointListResponse = await res.json();
    return { salePoints: json.sale_points || [], count: json.count || 0 };
  },

  async create(companyId: string, data: CreateSalePointRequest): Promise<SalePoint> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/companies/${companyId}/sale-points`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear sucursal');
    }
    const json: SuccessApiResponse<SalePoint> = await res.json();
    return json.data;
  },

  async update(salePointId: string, data: UpdateSalePointRequest): Promise<SalePoint> {
    const res = await fetchWithAuth(
      `${API}/api/v1/admin/sale-points/${salePointId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar sucursal');
    }
    const json: SuccessApiResponse<SalePoint> = await res.json();
    return json.data;
  },
};

// ============================================
// Products API (public read for import)
// ============================================

export const productsApi = {
  async getBySalePoint(salePointId: string): Promise<Product[]> {
    const res = await fetch(
      `${API}/api/v1/products/sale-point/${salePointId}?full_details=true&limit=500`
    );
    if (!res.ok) throw new Error('Error al cargar productos');
    const json = await res.json();
    // The API may return { data: [...] } or { products: [...] }
    return json.data || json.products || [];
  },

  /**
   * Import all products from one sale point to another.
   * Fetches products from source, then creates each in the target scope.
   * Returns a result summary with counts and any errors.
   */
  async importProducts(
    sourceSalePointId: string,
    targetCompanyId: string,
    targetSalePointId: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<ProductImportResult> {
    // 1. Fetch all products from source
    const sourceProducts = await this.getBySalePoint(sourceSalePointId);
    if (sourceProducts.length === 0) {
      throw new Error('No hay productos en la sucursal de origen');
    }

    const result: ProductImportResult = {
      total: sourceProducts.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // 2. Create each product in the target sale point
    for (let i = 0; i < sourceProducts.length; i++) {
      const src = sourceProducts[i];
      try {
        const body = {
          company_id: targetCompanyId,
          sale_point_id: targetSalePointId,
          name: src.name,
          description: src.description || '',
          category: src.category,
          photos: src.photos || [],
          price_variations: src.price_variations || [],
          is_addon: false,
          is_available: src.is_available,
          is_unlimited_stock: src.is_unlimited_stock,
          stock: src.stock,
        };

        const res = await fetchWithAuth(`${API}/api/v1/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          result.successful++;
        } else {
          const err = await res.json().catch(() => ({}));
          result.failed++;
          result.errors.push(`${src.name}: ${err.error || 'Error desconocido'}`);
        }
      } catch (err) {
        result.failed++;
        result.errors.push(
          `${src.name}: ${err instanceof Error ? err.message : 'Error de red'}`
        );
      }

      onProgress?.(i + 1, sourceProducts.length);
    }

    return result;
  },

  /**
   * Import customization groups from one sale point to another.
   * For each product in source, finds a matching product in target by name
   * and replaces its customization_groups (injected into each price_variation).
   * Prices and variation types of the target product are preserved.
   */
  async importCustomizationGroups(
    sourceSalePointId: string,
    targetCompanyId: string,
    targetSalePointId: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<GroupsImportResult> {
    const [sourceProducts, targetProducts] = await Promise.all([
      this.getBySalePoint(sourceSalePointId),
      this.getBySalePoint(targetSalePointId),
    ]);

    if (sourceProducts.length === 0) {
      throw new Error('No hay productos en la sucursal de origen');
    }

    // Build a normalised name → product map for the target
    const targetByName = new Map<string, Product>();
    for (const tp of targetProducts) {
      targetByName.set(tp.name.trim().toLowerCase(), tp);
    }

    const result: GroupsImportResult = {
      total: sourceProducts.length,
      updated: 0,
      noMatch: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < sourceProducts.length; i++) {
      const src = sourceProducts[i];
      const targetProduct = targetByName.get(src.name.trim().toLowerCase());

      if (!targetProduct) {
        result.noMatch++;
        onProgress?.(i + 1, sourceProducts.length);
        continue;
      }

      // Build updated price_variations for the target product:
      // keep target's type/price/photo but apply source's customization_groups
      const srcGroups =
        src.price_variations?.[0]?.customization_groups ?? [];

      const updatedVariations = targetProduct.price_variations.map((pv) => ({
        ...pv,
        customization_groups: srcGroups,
      }));

      try {
        const res = await fetchWithAuth(`${API}/api/v1/products/${targetProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: targetCompanyId,
            sale_point_id: targetSalePointId,
            price_variations: updatedVariations,
          }),
        });

        if (res.ok) {
          result.updated++;
        } else {
          const err = await res.json().catch(() => ({}));
          result.failed++;
          result.errors.push(`${targetProduct.name}: ${err.error || 'Error desconocido'}`);
        }
      } catch (err) {
        result.failed++;
        result.errors.push(
          `${targetProduct.name}: ${err instanceof Error ? err.message : 'Error de red'}`
        );
      }

      onProgress?.(i + 1, sourceProducts.length);
    }

    return result;
  },
};

import type { Product, ProductImportResult, GroupsImportResult } from '../types/company';
