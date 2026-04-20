import { Package, ChefHat, AlertTriangle, Box } from 'lucide-react';
import type {
  InventoryCsvParseResult,
  ParsedProduct,
  ParsedInventoryItem,
} from '../../services/inventoryCsvParser';
import { formatPrice, formatQty } from '../../services/inventoryCsvParser';

// ============================================
// Unit display helper
// ============================================

const UNIT_LABELS: Record<string, string> = {
  UNITS: 'und',
  GRAMS: 'g',
  KILOGRAMS: 'kg',
  MILLILITERS: 'mL',
  LITERS: 'L',
};

function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] || unit;
}

// ============================================
// Sub-components
// ============================================

function InventoryItemsTable({ items }: { items: ParsedInventoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-3 py-2 font-medium text-gray-600">Artículo Inventario</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Categoría</th>
            <th className="text-center px-3 py-2 font-medium text-gray-600">Unidad</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Costo Unit.</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Stock Inicial</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Alerta Mín</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.nameKey} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {item.category || (
                  <span className="text-gray-300 italic">Sin categoría</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {unitLabel(item.unit)}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-700">
                {item.costPerUnit > 0 ? formatPrice(item.costPerUnit) : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                {item.initialStock > 0 ? (
                  <span className="font-semibold text-green-700">
                    {formatQty(item.initialStock)} {unitLabel(item.unit)}
                  </span>
                ) : (
                  <span className="text-gray-300">0</span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {item.minStockAlert > 0 ? (
                  <span>{formatQty(item.minStockAlert)}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductRecipesTable({ products }: { products: ParsedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div
          key={product.name}
          className={`border rounded-lg overflow-hidden ${
            product.errors.length > 0
              ? 'border-red-200 bg-red-50/30'
              : 'border-gray-200 bg-white'
          }`}
        >
          {/* Product header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <ChefHat className="h-4 w-4 text-purple-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{product.name}</span>
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
              {product.category}
            </span>
            {product.description && (
              <span className="text-xs text-gray-400 italic ml-auto truncate max-w-48">
                {product.description}
              </span>
            )}
          </div>

          {/* Variations */}
          <div className="divide-y divide-gray-100">
            {product.variations.map((variation) => (
              <div key={variation.type} className="px-4 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-800">
                    {variation.type}
                  </span>
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    {formatPrice(variation.price)}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {variation.ingredients.length} ingrediente{variation.ingredients.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-4">
                  {variation.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
                    >
                      <Box className="h-3 w-3" />
                      {ing.itemName}
                      <span className="font-semibold">
                        ×{formatQty(ing.qtyToDeduct)} {unitLabel(ing.unit)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {product.errors.length > 0 && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200 space-y-1">
              {product.errors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main component
// ============================================

interface InventoryCsvPreviewTableProps {
  parseResult: InventoryCsvParseResult;
}

export function InventoryCsvPreviewTable({ parseResult }: InventoryCsvPreviewTableProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Inventory Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Artículos de Inventario a Crear
            <span className="text-xs font-normal text-blue-600 ml-2">
              ({parseResult.inventoryItems.length} artículo{parseResult.inventoryItems.length !== 1 ? 's' : ''} únicos)
            </span>
          </h3>
          <p className="text-xs text-blue-600 mt-0.5">
            Artículos duplicados por nombre se crearán una sola vez. Stock inicial se acumula.
          </p>
        </div>
        <InventoryItemsTable items={parseResult.inventoryItems} />
      </div>

      {/* Section 2: Products & Recipes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
          <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Productos y Recetas
            <span className="text-xs font-normal text-purple-600 ml-2">
              ({parseResult.products.length} producto{parseResult.products.length !== 1 ? 's' : ''})
            </span>
          </h3>
          <p className="text-xs text-purple-600 mt-0.5">
            Los productos existentes se actualizarán con la receta. Los nuevos se crearán automáticamente.
          </p>
        </div>
        <div className="p-4">
          <ProductRecipesTable products={parseResult.products} />
        </div>
      </div>
    </div>
  );
}
