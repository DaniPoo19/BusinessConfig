import { useState } from 'react';
import {
  ArrowRightLeft,
  Clock,
  Truck,
  Building2,
  Store,
  Check,
  AlertTriangle,
  Package,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, Button, Spinner, EmptyState } from '../ui';
import { toast } from '../ui/Toast';
import { useCompanies, useSalePoints } from '../../hooks';
import { parametersApi } from '../../services/parametersApi';
import { productsApi } from '../../services/adminApi';

const IMPORTABLE_ITEMS = [
  { key: 'BUSINESS_HOURS', label: 'Horarios de Atención', icon: Clock, color: 'text-blue-600 bg-blue-50', desc: 'Hora de apertura y cierre', type: 'parameter' as const },
  { key: 'DELIVERY_COST', label: 'Barrios / Domicilios', icon: Truck, color: 'text-green-600 bg-green-50', desc: 'Lista de barrios con precios', type: 'parameter' as const },
  { key: 'PRODUCTS', label: 'Productos', icon: Package, color: 'text-purple-600 bg-purple-50', desc: 'Todos los productos del catálogo', type: 'products' as const },
  { key: 'CUSTOMIZATION_GROUPS', label: 'Grupos de Personalización', icon: Layers, color: 'text-orange-600 bg-orange-50', desc: 'Sabores y adiciones por producto', type: 'groups' as const },
] as const;

type ImportableKey = (typeof IMPORTABLE_ITEMS)[number]['key'];

interface ImportResult {
  key: string;
  success: boolean;
  error?: string;
  detail?: string; // e.g. "45/50 productos importados"
}

