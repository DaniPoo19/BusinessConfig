// ============================================
// CSV Parser for Product Import
// Parses CSV with ";" separator and groups rows
// with the same product name into one product
// with multiple price_variations.
// ============================================

import type { PriceVariation } from '../types/company';

// ============================================
// Public types
// ============================================

export interface CsvParsedProduct {
  /** Original CSV row numbers (1-based) that formed this product */
  rows: number[];
  name: string;
  category: string;
  description: string;
  price_variations: PriceVariation[];
  /** Per-product validation errors */
  errors: string[];
}

export interface CsvParseResult {
  products: CsvParsedProduct[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  /** Global parse errors (encoding, empty file, etc.) */
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
 * Parse the price string into an integer (backend uses int64).
 * Accepts: "15000", "15.000", "15,000", "$15000", "$15.000"
 */
function parsePrice(raw: string): number | null {
  if (!raw) return null;
  // Remove currency symbols, spaces, dots-as-thousands-sep, commas-as-thousands-sep
  const cleaned = raw.replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '');
  const n = Number(cleaned);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n);
}

// ============================================
// Main parser
// ============================================

/**
 * Parse a CSV string (with ";" separator) into products.
 *
 * **Grouping rule**: rows with the same product name (case-insensitive,
 * trimmed) are merged into a single product. Each row contributes one
 * `PriceVariation`.
 *
 * Expected columns (1-indexed):
 *  1. Nombre del Producto  → name
 *  2. Categoría del menu   → category
 *  3. Descripción corta    → description
 *  4. Variaciones          → variation type  (if empty → "Único")
 *  5. Precio de venta      → price
 */
export function parseCsv(raw: string): CsvParseResult {
  const result: CsvParseResult = {
    products: [],
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

  // Accumulator: key = lowercase trimmed name
  const productMap = new Map<string, CsvParsedProduct>();
  // Maintain insertion order
  const insertionOrder: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-based, +1 for header
    const cells = dataLines[i].split(';').map(cleanCell);

    // Validate minimum columns
    if (cells.length < 5) {
      // Try to still add with what we have, but flag error
      const name = cells[0] || '';
      if (!name) {
        result.globalErrors.push(`Fila ${rowNum}: no se pudo leer (menos de 5 columnas y sin nombre).`);
        continue;
      }
    }

    const name = cells[0] || '';
    const category = cells[1] || '';
    const description = cells[2] || '';
    const variationType = cells[3] || '';
    const priceRaw = cells[4] || '';

    // Row-level errors
    const rowErrors: string[] = [];
    if (!name) rowErrors.push('Nombre vacío');
    if (!category) rowErrors.push('Categoría vacía');

    const price = parsePrice(priceRaw);
    if (price === null && !priceRaw) {
      // Price is required if variation doesn't embed its own price
      rowErrors.push('Precio vacío');
    } else if (price === null) {
      rowErrors.push(`Precio inválido: "${priceRaw}"`);
    }

    // Build the variation for this row
    const variation: PriceVariation = {
      type: variationType || 'Único',
      price: price ?? 0,
    };

    // Group by normalised name
    const key = name.trim().toLowerCase();

    if (!key) {
      // Can't group without a name — skip
      continue;
    }

    if (productMap.has(key)) {
      const existing = productMap.get(key)!;
      existing.rows.push(rowNum);
      existing.price_variations.push(variation);
      // Merge errors
      if (rowErrors.length > 0) {
        existing.errors.push(...rowErrors.map((e) => `Fila ${rowNum}: ${e}`));
      }
      // If later rows have a better description, use it
      if (!existing.description && description) {
        existing.description = description;
      }
    } else {
      const product: CsvParsedProduct = {
        rows: [rowNum],
        name,
        category,
        description,
        price_variations: [variation],
        errors: rowErrors.map((e) => `Fila ${rowNum}: ${e}`),
      };
      productMap.set(key, product);
      insertionOrder.push(key);
    }
  }

  // ====================================================
  // Post-processing: detect & fix duplicate variation types
  // The backend rejects products with repeated type names
  // within price_variations. We disambiguate by appending
  // a suffix and warn the user.
  // ====================================================

  // Build final array in insertion order
  for (const key of insertionOrder) {
    const product = productMap.get(key)!;

    // Check for duplicate variation types
    const typeCounts = new Map<string, number>();
    for (const pv of product.price_variations) {
      const t = pv.type.toLowerCase();
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }

    const hasDuplicates = Array.from(typeCounts.values()).some((c) => c > 1);
    if (hasDuplicates) {
      // Disambiguate: "Único", "Único (2)", "Único (3)"...
      const seenTypes = new Map<string, number>();
      for (const pv of product.price_variations) {
        const t = pv.type.toLowerCase();
        const count = (seenTypes.get(t) || 0) + 1;
        seenTypes.set(t, count);
        if (count > 1) {
          pv.type = `${pv.type} (${count})`;
        }
      }

      // Find which types were duplicated for the warning message
      const duplicatedTypes = Array.from(typeCounts.entries())
        .filter(([, c]) => c > 1)
        .map(([t, c]) => `"${t}" (×${c})`);

      product.errors.push(
        `Variación duplicada: ${duplicatedTypes.join(', ')}. Se renombraron automáticamente.`
      );
    }

    if (product.errors.length === 0) {
      result.validCount++;
    } else {
      result.invalidCount++;
    }
    result.products.push(product);
  }

  return result;
}

/**
 * Format a price number for display: 15000 → "$15.000"
 */
export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}
