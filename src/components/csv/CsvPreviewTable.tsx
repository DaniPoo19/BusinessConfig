import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CsvParsedProduct } from '../../services/csvParser';
import { formatPrice } from '../../services/csvParser';

interface CsvPreviewTableProps {
  products: CsvParsedProduct[];
}

const PAGE_SIZE = 25;

export function CsvPreviewTable({ products }: CsvPreviewTableProps) {
  const [page, setPage] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const sorted = [...products].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageProducts = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = () => setSortAsc(!sortAsc);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              <th
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={toggleSort}
              >
                <span className="inline-flex items-center gap-1">
                  Producto
                  {sortAsc ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Variaciones
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageProducts.map((product, idx) => {
              const globalIdx = page * PAGE_SIZE + idx;
              const hasErrors = product.errors.length > 0;
              const isExpanded = expandedRow === globalIdx;

              return (
                <tr
                  key={globalIdx}
                  className={`transition-colors ${
                    hasErrors
                      ? 'bg-red-50/50 hover:bg-red-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {product.rows.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">
                      {product.name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium truncate max-w-[140px]">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-[180px]">
                    {product.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {product.price_variations.map((pv, vi) => (
                        <span
                          key={vi}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-full text-xs font-medium"
                        >
                          {pv.type}
                          <span className="text-primary-500 font-normal">
                            {formatPrice(pv.price)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasErrors ? (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : globalIdx)
                          }
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          title={product.errors.join('\n')}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">Error</span>
                        </button>
                        {isExpanded && (
                          <div className="absolute right-0 top-8 z-10 w-64 bg-white border border-red-200 rounded-lg shadow-lg p-3 text-left">
                            <p className="text-xs font-semibold text-red-700 mb-1">
                              Errores:
                            </p>
                            <ul className="text-xs text-red-600 space-y-0.5">
                              {product.errors.map((e, ei) => (
                                <li key={ei}>• {e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="text-xs">OK</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, products.length)} de{' '}
            {products.length} productos
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
