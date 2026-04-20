// ============================================
// CSV Parser for Inventory Import
// Parses CSV with ";" separator (13 columns).
// Groups rows into products (with variations)
// and inventory items (deduplicated by name).
// ============================================

// ============================================
// Types
// ============================================

export type RowType = 'ARTICULO' | 'RECETA';
export type UnitOfMeasure = 'UNITS' | 'GRAMS' | 'KILOGRAMS' | 'MILLILITERS' | 'LITERS';

const VALID_UNITS: Record<string, UnitOfMeasure> = {
  UNITS: 'UNITS',
  GRAMS: 'GRAMS',
  KILOGRAMS: 'KILOGRAMS',
  MILLILITERS: 'MILLILITERS',
  LITERS: 'LITERS',
  // Shorthand aliases
  G: 'GRAMS',
  KG: 'KILOGRAMS',
  ML: 'MILLILITERS',
  L: 'LITERS',
  U: 'UNITS',
  UN: 'UNITS',
  UND: 'UNITS',
};

const VALID_TYPES: Record<string, RowType> = {
  ARTICULO: 'ARTICULO',
  RECETA: 'RECETA',
};

/** A single ingredient inside a variation's recipe */
export interface ParsedRecipeIngredient {
  /** Reference to ParsedInventoryItem by normalised name */
  itemNameKey: string;
  /** Display name of the item */
  itemName: string;
  qtyToDeduct: number;
  unit: UnitOfMeasure;
}

/** A variation of a product with its recipe */
export interface ParsedVariation {
  type: string; // "Único", "Pequeño", "Grande", etc.
  price: number;
  ingredients: ParsedRecipeIngredient[];
}

/** A product to create/update */
export interface ParsedProduct {
  name: string;
  category: string;
  description: string;
  variations: ParsedVariation[];
  sourceRows: number[];
  errors: string[];
}

/** A unique inventory item to create/reuse */
export interface ParsedInventoryItem {
  name: string;
  nameKey: string; // lowercased for dedup
  category: string;
  unit: UnitOfMeasure;
  costPerUnit: number;
  initialStock: number; // accumulated across all rows
  minStockAlert: number;
  sourceRows: number[];
}

/** Full parse result */
export interface InventoryCsvParseResult {
  products: ParsedProduct[];
  inventoryItems: ParsedInventoryItem[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  globalErrors: string[];
}

// ============================================
// Internal helpers
// ============================================

/** Remove BOM and normalise line endings */
function normaliseText(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Trim a cell and strip surrounding quotes */
function cleanCell(cell: string): string {
  let v = cell.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Parse a price or cost string into a number.
 * Accepts: "15000", "15.000", "15,000", "$15000", "$15.000"
 */
function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '');
  const n = Number(cleaned);
  if (isNaN(n) || n < 0) return null;
  return n;
}

/** Parse a decimal number (allows fractions like 0.5, 200, etc.) */
function parseDecimal(raw: string): number | null {
  if (!raw) return null;
  // Allow comma as decimal separator
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  if (isNaN(n) || n < 0) return null;
  return n;
}

function normaliseKey(name: string): string {
  return name.trim().toLowerCase();
}

// ============================================
// Main parser
// ============================================

/**
 * Parse a CSV string (with ";" separator) into inventory import data.
 *
 * Expected columns (1-indexed):
 *  1.  Tipo                   → ARTICULO | RECETA
 *  2.  Nombre Producto        → product name
 *  3.  Categoría Producto     → product category
 *  4.  Descripción            → product description
 *  5.  Variación              → variation type (empty → "Único")
 *  6.  Precio Venta           → sale price
 *  7.  Nombre Art Inventario  → inventory item name
 *  8.  Categoría Inventario   → inventory item category
 *  9.  Unidad                 → unit of measure
 * 10.  Costo Unitario         → cost per unit
 * 11.  Stock Inicial          → initial stock
 * 12.  Qty por Receta         → qty to deduct per sale
 * 13.  Alerta Min Stock       → min stock alert threshold
 */
export function parseInventoryCsv(raw: string): InventoryCsvParseResult {
  const result: InventoryCsvParseResult = {
    products: [],
    inventoryItems: [],
    totalRows: 0,
    validCount: 0,
    invalidCount: 0,
    globalErrors: [],
  };

  const text = normaliseText(raw);
  if (!text.trim()) {
    result.globalErrors.push('El archivo está vacío.');
    return result;
  }

  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    result.globalErrors.push('El archivo debe tener al menos una fila de encabezado y una de datos.');
    return result;
  }

  // Skip header row
  const dataLines = lines.slice(1);
  result.totalRows = dataLines.length;

  // Accumulators
  const productMap = new Map<string, ParsedProduct>(); // nameKey → product
  const productOrder: string[] = [];
  const itemMap = new Map<string, ParsedInventoryItem>(); // nameKey → item
  const itemOrder: string[] = [];

  // Track per-variation ingredients:  productKey|variationType → ingredients[]
  const variationMap = new Map<string, { type: string; price: number; ingredients: ParsedRecipeIngredient[] }>();

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-based, +1 for header
    const cells = dataLines[i].split(';').map(cleanCell);

    // Validate minimum columns
    if (cells.length < 9) {
      result.globalErrors.push(`Fila ${rowNum}: esperadas al menos 9 columnas, encontradas ${cells.length}.`);
      continue;
    }

    const rowErrors: string[] = [];

