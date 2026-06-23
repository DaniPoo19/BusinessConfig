import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
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
  Package,
  ChefHat,
  Box,
  Warehouse,
  Info,
} from 'lucide-react';
import { Card, CardHeader, Button, Spinner } from '../components/ui';
import { CsvUploader } from '../components/ui/CsvUploader';
import { CsvPreviewTable } from '../components/csv/CsvPreviewTable';
import { InventoryCsvPreviewTable } from '../components/csv/InventoryCsvPreviewTable';
import { toast } from '../components/ui/Toast';
import { useCompanies, useSalePoints } from '../hooks';
import { productsApi } from '../services/adminApi';
import { inventoryApi } from '../services/inventoryApi';
import { parseCsv } from '../services/csvParser';
import type { CsvParseResult } from '../services/csvParser';
import { parseInventoryCsv } from '../services/inventoryCsvParser';
import type { InventoryCsvParseResult } from '../services/inventoryCsvParser';
import type { ProductImportResult, InventoryImportResult } from '../types/company';

// ============================================
// Types & Validation
// ============================================

type Step = 'upload' | 'preview' | 'result';

const STEPS: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Cargar CSV', icon: Upload },
  { key: 'preview', label: 'Revisar', icon: Eye },
  { key: 'result', label: 'Resultado', icon: Rocket },
];

const schema = z.object({
  companyId: z.string().min(1, 'Debes seleccionar una empresa'),
  salePointId: z.string().min(1, 'Debes seleccionar una sucursal'),
  importType: z.enum(['products', 'inventory']),
});

type FormValues = z.infer<typeof schema>;

