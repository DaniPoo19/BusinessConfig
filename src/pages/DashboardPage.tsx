import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2,
  Store,
  ArrowRightLeft,
  FileSpreadsheet,
  Package,
  PlusCircle,
  LayoutDashboard,
  ShieldCheck,
  ChefHat,
  Truck,
  BarChart3,
  Boxes,
} from 'lucide-react';
import { Card, CardHeader, Spinner } from '../components/ui';
import { companiesApi, salePointsApi } from '../services/adminApi';
import { parametersApi } from '../services/parametersApi';
import { ENABLED_MODULES_KEY, type EnabledModulesValue } from '../types/modules';

export function DashboardPage() {
  const navigate = useNavigate();

  // 1. Fetch all companies
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await companiesApi.getAll(100, 0);
      return res.companies;
    },
  });

  // 2. Fetch sale points and module parameters for all companies
  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['companyDetails', companies.map((c) => c.id)],
    queryFn: async () => {
      if (companies.length === 0) return { salePointsCount: 0, modulesDistribution: { kitchen: 0, delivery: 0, metrics: 0, inventory: 0 } };

      const promises = companies.map(async (company) => {
        const [spRes, modParam] = await Promise.all([
          salePointsApi.getByCompany(company.id).catch(() => ({ count: 0 })),
          parametersApi.getByKey(ENABLED_MODULES_KEY, company.id).catch(() => null),
        ]);

        const enabledModules = (modParam?.value as unknown as EnabledModulesValue)?.modules;
        
        return {
          salePointsCount: spRes.count || 0,
          modules: {
            kitchen: enabledModules?.kitchen?.enabled ? 1 : 0,
            delivery: enabledModules?.delivery?.enabled ? 1 : 0,
            metrics: enabledModules?.metrics?.enabled ? 1 : 0,
            inventory: enabledModules?.inventory?.enabled ? 1 : 0,
          },
        };
      });

      const results = await Promise.all(promises);

      return results.reduce(
        (acc, curr) => {
          acc.salePointsCount += curr.salePointsCount;
          acc.modulesDistribution.kitchen += curr.modules.kitchen;
          acc.modulesDistribution.delivery += curr.modules.delivery;
          acc.modulesDistribution.metrics += curr.modules.metrics;
          acc.modulesDistribution.inventory += curr.modules.inventory;
          return acc;
        },
        {
          salePointsCount: 0,
          modulesDistribution: { kitchen: 0, delivery: 0, metrics: 0, inventory: 0 },
        }
      );
    },
    enabled: companies.length > 0,
  });

  const isLoading = isLoadingCompanies || isLoadingDetails;

  const stats = [
    {
      title: 'Empresas Registradas',
      value: companies.length,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Sucursales (Puntos de Venta)',
      value: details?.salePointsCount ?? 0,
      icon: Store,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Licencias de Módulos Activas',
      value: details
        ? Object.values(details.modulesDistribution).reduce((a, b) => a + b, 0)
        : 0,
      icon: ShieldCheck,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
  ];

  const modules = [
    {
      id: 'kitchen',
      label: 'Módulo Cocina',
      count: details?.modulesDistribution.kitchen ?? 0,
      icon: ChefHat,
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      description: 'Pantallas de cocina activadas para monitoreo de pedidos en tiempo real.',
    },
    {
      id: 'delivery',
      label: 'Módulo Domicilios',
      count: details?.modulesDistribution.delivery ?? 0,
      icon: Truck,
      color: 'bg-sky-50 text-sky-600 border-sky-100',
      description: 'Gestión de repartidores asignados y control de estado de entregas.',
    },
    {
      id: 'metrics',
      label: 'Módulo Métricas',
      count: details?.modulesDistribution.metrics ?? 0,
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      description: 'Acceso a tableros de estadísticas y exportación de reportes de ventas.',
    },
    {
      id: 'inventory',
      label: 'Módulo Inventario',
      count: details?.modulesDistribution.inventory ?? 0,
      icon: Boxes,
      color: 'bg-pink-50 text-pink-600 border-pink-100',
      description: 'Control de existencias de materias primas y enlace de recetas BOM.',
    },
  ];

  const quickActions = [
    {
      title: 'Nueva Empresa',
      description: 'Registra un nuevo negocio y configura su tipo de tienda inicial.',
      icon: PlusCircle,
      action: () => navigate('/empresas/nueva'),
      color: 'hover:border-blue-300 hover:bg-blue-50/20 text-blue-600',
    },
    {
      title: 'Copiar Parámetros',
      description: 'Replica horarios, productos o coberturas de una sucursal a otra.',
      icon: ArrowRightLeft,
      action: () => navigate('/importar-parametros'),
      color: 'hover:border-emerald-300 hover:bg-emerald-50/20 text-emerald-600',
    },
    {
      title: 'Importar Catálogo (CSV)',
      description: 'Carga productos de forma masiva para poblar menús rápidamente.',
      icon: FileSpreadsheet,
      action: () => navigate('/importar-csv', { state: { importType: 'products' } }),
      color: 'hover:border-purple-300 hover:bg-purple-50/20 text-purple-600',
    },
    {
      title: 'Importar Inventario (CSV)',
      description: 'Registra artículos de materia prima, stock inicial y recetas de producción.',
      icon: Package,
      action: () => navigate('/importar-csv', { state: { importType: 'inventory' } }),
      color: 'hover:border-orange-300 hover:bg-orange-50/20 text-orange-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">
          Cargando panel de control...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary-600" />
            Panel General de Configuración
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa el estado de licenciamiento de la plataforma y realiza tareas administrativas de soporte.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className={`border rounded-2xl p-6 bg-white shadow-sm flex items-center gap-4 ${stat.color.split(' ')[2]}`}
          >
            <div className={`p-3.5 rounded-xl border ${stat.color.split(' ').slice(0, 2).join(' ')}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {stat.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Licensing Modules Distribution */}
      <Card>
        <CardHeader
          title="Distribución de Módulos Activos"
          description="Módulos premium habilitados a nivel de empresa en toda la plataforma."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {modules.map((mod, index) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08, duration: 0.25 }}
              className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg border ${mod.color}`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full font-bold text-gray-700">
                    {mod.count} Activo{mod.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {mod.label}
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Accesos Directos de Soporte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.title}
              onClick={action.action}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex flex-col items-start text-left p-5 rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 ${action.color}`}
            >
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl mb-4 group-hover:bg-white">
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {action.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {action.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
