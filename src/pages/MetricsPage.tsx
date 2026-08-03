import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Building2,
  MapPin,
  DollarSign,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  BarChart3,
  Search,
} from 'lucide-react';
import { Card, Button, Spinner, EmptyState } from '../components/ui';
import { toast } from '../components/ui/Toast';
import { useSaaSMetrics, TimeRangeFilter } from '../hooks/useSaaSMetrics';
import { formatCOP, STATUS_CONFIG } from '../types/subscription';
import { useNavigate } from 'react-router-dom';

type MetricTab = 'overview' | 'modules' | 'plans' | 'tenants';

const ITEMS_PER_PAGE = 8;

export function MetricsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MetricTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { metrics, isLoading } = useSaaSMetrics(timeRange);

  // Filtered and paginated tenants
  const filteredTenants = useMemo(() => {
    if (!metrics?.tenantSummaries) return [];
    return metrics.tenantSummaries.filter(t =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.planName.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [metrics?.tenantSummaries, searchFilter]);

  const totalPages = Math.ceil(filteredTenants.length / ITEMS_PER_PAGE) || 1;
  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTenants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTenants, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchFilter(val);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (!metrics || metrics.tenantSummaries.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['ID', 'Nombre Empresa', 'Correo', 'Tipo Negocio', 'Sucursales', 'Estado Suscripcion', 'Plan', 'Precio Mensual COP', 'Fecha Registro'];
    const rows = metrics.tenantSummaries.map(t => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      t.email,
      t.businessType === 'ARTICLE_STORE' ? 'Tienda Articulos' : 'Heladeria / Alimentos',
      t.salePointsCount,
      t.status,
      t.planName,
      t.monthlyPrice,
      new Date(t.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_metricas_saas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte descargado correctamente');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-gray-500 mt-3">Cargando métricas de la plataforma...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<BarChart3 className="w-12 h-12 text-gray-400" />}
          title="Sin datos disponibles"
          description="No se pudieron cargar los datos de la plataforma en este momento."
        />
      </div>
    );
  }

  const tabs: { id: MetricTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Resumen General', icon: BarChart3 },
    { id: 'modules', label: 'Adopción de Módulos', icon: Layers },
    { id: 'plans', label: 'Planes de Suscripción', icon: Package },
    { id: 'tenants', label: 'Empresas Arrendatarias', icon: Building2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-xl text-primary-700">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Métricas de Plataforma</h1>
            <p className="text-xs text-gray-500">
              Analítica de ingresos recurrentes, salud de clientes y penetración de módulos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            {(
              [
                { id: 'all', label: 'Todo' },
                { id: 'this_month', label: 'Este Mes' },
                { id: 'quarter', label: 'Trimestre' },
                { id: 'year', label: 'Año' },
              ] as { id: TimeRangeFilter; label: string }[]
            ).map(item => (
              <button
                key={item.id}
                onClick={() => setTimeRange(item.id)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  timeRange === item.id
                    ? 'bg-white text-primary-700 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleExportCSV}
            variant="secondary"
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-0.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? 'border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Icon className={`w-4 h-4 ${activeTab === id ? 'text-primary-600' : 'text-gray-400'}`} />
            {label}
            {id === 'tenants' && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-full">
                {metrics.totalCompanies}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Primary Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-primary-600 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingreso Mensual (MRR)</span>
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">{formatCOP(metrics.mrr)}</h2>
                    <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      ARR Estimado: {formatCOP(metrics.arr)}/año
                    </p>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresas Arrendatarias</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">{metrics.totalCompanies}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="text-emerald-600 font-semibold">{metrics.statusCounts.active} activas</span> ·{' '}
                      <span className="text-amber-600 font-semibold">{metrics.statusCounts.trial} en prueba</span>
                    </p>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-sky-500 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sucursales Activas</span>
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">{metrics.totalSalePoints}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Promedio: {(metrics.totalCompanies > 0 ? (metrics.totalSalePoints / metrics.totalCompanies).toFixed(1) : '1.0')} sedes/empresa
                    </p>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-accent-500 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ARPU Mensual</span>
                    <div className="p-2 bg-accent-50 text-accent-600 rounded-lg">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h2 className="text-2xl font-bold text-gray-900">{formatCOP(metrics.arpu)}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Retención de clientes: <strong className="text-primary-600">{metrics.retentionRate}%</strong>
                    </p>
                  </div>
                </Card>
              </div>

              {/* Status Health Grid */}
              <Card className="p-5 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Salud y Licenciamiento de Suscripciones</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Activas</p>
                      <p className="text-lg font-bold text-emerald-900">{metrics.statusCounts.active}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">En Prueba (Trial)</p>
                      <p className="text-lg font-bold text-amber-900">{metrics.statusCounts.trial}</p>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">Pago Pendiente</p>
                      <p className="text-lg font-bold text-red-900">{metrics.statusCounts.past_due}</p>
                    </div>
                  </div>

                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Inactivas</p>
                      <p className="text-lg font-bold text-gray-800">{metrics.statusCounts.cancelled + metrics.statusCounts.expired}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Módulos más Populares</h3>
                    <p className="text-xs text-gray-500 mb-4">Módulos con mayor porcentaje de habilitación en clientes.</p>
                    
                    <div className="space-y-3">
                      {metrics.moduleAdoption.slice(0, 3).map(mod => (
                        <div key={mod.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-gray-800">
                            <span>{mod.icon}</span>
                            {mod.label}
                          </span>
                          <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                            {mod.adoptionPercentage}% ({mod.activeCount} licencias)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setActiveTab('modules')}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      Ver detalle de módulos <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>

                <Card className="p-5 border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Modelo de Negocio Predominante</h3>
                    <p className="text-xs text-gray-500 mb-4">Plantilla operativa contratada por las empresas.</p>
                    
                    <div className="space-y-3">
                      {metrics.templateDistribution.map(t => (
                        <div key={t.type} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-gray-800">
                            <span>{t.icon}</span>
                            {t.label}
                          </span>
                          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {t.count} empresas ({t.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setActiveTab('tenants')}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      Ver empresas <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: MODULES */}
          {activeTab === 'modules' && (
            <Card className="p-6 border border-gray-200 space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  Adopción y Penetración de Módulos Premium
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Métricas de penetración y conteo de empresas clientes con licencias activas en cada módulo del sistema.
                </p>
              </div>

              <div className="space-y-4">
                {metrics.moduleAdoption.map(mod => (
                  <div key={mod.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mod.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{mod.label}</h4>
                          <p className="text-xs text-gray-500">{mod.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{mod.activeCount} empresas</span>
                        <span className="text-xs font-bold text-primary-600 block">{mod.adoptionPercentage}% penetración</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${mod.adoptionPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 3: PLANS */}
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  Distribución por Planes de Suscripción
                </h3>
                <p className="text-xs text-gray-500 mb-6">Empresas e ingresos mensuales generados según el plan contratado.</p>

                {metrics.planDistribution.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-8">No hay suscripciones asignadas.</p>
                ) : (
                  <div className="space-y-4">
                    {metrics.planDistribution.map(p => (
                      <div key={p.planId} className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-gray-900 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.planName}
                          </span>
                          <span className="text-gray-600">
                            {p.companyCount} empresas ({p.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <div className="text-right text-xs text-primary-700 font-bold mt-1">
                          Facturación: {formatCOP(p.monthlyRevenue)}/mes
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 border border-gray-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Acción y Configuración</h3>
                  <p className="text-xs text-gray-500 mb-4">Ajusta precios base, descuentos o módulos por plan.</p>

                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-xs text-primary-800 space-y-2">
                    <p className="font-bold">¿Deseas agregar nuevos módulos o ajustar precios?</p>
                    <p>Puedes crear nuevos planes de suscripción o modificar los módulos incluidos desde el apartado de configuración de planes.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <Button onClick={() => navigate('/configuracion/planes')}>
                    Ir a Configurar Planes
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: TENANTS DIRECTORY WITH PAGINATION */}
          {activeTab === 'tenants' && (
            <Card className="p-6 border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Directorio de Empresas Arrendatarias</h3>
                  <p className="text-xs text-gray-500">Resumen de licencias, sedes e ingresos por empresa.</p>
                </div>

                <div className="relative min-w-[260px]">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Buscar empresa, correo o plan..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {paginatedTenants.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="w-10 h-10 text-gray-400" />}
                  title="No se encontraron empresas"
                  description={searchFilter ? `No hay resultados para "${searchFilter}"` : 'No hay empresas registradas.'}
                />
              ) : (
                <>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider font-bold border-b border-gray-200">
                          <th className="py-2.5 px-3">Empresa</th>
                          <th className="py-2.5 px-3">Modelo</th>
                          <th className="py-2.5 px-3">Sucursales</th>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3">Plan</th>
                          <th className="py-2.5 px-3 text-right">Mensualidad</th>
                          <th className="py-2.5 px-3 text-center">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedTenants.map(tenant => {
                          const statusConf = STATUS_CONFIG[tenant.status as keyof typeof STATUS_CONFIG] || { label: 'Sin Suscripción', color: 'text-gray-600', bg: 'bg-gray-100' };
                          return (
                            <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-gray-900">{tenant.name}</p>
                                <p className="text-[10px] text-gray-400">{tenant.email}</p>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  {tenant.businessType === 'ARTICLE_STORE' ? '🏪 Artículos' : '🍦 Comidas'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-gray-800">
                                {tenant.salePointsCount} {tenant.salePointsCount === 1 ? 'sede' : 'sedes'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusConf.bg} ${statusConf.color}`}>
                                  {statusConf.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-gray-800">
                                {tenant.planName}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                                {formatCOP(tenant.monthlyPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => navigate(`/empresas/${tenant.id}`)}
                                  className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                  title="Ver empresa"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-xs text-gray-500">
                    <p>
                      Mostrando <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> a <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredTenants.length)}</strong> de <strong>{filteredTenants.length}</strong> empresas
                    </p>

                    <div className="flex items-center gap-1.5 self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="py-1 px-2.5 text-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Anterior
                      </Button>

                      <span className="px-3 py-1 font-bold text-gray-700">
                        Página {currentPage} de {totalPages}
                      </span>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="py-1 px-2.5 text-xs"
                      >
                        Siguiente
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