    // --- Column parsing ---
    const tipoRaw = (cells[0] || '').toUpperCase();
    const productName = cells[1] || '';
    const productCategory = cells[2] || '';
    const productDesc = cells[3] || '';
    const variationType = cells[4] || 'Único';
    const priceRaw = cells[5] || '';
    const itemName = cells[6] || '';
    const itemCategory = cells[7] || '';
    const unitRaw = (cells[8] || '').toUpperCase();
    const costRaw = cells[9] || '';
    const stockRaw = cells[10] || '';
    const qtyRecipeRaw = cells[11] || '';
    const alertRaw = cells[12] || '';

    // --- Validations ---
    const tipo = VALID_TYPES[tipoRaw];
    if (!tipo) {
      rowErrors.push(`Tipo inválido: "${tipoRaw}" (debe ser ARTICULO o RECETA)`);
    }

    if (!productName) rowErrors.push('Nombre del producto vacío');
    if (!productCategory) rowErrors.push('Categoría del producto vacía');

    const price = parseNumber(priceRaw);
    if (price === null && priceRaw) {
      rowErrors.push(`Precio de venta inválido: "${priceRaw}"`);
    } else if (price === null) {
      rowErrors.push('Precio de venta vacío');
    }

    if (!itemName) rowErrors.push('Nombre del artículo de inventario vacío');

    const unit = VALID_UNITS[unitRaw];
    if (!unit) {
      rowErrors.push(`Unidad inválida: "${unitRaw}" (opciones: UNITS, GRAMS, KILOGRAMS, MILLILITERS, LITERS)`);
    }

    const costPerUnit = parseDecimal(costRaw) ?? 0;
    const initialStock = parseDecimal(stockRaw) ?? 0;

    const qtyRecipe = parseDecimal(qtyRecipeRaw);
    if (qtyRecipe === null || qtyRecipe <= 0) {
      rowErrors.push(`Qty por receta inválido o vacío: "${qtyRecipeRaw}" (debe ser > 0)`);
    }

    const minStockAlert = parseDecimal(alertRaw) ?? 0;

    // If there are validation errors for this row, still try to group but mark errors
    const hasErrors = rowErrors.length > 0;

    // --- Accumulate Inventory Item ---
    if (itemName && unit) {
      const itemKey = normaliseKey(itemName);
      if (itemMap.has(itemKey)) {
        const existing = itemMap.get(itemKey)!;
        existing.initialStock += initialStock;
        existing.sourceRows.push(rowNum);
        // Use highest minStockAlert and costPerUnit
        if (minStockAlert > existing.minStockAlert) existing.minStockAlert = minStockAlert;
        if (costPerUnit > existing.costPerUnit) existing.costPerUnit = costPerUnit;
      } else {
        itemMap.set(itemKey, {
          name: itemName,
          nameKey: itemKey,
          category: itemCategory,
          unit,
          costPerUnit,
          initialStock,
          minStockAlert,
          sourceRows: [rowNum],
        });
        itemOrder.push(itemKey);
      }
    }

    // --- Accumulate Product ---
    const productKey = normaliseKey(productName);
    if (productName) {
      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          name: productName,
          category: productCategory,
          description: productDesc,
          variations: [],
          sourceRows: [rowNum],
          errors: hasErrors ? rowErrors.map((e) => `Fila ${rowNum}: ${e}`) : [],
        });
        productOrder.push(productKey);
      } else {
        const existingProduct = productMap.get(productKey)!;
        existingProduct.sourceRows.push(rowNum);
        if (!existingProduct.description && productDesc) {
          existingProduct.description = productDesc;
        }
        if (hasErrors) {
          existingProduct.errors.push(...rowErrors.map((e) => `Fila ${rowNum}: ${e}`));
        }
      }
    }

    // --- Accumulate Variation Ingredients ---
    if (productName && itemName && unit && qtyRecipe && qtyRecipe > 0) {
      const varKey = `${productKey}|${normaliseKey(variationType)}`;
      if (!variationMap.has(varKey)) {
        variationMap.set(varKey, {
          type: variationType,
          price: price ?? 0,
          ingredients: [],
        });
      }
      const variation = variationMap.get(varKey)!;
      // Update price if this row has a valid one
      if (price !== null && price > 0) {
        variation.price = price;
      }
      variation.ingredients.push({
        itemNameKey: normaliseKey(itemName),
        itemName,
        qtyToDeduct: qtyRecipe,
        unit,
      });
    }
  }

  // --- Build final products with variations ---
  for (const productKey of productOrder) {
    const product = productMap.get(productKey)!;

    // Find all variations for this product
    for (const [varKey, varData] of variationMap.entries()) {
      if (varKey.startsWith(productKey + '|')) {
        product.variations.push({
          type: varData.type,
          price: varData.price,
          ingredients: varData.ingredients,
        });
      }
    }

    // Count valid/invalid
    if (product.errors.length === 0 && product.variations.length > 0) {
      result.validCount++;
    } else {
      if (product.variations.length === 0) {
        product.errors.push('No se encontraron ingredientes válidos para este producto');
      }
      result.invalidCount++;
    }

    result.products.push(product);
  }

  // --- Build final inventory items ---
  for (const itemKey of itemOrder) {
    result.inventoryItems.push(itemMap.get(itemKey)!);
  }

  return result;
}

/**
 * Format a price number for display: 15000 → "$15.000"
 */
export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

/**
 * Format a decimal quantity for display: 200 → "200", 0.5 → "0.5"
 */
export function formatQty(qty: number): string {
  return qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
}