// ============================================
// Subcomponents
// ============================================

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
                className={`w-6 h-0.5 rounded transition-colors duration-300 ${
                  isDone ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };

  return (
    <div className={`text-center p-4 border rounded-xl bg-white shadow-sm flex flex-col items-center justify-center min-w-[110px] ${colorMap[color] || colorMap.gray}`}>
      <div className="p-2 rounded-lg bg-white/80 border mb-1.5">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export function CsvImportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Read router path to initialize default type
  const initialType = location.pathname === '/importar-inventario-csv' ? 'inventory' : 'products';

  const [step, setStep] = useState<Step>('upload');

  // React Hook Form + Zod validation
  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      companyId: '',
      salePointId: '',
      importType: initialType,
    },
  });

  const companyId = watch('companyId');
  const salePointId = watch('salePointId');
  const importType = watch('importType');

  // Destination collections (TanStack Query hooks)
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const { salePoints, isLoading: loadingSP } = useSalePoints(companyId || null);

  // CSV parse states
  const [productsParseResult, setProductsParseResult] = useState<CsvParseResult | null>(null);
  const [inventoryParseResult, setInventoryParseResult] = useState<InventoryCsvParseResult | null>(null);
  const [onlyValid, setOnlyValid] = useState(true);

  // Import state
  const [importing, setImporting] = useState(false);
  const [progressPhase, setProgressPhase] = useState<string>('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  
  // Results
  const [productsImportResult, setProductsImportResult] = useState<ProductImportResult | null>(null);
  const [inventoryImportResult, setInventoryImportResult] = useState<InventoryImportResult | null>(null);

  // Reset branch on company change
  useEffect(() => {
    setValue('salePointId', '', { shouldValidate: true });
    // Reset loaded files
    setProductsParseResult(null);
    setInventoryParseResult(null);
  }, [companyId, setValue]);

  // Sincronizar el formulario cuando cambia la URL
  useEffect(() => {
    const currentType = location.pathname === '/importar-inventario-csv' ? 'inventory' : 'products';
    setValue('importType', currentType);
  }, [location.pathname, setValue]);

  // Actualizar la URL cuando cambia la pestaña en el formulario
  useEffect(() => {
    if (importType === 'products' && location.pathname !== '/importar-csv') {
      navigate('/importar-csv', { replace: true });
    } else if (importType === 'inventory' && location.pathname !== '/importar-inventario-csv') {
      navigate('/importar-inventario-csv', { replace: true });
    }
  }, [importType, location.pathname, navigate]);

  // Limpiar estados y regresar al paso de carga cuando cambia la pestaña
  useEffect(() => {
    setProductsParseResult(null);
    setInventoryParseResult(null);
    setProductsImportResult(null);
    setInventoryImportResult(null);
    setStep('upload');
  }, [importType]);

  // Handle CSV file contents loaded
  const handleFileLoaded = (content: string, _fileName: string) => {
    if (importType === 'products') {
      const result = parseCsv(content);
      setProductsParseResult(result);
      if (result.globalErrors.length > 0) {
        toast.error(result.globalErrors[0]);
      } else if (result.products.length === 0) {
        toast.error('No se encontraron productos en el archivo.');
      } else {
        toast.success(`${result.products.length} productos detectados (${result.validCount} válidos).`);
      }
    } else {
      const result = parseInventoryCsv(content);
      setInventoryParseResult(result);
      if (result.globalErrors.length > 0) {
        toast.error(result.globalErrors[0]);
      } else if (result.products.length === 0 && result.inventoryItems.length === 0) {
        toast.error('No se encontraron datos en el archivo.');
      } else {
        toast.success(
          `${result.products.length} productos y ${result.inventoryItems.length} artículos de inventario detectados.`
        );
      }
    }
  };

  const hasParseData = importType === 'products'
    ? productsParseResult && productsParseResult.products.length > 0
    : inventoryParseResult && (inventoryParseResult.products.length > 0 || inventoryParseResult.inventoryItems.length > 0);

  const canGoToPreview = isValid && hasParseData;

  const goToPreview = () => {
    if (!canGoToPreview) return;
    setStep('preview');
  };

  const productsToImport = productsParseResult
    ? onlyValid
      ? productsParseResult.products.filter((p) => p.errors.length === 0)
      : productsParseResult.products
    : [];

  const handleImport = async () => {
    if (!companyId || !salePointId) return;

    setImporting(true);
    setProgress(null);
    setProgressPhase('');
    setProductsImportResult(null);
    setInventoryImportResult(null);

    try {
      if (importType === 'products') {
        if (productsToImport.length === 0) return;
        const result = await productsApi.importFromCsv(
          productsToImport,
          companyId,
          salePointId,
          (done, total) => setProgress({ done, total })
        );
        setProductsImportResult(result);
        setStep('result');
        if (result.failed === 0) {
          toast.success(`¡${result.successful} productos importados correctamente!`);
        } else {
          toast.error(`${result.successful} exitosos, ${result.failed} fallaron.`);
        }
      } else {
        if (!inventoryParseResult) return;
        const result = await inventoryApi.importFromCsv(
          inventoryParseResult,
          companyId,
          salePointId,
          (phase, done, total) => {
            setProgressPhase(phase);
            setProgress({ done, total });
          }
        );
        setInventoryImportResult(result);
        setStep('result');
        
        const totalOps =
          result.itemsCreated +
          result.itemsReused +
          result.stockRegistered +
          result.productsCreated +
          result.productsUpdated +
          result.recipesLinked;

        if (result.failed === 0) {
          toast.success(`¡Importación exitosa! ${totalOps} operaciones completadas.`);
        } else {
          toast.error(`${totalOps} completados, ${result.failed} fallaron.`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al realizar importación');
    } finally {
      setImporting(false);
      setProgress(null);
      setProgressPhase('');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setProductsParseResult(null);
    setInventoryParseResult(null);
    setProductsImportResult(null);
    setInventoryImportResult(null);
    setProgress(null);
    setProgressPhase('');
    setOnlyValid(true);
  };

  const handleDownloadErrors = () => {
    let errorsList: string[] = [];
    let filename = 'errores.txt';

    if (importType === 'products' && productsImportResult) {
      errorsList = productsImportResult.errors;
      filename = 'errores_productos.txt';
    } else if (importType === 'inventory' && inventoryImportResult) {
      errorsList = inventoryImportResult.errors;
      filename = 'errores_inventario.txt';
    }

    if (errorsList.length === 0) return;
    
    const text = errorsList.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingCompanies) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">Cargando base de datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" />
            Importación Masiva de Datos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Carga catálogos de productos y configuraciones de materia prima en bloque mediante archivos CSV.
          </p>
        </div>
        <StepIndicator current={step} />
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* STEP 1: Upload and Configuration */}
        {/* ========================================================= */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form panel */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader
                    title="Configuración de Destino"
                    description="Elige el destino y tipo de importación"
                  />
                  <div className="space-y-4">
                    {/* Company selector */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" /> Empresa
                      </label>
                      <select
                        {...register('companyId')}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          errors.companyId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar empresa...</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.companyId && (
                        <p className="text-xs text-red-500 mt-1">{errors.companyId.message}</p>
                      )}
                    </div>

                    {/* Sale Point selector */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                        <Store className="h-3.5 w-3.5 text-gray-400" /> Sucursal
                      </label>
                      {loadingSP ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
                          <Spinner size="sm" /> Cargando sucursales...
                        </div>
                      ) : (
                        <select
                          {...register('salePointId')}
                          disabled={!companyId}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 ${
                            errors.salePointId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">
                            {companyId ? 'Seleccionar sucursal...' : 'Primero selecciona empresa'}
                          </option>
                          {salePoints.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.salePointId && (
                        <p className="text-xs text-red-500 mt-1">{errors.salePointId.message}</p>
                      )}
                    </div>

                    {/* Import Type Selector */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                        Tipo de Importación
                      </label>
                      <div className="flex flex-col gap-2">
                        <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          importType === 'products'
                            ? 'border-primary-500 bg-primary-50/30 text-primary-950 font-medium'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                        }`}>
                          <input
                            type="radio"
                            value="products"
                            {...register('importType')}
                            className="mt-0.5 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <div>
                            <p className="text-xs font-bold">Solo Catálogo de Productos</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-normal">Sube únicamente nombres, categorías y variaciones de precios (5 columnas).</p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          importType === 'inventory'
                            ? 'border-primary-500 bg-primary-50/30 text-primary-950 font-medium'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                        }`}>
                          <input
                            type="radio"
                            value="inventory"
                            {...register('importType')}
                            className="mt-0.5 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <div>
                            <p className="text-xs font-bold">Productos + Inventario (Recetas BOM)</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-normal">Crea materias primas, registra stock inicial y vincula recetas a los productos (13 columnas).</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* CSV Uploader panel */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader
                    title="Archivo CSV"
                    description={
                      importType === 'products'
                        ? 'Formato esperado: Nombre; Categoría; Descripción; Variación; Precio'
                        : 'Formato esperado: CSV de 13 columnas incluyendo Tipo, Nombre Producto, Artículo Inventario, etc.'
                    }
                  />
                  <CsvUploader
                    key={`${importType}-${step}`}
                    onFileLoaded={handleFileLoaded}
                    disabled={!companyId || !salePointId}
                  />

                  {/* Template description blocks */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span>Formato de Plantilla del CSV:</span>
                    </div>

                    <AnimatePresence mode="wait">
                      {importType === 'products' ? (
                        <motion.div
                          key="hint-prod"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <code className="block text-[10px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
{`Nombre del Producto;Categoria;Descripcion;Variacion;Precio
Helado de Vainilla;Helados;Artesanal;Pequeño;8000
Helado de Vainilla;Helados;Artesanal;Mediano;12000
Helado de Vainilla;Helados;Artesanal;Grande;15000
Brownie;Postres;Brownie de chocolate;;7500`}
                          </code>
                          <p className="text-[10px] text-gray-400 mt-2.5">
                            💡 Si el <b>nombre del producto se repite</b> en múltiples filas, se agruparán automáticamente como variaciones del mismo producto. Si dejas vacía la "Variación", se asume tipo "Único".
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="hint-inv"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <code className="block text-[9px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
{`Tipo;Nombre Producto;Categoría Prod;Descripción;Variación;Precio Venta;Nombre Art Inventario;Cat Inv;Unidad;Costo Unit;Stock Inicial;Qty Receta;Alerta Min
ARTICULO;Manigueta Universal;Ferretería;Repuesto;;15000;Manigueta Universal;Repuestos;UNITS;5000;50;1;5
RECETA;Helado Vainilla;Helados;Artesanal;Pequeño;8000;Leche;Lácteos;MILLILITERS;3;0;200;5000
RECETA;Helado Vainilla;Helados;Artesanal;Pequeño;8000;Azúcar;Ingredientes;GRAMS;5;0;50;2000`}
                          </code>
                          <div className="mt-2.5 space-y-1 text-[10px] text-gray-400">
                            <p><b>ARTICULO</b>: Materia prima directa (1 venta = 1 reducción directa de stock).</p>
                            <p><b>RECETA</b>: Múltiples ingredientes. Cada fila asocia una materia prima a la receta de la variación del producto.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>

                {/* File summary bar */}
                {hasParseData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 text-xs">
                      {importType === 'products' && productsParseResult ? (
                        <>
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">{productsParseResult.products.length}</p>
                            <p className="text-[10px] text-gray-500">Productos</p>
                          </div>
                          <div className="h-6 w-px bg-gray-200" />
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{productsParseResult.validCount}</p>
                            <p className="text-[10px] text-gray-500">Válidos</p>
                          </div>
                          {productsParseResult.invalidCount > 0 && (
                            <>
                              <div className="h-6 w-px bg-gray-200" />
                              <div className="text-center">
                                <p className="text-lg font-bold text-red-500">{productsParseResult.invalidCount}</p>
                                <p className="text-[10px] text-gray-500">Errores</p>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        inventoryParseResult && (
                          <>
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900">{inventoryParseResult.products.length}</p>
                              <p className="text-[10px] text-gray-500">Productos</p>
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">{inventoryParseResult.inventoryItems.length}</p>
                              <p className="text-[10px] text-gray-500">Items Inv.</p>
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{inventoryParseResult.validCount}</p>
                              <p className="text-[10px] text-gray-500">Válidos</p>
                            </div>
                          </>
                        )
                      )}
                    </div>

                    <Button
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={goToPreview}
                      disabled={!canGoToPreview}
                    >
                      Revisar Archivo
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: Previewing CSV items */}
        {/* ========================================================= */}
        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Header / Actions bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                {importType === 'products' && productsParseResult ? (
                  <span>
                    <span className="font-semibold text-gray-900">{productsParseResult.products.length}</span> productos parseados ·{' '}
                    <span className="font-semibold text-green-600">{productsParseResult.validCount}</span> válidos
                    {productsParseResult.invalidCount > 0 && (
                      <>
                        {' · '}
                        <span className="font-semibold text-red-500">{productsParseResult.invalidCount}</span> con errores
                      </>
                    )}
                  </span>
                ) : (
                  inventoryParseResult && (
                    <span>
                      <span className="font-semibold text-gray-900">{inventoryParseResult.products.length}</span> productos ·{' '}
                      <span className="font-semibold text-blue-600">{inventoryParseResult.inventoryItems.length}</span> materias primas
                    </span>
                  )
                )}

                {importType === 'products' && productsParseResult && productsParseResult.invalidCount > 0 && (
                  <label className="flex items-center gap-2 text-[10px] cursor-pointer ml-4 px-2 py-0.5 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      checked={onlyValid}
                      onChange={(e) => setOnlyValid(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3 w-3"
                    />
                    Solo importar válidos
                  </label>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>
                  ← Volver
                </Button>
                <Button
                  size="sm"
                  icon={<Rocket className="h-4 w-4" />}
                  onClick={handleImport}
                  isLoading={importing}
                  disabled={importType === 'products' ? productsToImport.length === 0 : (inventoryParseResult?.validCount ?? 0) === 0}
                >
                  Importar Todo
                </Button>
              </div>
            </div>

            {/* Loading progress overlay */}
            {importing && progress && (
              <div className="space-y-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Spinner size="sm" />
                    {progressPhase || 'Importando registros...'}
                  </span>
                  <span className="font-bold text-gray-900">
                    {progress.done} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Table layout */}
            {importType === 'products' && productsParseResult && (
              <CsvPreviewTable products={productsParseResult.products} />
            )}
            {importType === 'inventory' && inventoryParseResult && (
              <InventoryCsvPreviewTable parseResult={inventoryParseResult} />
            )}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: Results Display */}
        {/* ========================================================= */}
        {step === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* General Results Summary Card */}
            <Card>
              <div className="py-6 text-center flex flex-col items-center">
                {/* Result icon decoration */}
                {((importType === 'products' && productsImportResult?.failed === 0) ||
                  (importType === 'inventory' && inventoryImportResult?.failed === 0)) ? (
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3 text-green-600 border border-green-200">
                    <Check className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mb-3 text-yellow-600 border border-yellow-200">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                )}

                <h2 className="text-lg font-bold text-gray-900">
                  {((importType === 'products' && productsImportResult?.failed === 0) ||
                    (importType === 'inventory' && inventoryImportResult?.failed === 0))
                    ? '¡Importación completada con éxito!'
                    : 'Importación finalizada con algunos detalles'}
                </h2>

                <p className="text-xs text-gray-500 mt-1 mb-6">
                  Los registros han sido procesados e inyectados en la base de datos de tu sucursal.
                </p>

                {/* Conditional Stats Grid */}
                {importType === 'products' && productsImportResult && (
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{productsImportResult.total}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Total</p>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{productsImportResult.successful}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Exitosos</p>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{productsImportResult.failed}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Fallidos</p>
                    </div>
                  </div>
                )}

                {importType === 'inventory' && inventoryImportResult && (
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-6 max-w-2xl">
                    <StatCard
                      label="Items Creados"
                      value={inventoryImportResult.itemsCreated}
                      icon={Package}
                      color="blue"
                    />
                    <StatCard
                      label="Items Reusados"
                      value={inventoryImportResult.itemsReused}
                      icon={Box}
                      color="gray"
                    />
                    <StatCard
                      label="Stock Carga"
                      value={inventoryImportResult.stockRegistered}
                      icon={Warehouse}
                      color="green"
                    />
                    <StatCard
                      label="Prod. Creados"
                      value={inventoryImportResult.productsCreated}
                      icon={ChefHat}
                      color="purple"
                    />
                    <StatCard
                      label="Prod. Update"
                      value={inventoryImportResult.productsUpdated}
                      icon={ChefHat}
                      color="orange"
                    />
                    <StatCard
                      label="Recetas BOM"
                      value={inventoryImportResult.recipesLinked}
                      icon={ChefHat}
                      color="green"
                    />
                    {inventoryImportResult.failed > 0 && (
                      <StatCard
                        label="Errores"
                        value={inventoryImportResult.failed}
                        icon={AlertTriangle}
                        color="red"
                      />
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3">
                  <Button variant="secondary" onClick={handleReset}>
                    Cargar Otro Archivo
                  </Button>

                  {((importType === 'products' && (productsImportResult?.failed ?? 0) > 0) ||
                    (importType === 'inventory' && (inventoryImportResult?.failed ?? 0) > 0)) && (
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

            {/* Errors Detail list */}
            {((importType === 'products' && productsImportResult && productsImportResult.errors.length > 0) ||
              (importType === 'inventory' && inventoryImportResult && inventoryImportResult.errors.length > 0)) && (
              <Card>
                <CardHeader
                  title="Detalle de Errores"
                  description="A continuación se enumeran los detalles de los productos que fallaron"
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(importType === 'products' ? productsImportResult!.errors : inventoryImportResult!.errors).map((err, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs p-2.5 bg-red-50/50 border border-red-100 rounded-lg text-red-800"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
