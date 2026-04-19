import { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Eye,
  Rocket,
  Check,
  AlertTriangle,
  Building2,
  Store,
  Download,
} from 'lucide-react';
import { Card, CardHeader, Button, Spinner } from '../components/ui';
import { CsvUploader } from '../components/ui/CsvUploader';
import { CsvPreviewTable } from '../components/csv/CsvPreviewTable';
import { toast } from '../components/ui/Toast';
import { useCompanies, useSalePoints } from '../hooks';
import { productsApi } from '../services/adminApi';
import { parseCsv, formatPrice } from '../services/csvParser';
import type { CsvParseResult } from '../services/csvParser';
import type { ProductImportResult } from '../types/company';

// ============================================
// Step indicator
// ============================================

type Step = 'upload' | 'preview' | 'result';

const STEPS: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Cargar CSV', icon: Upload },
  { key: 'preview', label: 'Revisar', icon: Eye },
  { key: 'result', label: 'Resultado', icon: Rocket },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={`w-8 h-0.5 rounded ${
                  isDone ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-200'
                  : isDone
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Selector sub-component (same pattern as ParameterImport)
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

// ============================================
// Main Page
// ============================================

export function CsvImportPage() {
  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Destination
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const [companyId, setCompanyId] = useState('');
  const [salePointId, setSalePointId] = useState('');
  const { salePoints, isLoading: loadingSP } = useSalePoints(companyId || null);

  // CSV data
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [onlyValid, setOnlyValid] = useState(true);

  // Import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null);

  // ============================================
  // Handlers
  // ============================================

  const handleFileLoaded = (content: string, _fileName: string) => {
    const result = parseCsv(content);
    setParseResult(result);

    if (result.globalErrors.length > 0) {
      toast.error(result.globalErrors[0]);
    } else if (result.products.length === 0) {
      toast.error('No se encontraron productos en el archivo.');
    } else {
      toast.success(`${result.products.length} productos encontrados (${result.validCount} válidos)`);
    }
  };

  const canGoToPreview =
    companyId && salePointId && parseResult && parseResult.products.length > 0;

  const goToPreview = () => {
    if (!canGoToPreview) return;
    setStep('preview');
  };

  const productsToImport = parseResult
    ? onlyValid
      ? parseResult.products.filter((p) => p.errors.length === 0)
      : parseResult.products
    : [];

  const handleImport = async () => {
    if (!companyId || !salePointId || productsToImport.length === 0) return;

    setImporting(true);
    setProgress(null);
    setImportResult(null);

    try {
      const result = await productsApi.importFromCsv(
        productsToImport,
        companyId,
        salePointId,
        (done, total) => setProgress({ done, total })
      );
      setImportResult(result);
      setStep('result');

      if (result.failed === 0) {
        toast.success(`¡${result.successful} productos importados correctamente!`);
      } else {
        toast.error(`${result.successful} importados, ${result.failed} fallaron`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de importación');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
    setProgress(null);
    setOnlyValid(true);
  };

  const handleDownloadErrors = () => {
    if (!importResult || importResult.errors.length === 0) return;
    const text = importResult.errors.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // Render
  // ============================================

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" />
            Importar desde CSV
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Carga productos masivamente desde un archivo Excel/CSV separado por punto y coma
          </p>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* ============================================ */}
      {/* STEP 1: Upload */}
      {/* ============================================ */}
      {step === 'upload' && (
        <>
          {/* Destination selector */}
          <Card>
            <CardHeader
              title="Destino de Importación"
              description="Selecciona la empresa y sucursal donde se crearán los productos"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectorGroup
                label="Empresa"
                icon={<Building2 className="h-4 w-4" />}
                value={companyId}
                onChange={(val) => {
                  setCompanyId(val);
                  setSalePointId('');
                }}
                options={companies}
                getKey={(c) => c.id}
                getLabel={(c) => c.name}
                placeholder="Seleccionar empresa..."
              />
              <SelectorGroup
                label="Sucursal"
                icon={<Store className="h-4 w-4" />}
                value={salePointId}
                onChange={setSalePointId}
                options={salePoints}
                getKey={(sp) => sp.id}
                getLabel={(sp) => sp.name}
                placeholder={
                  companyId
                    ? 'Seleccionar sucursal...'
                    : 'Primero selecciona empresa'
                }
                disabled={!companyId}
                loading={loadingSP}
              />
            </div>
          </Card>

          {/* File upload */}
          <Card>
            <CardHeader
              title="Archivo CSV"
              description="El archivo debe tener 5 columnas separadas por ; : Nombre, Categoría, Descripción, Variación, Precio"
            />
            <CsvUploader
              onFileLoaded={handleFileLoaded}
              disabled={!companyId || !salePointId}
            />

            {/* File format hint */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                📋 Formato esperado del CSV:
              </p>
              <code className="block text-[11px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
{`Nombre del Producto;Categoria;Descripcion;Variacion;Precio
Helado de Vainilla;Helados;Artesanal;Pequeño;8000
Helado de Vainilla;Helados;Artesanal;Mediano;12000
Helado de Vainilla;Helados;Artesanal;Grande;15000
Brownie;Postres;Brownie de chocolate;;7500`}
              </code>
              <p className="text-[10px] text-gray-400 mt-2">
                💡 Si el <b>nombre del producto se repite</b> en varias filas, se agrupan como variaciones de un mismo producto.
                Si "Variación" está vacía, se crea como tipo "Único".
              </p>
            </div>
          </Card>

          {/* Parse summary */}
          {parseResult && parseResult.products.length > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {parseResult.products.length}
                    </p>
                    <p className="text-xs text-gray-500">Productos</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {parseResult.validCount}
                    </p>
                    <p className="text-xs text-gray-500">Válidos</p>
                  </div>
                  {parseResult.invalidCount > 0 && (
                    <>
                      <div className="h-8 w-px bg-gray-200" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-500">
                          {parseResult.invalidCount}
                        </p>
                        <p className="text-xs text-gray-500">Con errores</p>
                      </div>
                    </>
                  )}
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {parseResult.totalRows}
                    </p>
                    <p className="text-xs text-gray-500">Filas CSV</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  icon={<Eye className="h-5 w-5" />}
                  onClick={goToPreview}
                  disabled={!canGoToPreview}
                >
                  Revisar Productos
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* STEP 2: Preview */}
      {/* ============================================ */}
      {step === 'preview' && parseResult && (
        <>
          {/* Stats bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">
                  {parseResult.products.length}
                </span>{' '}
                productos parseados ·{' '}
                <span className="font-semibold text-green-600">
                  {parseResult.validCount}
                </span>{' '}
                válidos
                {parseResult.invalidCount > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold text-red-500">
                      {parseResult.invalidCount}
                    </span>{' '}
                    con errores
                  </>
                )}
              </span>

              {parseResult.invalidCount > 0 && (
                <label className="flex items-center gap-2 text-xs cursor-pointer ml-4 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={onlyValid}
                    onChange={(e) => setOnlyValid(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Solo importar válidos
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('upload')}>
                ← Volver
              </Button>
              <Button
                icon={<Rocket className="h-4 w-4" />}
                onClick={handleImport}
                isLoading={importing}
                disabled={productsToImport.length === 0}
              >
                Importar {productsToImport.length} productos
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {importing && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Spinner size="sm" />
                  Importando productos...
                </span>
                <span className="font-medium text-gray-900">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Table */}
          <CsvPreviewTable products={parseResult.products} />
        </>
      )}

      {/* ============================================ */}
      {/* STEP 3: Result */}
      {/* ============================================ */}
      {step === 'result' && importResult && (
        <>
          {/* Result card */}
          <Card>
            <div className="py-6 text-center">
              {importResult.failed === 0 ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              ) : importResult.successful === 0 ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              )}

              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {importResult.failed === 0
                  ? '¡Importación exitosa!'
                  : importResult.successful === 0
                  ? 'Importación fallida'
                  : 'Importación parcial'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {importResult.successful > 0 &&
                  `${importResult.successful} producto${importResult.successful !== 1 ? 's' : ''} importado${importResult.successful !== 1 ? 's' : ''} correctamente`}
                {importResult.successful > 0 && importResult.failed > 0 && ' · '}
                {importResult.failed > 0 &&
                  `${importResult.failed} con error`}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    {importResult.total}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {importResult.successful}
                  </p>
                  <p className="text-xs text-gray-500">Exitosos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">
                    {importResult.failed}
                  </p>
                  <p className="text-xs text-gray-500">Fallidos</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={handleReset}>
                  Nueva Importación
                </Button>
                {importResult.errors.length > 0 && (
                  <Button
                    variant="secondary"
                    icon={<Download className="h-4 w-4" />}
                    onClick={handleDownloadErrors}
                  >
                    Descargar Errores
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Error list */}
          {importResult.errors.length > 0 && (
            <Card>
              <CardHeader
                title="Detalle de Errores"
                description={`${importResult.errors.length} producto${importResult.errors.length !== 1 ? 's' : ''} no se pudieron importar`}
              />
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {importResult.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm p-2 bg-red-50 rounded-lg"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700">{error}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