export function ParameterImport() {
  // Source
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const [sourceCompanyId, setSourceCompanyId] = useState<string>('');
  const [sourceSalePointId, setSourceSalePointId] = useState<string>('');
  const { salePoints: sourceSalePoints, isLoading: loadingSourceSP } = useSalePoints(
    sourceCompanyId || null
  );

  // Target
  const [targetCompanyId, setTargetCompanyId] = useState<string>('');
  const [targetSalePointId, setTargetSalePointId] = useState<string>('');
  const { salePoints: targetSalePoints, isLoading: loadingTargetSP } = useSalePoints(
    targetCompanyId || null
  );

  // Items to import
  const [selectedItems, setSelectedItems] = useState<Set<ImportableKey>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [results, setResults] = useState<ImportResult[]>([]);

  const toggleItem = (key: ImportableKey) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const canImport =
    sourceCompanyId &&
    sourceSalePointId &&
    targetCompanyId &&
    targetSalePointId &&
    selectedItems.size > 0 &&
    !(sourceCompanyId === targetCompanyId && sourceSalePointId === targetSalePointId);

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setResults([]);
    setProgress('');

    const importResults: ImportResult[] = [];

    for (const key of selectedItems) {
      const item = IMPORTABLE_ITEMS.find((i) => i.key === key);
      if (!item) continue;

      setProgress(`Importando ${item.label}...`);

      if (item.type === 'parameter') {
        // Import parameter (business hours, delivery costs)
        try {
          await parametersApi.importParameter(
            key,
            sourceCompanyId,
            sourceSalePointId,
            targetCompanyId,
            targetSalePointId
          );
          importResults.push({ key, success: true });
        } catch (err) {
          importResults.push({
            key,
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      } else if (item.type === 'products') {
        // Import products
        try {
          const result = await productsApi.importProducts(
            sourceSalePointId,
            targetCompanyId,
            targetSalePointId,
            (done, total) => setProgress(`Importando productos... ${done}/${total}`)
          );

          if (result.failed === 0) {
            importResults.push({
              key,
              success: true,
              detail: `${result.successful} producto${result.successful !== 1 ? 's' : ''} importado${result.successful !== 1 ? 's' : ''}`,
            });
          } else if (result.successful === 0) {
            importResults.push({
              key,
              success: false,
              error: `Todos fallaron (${result.failed})`,
              detail: result.errors.slice(0, 3).join('; '),
            });
          } else {
            importResults.push({
              key,
              success: true,
              detail: `${result.successful} importados, ${result.failed} fallaron`,
            });
          }
        } catch (err) {
          importResults.push({
            key,
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      } else if (item.type === 'groups') {
        // Import customization groups
        try {
          const result = await productsApi.importCustomizationGroups(
            sourceSalePointId,
            targetCompanyId,
            targetSalePointId,
            (done, total) => setProgress(`Importando grupos... ${done}/${total}`)
          );

          const parts: string[] = [];
          if (result.updated > 0) parts.push(`${result.updated} actualizado${result.updated !== 1 ? 's' : ''}`);
          if (result.noMatch > 0) parts.push(`${result.noMatch} sin coincidencia`);
          if (result.failed > 0) parts.push(`${result.failed} con error`);

          importResults.push({
            key,
            success: result.failed === 0 || result.updated > 0,
            detail: parts.join(', '),
            error: result.failed > 0 && result.updated === 0
              ? result.errors.slice(0, 2).join('; ')
              : undefined,
          });
        } catch (err) {
          importResults.push({
            key,
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      }
    }

    setResults(importResults);
    setImporting(false);
    setProgress('');

    const successes = importResults.filter((r) => r.success).length;
    const failures = importResults.filter((r) => !r.success).length;

    if (failures === 0) {
      toast.success(`Todo importado correctamente`);
    } else if (successes === 0) {
      toast.error('Todas las importaciones fallaron');
    } else {
      toast.success(`${successes} exitoso${successes > 1 ? 's' : ''}, ${failures} con error`);
    }
  };

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Sin empresas"
          description="Necesitas al menos una empresa con sucursales para importar parámetros."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Importar Datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Copia horarios, barrios, productos y grupos de personalización de una sucursal a otra
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source */}
        <Card>
          <CardHeader title="Origen" description="Sucursal desde donde copiar" />
          <div className="space-y-3">
            <SelectorGroup
              label="Empresa origen"
              icon={<Building2 className="h-4 w-4" />}
              value={sourceCompanyId}
              onChange={(val) => {
                setSourceCompanyId(val);
                setSourceSalePointId('');
              }}
              options={companies}
              getKey={(c) => c.id}
              getLabel={(c) => c.name}
              placeholder="Seleccionar empresa..."
            />
            <SelectorGroup
              label="Sucursal origen"
              icon={<Store className="h-4 w-4" />}
              value={sourceSalePointId}
              onChange={setSourceSalePointId}
              options={sourceSalePoints}
              getKey={(sp) => sp.id}
              getLabel={(sp) => sp.name}
              placeholder={sourceCompanyId ? 'Seleccionar sucursal...' : 'Primero selecciona empresa'}
              disabled={!sourceCompanyId}
              loading={loadingSourceSP}
            />
          </div>
        </Card>

        {/* Target */}
        <Card>
          <CardHeader title="Destino" description="Sucursal que recibirá los datos" />
          <div className="space-y-3">
            <SelectorGroup
              label="Empresa destino"
              icon={<Building2 className="h-4 w-4" />}
              value={targetCompanyId}
              onChange={(val) => {
                setTargetCompanyId(val);
                setTargetSalePointId('');
              }}
              options={companies}
              getKey={(c) => c.id}
              getLabel={(c) => c.name}
              placeholder="Seleccionar empresa..."
            />
            <SelectorGroup
              label="Sucursal destino"
              icon={<Store className="h-4 w-4" />}
              value={targetSalePointId}
              onChange={setTargetSalePointId}
              options={targetSalePoints}
              getKey={(sp) => sp.id}
              getLabel={(sp) => sp.name}
              placeholder={targetCompanyId ? 'Seleccionar sucursal...' : 'Primero selecciona empresa'}
              disabled={!targetCompanyId}
              loading={loadingTargetSP}
            />
          </div>
        </Card>
      </div>

      {/* Item selection */}
      <Card>
        <CardHeader title="Datos a Importar" description="Selecciona qué datos copiar" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {IMPORTABLE_ITEMS.map(({ key, label, icon: Icon, color, desc }) => {
            const checked = selectedItems.has(key);
            return (
              <button
                type="button"
                key={key}
                onClick={() => toggleItem(key)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  checked
                    ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    checked
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Same source/target warning */}
      {sourceCompanyId === targetCompanyId &&
        sourceSalePointId === targetSalePointId &&
        sourceSalePointId && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            No puedes importar a la misma sucursal de origen
          </div>
        )}

      {/* Progress */}
      {importing && progress && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Spinner size="sm" />
          {progress}
        </div>
      )}

      {/* Import button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          icon={<ArrowRightLeft className="h-5 w-5" />}
          onClick={handleImport}
          isLoading={importing}
          disabled={!canImport}
        >
          Importar {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader title="Resultados" />
          <div className="space-y-2">
            {results.map((r) => {
              const item = IMPORTABLE_ITEMS.find((i) => i.key === r.key);
              return (
                <div
                  key={r.key}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {r.success ? (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item?.label || r.key}</span>
                    {r.detail && (
                      <p className="text-xs opacity-80 truncate">{r.detail}</p>
                    )}
                  </div>
                  {r.error && (
                    <span className="text-xs ml-auto flex-shrink-0">{r.error}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Reusable Selector sub-component
// ============================================

function SelectorGroup<T>({
  label,
  icon,
  value,
  onChange,
  options,
  getKey,
  getLabel,
  placeholder,
  disabled,
  loading,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1.5">
        {icon} {label}
      </label>
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <Spinner size="sm" /> Cargando...
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
        >
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={getKey(item)} value={getKey(item)}>
              {getLabel(item)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
