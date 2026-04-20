// ============================================
// Inventory API Service
// CRUD for inventory items, warehouses, transactions
// and orchestrator for CSV bulk import
// ============================================

import { fetchWithAuth } from './authApi';
import { env as environment } from '../config/environment';
import type {
  InventoryItem,
  Warehouse,
  Product,
  InventoryImportResult,
} from '../types/company';
import type {
  InventoryCsvParseResult,
  ParsedProduct,
} from './inventoryCsvParser';

const API = environment.apiUrl;

// ============================================
// Inventory Items API
// ============================================

export const inventoryApi = {
  /** Get all inventory items for a company */
  async getItemsByCompany(companyId: string): Promise<InventoryItem[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/inventory/items/company/${companyId}?active=false`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar artículos de inventario');
    }
    const json = await res.json();
    return json.data || [];
  },

  /** Create a single inventory item */
  async createItem(req: {
    company_id: string;
    name: string;
    description?: string;
    sku?: string;
    unit_of_measure: string;
    category?: string;
    min_stock_alert?: number;
    cost_per_unit?: number;
  }): Promise<InventoryItem> {
    const res = await fetchWithAuth(`${API}/api/v1/inventory/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear artículo de inventario');
    }
    const json = await res.json();
    return json.data;
  },

  // ============================================
  // Warehouses API
  // ============================================

  /** Get warehouses for a sale point */
  async getWarehousesBySalePoint(salePointId: string): Promise<Warehouse[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/inventory/warehouses/sale-point/${salePointId}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar bodegas');
    }
    const json = await res.json();
    return json.data || [];
  },

  /** Get warehouses for a company */
  async getWarehousesByCompany(companyId: string): Promise<Warehouse[]> {
    const res = await fetchWithAuth(
      `${API}/api/v1/inventory/warehouses/company/${companyId}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar bodegas');
    }
    const json = await res.json();
    return json.data || [];
  },

  /** Create a warehouse */
  async createWarehouse(req: {
    company_id: string;
    sale_point_id: string;
    name: string;
    description?: string;
    is_default: boolean;
  }): Promise<Warehouse> {
    const res = await fetchWithAuth(`${API}/api/v1/inventory/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear bodega');
    }
    const json = await res.json();
    return json.data;
  },

  // ============================================
  // Transactions API
  // ============================================

  /** Register a stock transaction (ENTRY/EXIT/ADJUSTMENT) */
  async registerTransaction(req: {
    company_id: string;
    warehouse_id: string;
    item_id: string;
    type: string;
    quantity: number;
    reason: string;
    reference_id?: string;
    notes?: string;
    performed_by?: string;
  }): Promise<void> {
    const res = await fetchWithAuth(`${API}/api/v1/inventory/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar transacción');
    }
  },

  // ============================================
  // Products API (read & update for BOM linking)
  // ============================================

  /** Get all products for a sale point */
  async getProductsBySalePoint(salePointId: string): Promise<Product[]> {
    const res = await fetch(
      `${API}/api/v1/products/sale-point/${salePointId}?full_details=true&limit=500`
    );
    if (!res.ok) throw new Error('Error al cargar productos');
    const json = await res.json();
    return json.data || json.products || [];
  },

  /** Create a new product */
  async createProduct(body: Record<string, unknown>): Promise<Product> {
    const res = await fetchWithAuth(`${API}/api/v1/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear producto');
    }
    const json = await res.json();
    return json.data;
  },

  /** Update a product (to link BOM recipes) */
  async updateProduct(productId: string, body: Record<string, unknown>): Promise<void> {
    const res = await fetchWithAuth(`${API}/api/v1/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar producto');
    }
  },

  // ============================================
  // Orchestrator: Full CSV Import
  // ============================================

  /**
   * Import inventory from parsed CSV data.
   * Flow:
   *  1. Find or create default warehouse
   *  2. Fetch existing inventory items → build name→id map
   *  3. Create new inventory items
   *  4. Register initial stock for items with stock > 0
   *  5. Fetch existing products → build name→product map
   *  6. Create new products
   *  7. Update all products with base_ingredients (BOM)
   */
  async importFromCsv(
    parseResult: InventoryCsvParseResult,
    companyId: string,
    salePointId: string,
    onProgress?: (phase: string, done: number, total: number) => void
  ): Promise<InventoryImportResult> {
    const result: InventoryImportResult = {
      itemsCreated: 0,
      itemsReused: 0,
      stockRegistered: 0,
      productsCreated: 0,
      productsUpdated: 0,
      recipesLinked: 0,
      failed: 0,
      errors: [],
    };

    // ========== Phase 0: Find/create warehouse ==========
    onProgress?.('Buscando bodega...', 0, 1);
    let warehouseId: string;
    try {
      warehouseId = await this.findOrCreateWarehouse(companyId, salePointId);
    } catch (err) {
      result.errors.push(`Bodega: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      result.failed++;
      return result;
    }

    // ========== Phase 1: Create inventory items ==========
    const itemNameToId = new Map<string, string>(); // normalised name → item ID

    // First, fetch existing items
    try {
      const existingItems = await this.getItemsByCompany(companyId);
      for (const item of existingItems) {
        itemNameToId.set(item.name.trim().toLowerCase(), item.id);
      }
    } catch {
      // If we can't fetch, we'll create everything fresh
    }

    const newItems = parseResult.inventoryItems;
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      onProgress?.('Creando artículos de inventario...', i + 1, newItems.length);

      if (itemNameToId.has(item.nameKey)) {
        result.itemsReused++;
        continue;
      }

      try {
        // Generate a unique SKU from the item name to avoid duplicate SKU constraint
        const skuBase = item.name
          .toUpperCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/[^A-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 20);
        const skuSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        const sku = `${skuBase}-${skuSuffix}`;

        const created = await this.createItem({
          company_id: companyId,
          name: item.name,
          sku,
          unit_of_measure: item.unit,
          category: item.category || undefined,
          cost_per_unit: item.costPerUnit || undefined,
          min_stock_alert: item.minStockAlert || undefined,
        });
        itemNameToId.set(item.nameKey, created.id);
        result.itemsCreated++;
      } catch (err) {
        result.failed++;
        result.errors.push(`Item "${item.name}": ${err instanceof Error ? err.message : 'Error'}`);
      }
    }

    // ========== Phase 2: Register initial stock ==========
    const stockItems = newItems.filter((item) => item.initialStock > 0);
    for (let i = 0; i < stockItems.length; i++) {
      const item = stockItems[i];
      onProgress?.('Registrando stock inicial...', i + 1, stockItems.length);

      const itemId = itemNameToId.get(item.nameKey);
      if (!itemId) continue;

      try {
        await this.registerTransaction({
          company_id: companyId,
          warehouse_id: warehouseId,
          item_id: itemId,
          type: 'ENTRY',
          quantity: item.initialStock,
          reason: 'INITIAL_STOCK',
          notes: `Carga inicial vía CSV`,
          performed_by: 'system',
        });
        result.stockRegistered++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `Stock "${item.name}": ${err instanceof Error ? err.message : 'Error'}`
        );
      }
    }

    // ========== Phase 3: Create/find products ==========
    const productNameToProduct = new Map<string, Product>(); // normalised name → product
    try {
      const existingProducts = await this.getProductsBySalePoint(salePointId);
      for (const p of existingProducts) {
        productNameToProduct.set(p.name.trim().toLowerCase(), p);
      }
    } catch {
      // Fresh — all will be created
    }

    const parsedProducts = parseResult.products.filter(
      (p) => p.errors.length === 0 && p.variations.length > 0
    );

    for (let i = 0; i < parsedProducts.length; i++) {
      const pp = parsedProducts[i];
      onProgress?.('Creando productos...', i + 1, parsedProducts.length);

      const productKey = pp.name.trim().toLowerCase();
      let existingProduct = productNameToProduct.get(productKey);

      if (!existingProduct) {
        // Create new product
        try {
          const newProduct = await this.createProduct({
            company_id: companyId,
            sale_point_id: salePointId,
            name: pp.name,
            description: pp.description || '',
            category: pp.category,
            photos: [],
            price_variations: pp.variations.map((v) => ({
              type: v.type,
              price: v.price,
              photo: '',
              base_ingredients: [],
              customization_groups: [],
              min_groups_required: 0,
            })),
            is_addon: false,
            is_available: true,
            is_unlimited_stock: true,
            stock: null,
          });
          productNameToProduct.set(productKey, newProduct);
          existingProduct = newProduct;
          result.productsCreated++;
        } catch (err) {
          result.failed++;
          result.errors.push(
            `Producto "${pp.name}": ${err instanceof Error ? err.message : 'Error'}`
          );
          continue;
        }
      } else {
        result.productsUpdated++;
      }

      // ========== Phase 4: Link BOM recipes ==========
      try {
        await this.linkRecipesToProduct(
          existingProduct,
          pp,
          itemNameToId,
          companyId,
          salePointId
        );
        result.recipesLinked++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `Receta "${pp.name}": ${err instanceof Error ? err.message : 'Error'}`
        );
      }
    }

    onProgress?.('¡Completado!', parsedProducts.length, parsedProducts.length);
    return result;
  },

  // ============================================
  // Internal helpers
  // ============================================

  /** Find existing default warehouse or create one */
  async findOrCreateWarehouse(companyId: string, salePointId: string): Promise<string> {
    // Try sale point warehouses
    try {
      const warehouses = await this.getWarehousesBySalePoint(salePointId);
      const defaultW = warehouses.find((w) => w.is_default && w.is_active);
      if (defaultW) return defaultW.id;
      const activeW = warehouses.find((w) => w.is_active);
      if (activeW) return activeW.id;
    } catch {
      // Ignore — might not have any
    }

    // Try company-level warehouses
    try {
      const warehouses = await this.getWarehousesByCompany(companyId);
      const defaultW = warehouses.find((w) => w.is_default && w.is_active);
      if (defaultW) return defaultW.id;
      const activeW = warehouses.find((w) => w.is_active);
      if (activeW) return activeW.id;
    } catch {
      // Ignore
    }

    // Create new default warehouse
    const created = await this.createWarehouse({
      company_id: companyId,
      sale_point_id: salePointId,
      name: 'Bodega Principal',
      description: 'Bodega creada automáticamente durante importación de inventario',
      is_default: true,
    });
    return created.id;
  },

  /**
   * Link BOM base_ingredients to a product's variations.
   * Builds base_ingredients from the parsed recipe and PUTs the product.
   */
  async linkRecipesToProduct(
    product: Product,
    parsed: ParsedProduct,
    itemNameToId: Map<string, string>,
    companyId: string,
    salePointId: string
  ): Promise<void> {
    // Build a map of variation type → base_ingredients
    const variationRecipes = new Map<
      string,
      Array<{ inventory_item_id: string; qty_to_deduct: number; unit: string }>
    >();

    for (const pv of parsed.variations) {
      const ingredients: Array<{ inventory_item_id: string; qty_to_deduct: number; unit: string }> =
        [];

      for (const ing of pv.ingredients) {
        const itemId = itemNameToId.get(ing.itemNameKey);
        if (!itemId) continue;
        ingredients.push({
          inventory_item_id: itemId,
          qty_to_deduct: ing.qtyToDeduct,
          unit: ing.unit,
        });
      }

      variationRecipes.set(pv.type.trim().toLowerCase(), ingredients);
    }

    // Update the product's price_variations with base_ingredients
    const updatedVariations = product.price_variations.map((pv) => {
      const recipe = variationRecipes.get(pv.type.trim().toLowerCase());
      return {
        ...pv,
        base_ingredients: recipe || pv.base_ingredients || [],
      };
    });

    await this.updateProduct(product.id, {
      company_id: companyId,
      sale_point_id: salePointId,
      price_variations: updatedVariations,
    });
  },
};
