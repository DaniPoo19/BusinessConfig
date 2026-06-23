import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Crown,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  Shield,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, Spinner, Button, EmptyState } from '../ui';
import { useCompanies, useSubscriptions, usePlans } from '../../hooks';
import {
  STATUS_CONFIG,
  PERIOD_LABELS,
  formatCOP,
} from '../../types/subscription';
import type {
  Subscription,
  SubscriptionPlan,
} from '../../types/subscription';

interface BillingDashboardProps {
  onCompanyClick: (companyId: string) => void;
}

export function BillingDashboard({ onCompanyClick }: BillingDashboardProps) {
  const [search, setSearch] = useState('');

  const { data: subscriptionsData, isLoading: loadingSubs, refetch: refetchSubs } = useSubscriptions(100);
  const { companies = [], isLoading: loadingComps, refetch: refetchComps } = useCompanies();
  const { data: plansData, isLoading: loadingPlans, refetch: refetchPlans } = usePlans(false);

  const subscriptions = subscriptionsData?.data || [];
  const plans = plansData || [];
  const isLoading = loadingSubs || loadingComps || loadingPlans;

  const handleRefresh = () => {
    refetchSubs();
    refetchComps();
    refetchPlans();
  };

  // Stats
  const activeCount = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trial'
  ).length;
  const trialCount = subscriptions.filter((s) => s.status === 'trial').length;
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + s.final_price, 0);

  // Companies without subscription
  const subscribedCompanyIds = new Set(subscriptions.map((s) => s.company_id));
  const unsubscribedCompanies = companies.filter((c) => !subscribedCompanyIds.has(c.id));

  // Filtered subscriptions
  const filtered = subscriptions.filter(
    (s) =>
      (s.company_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (s.plan_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ====== KPI Cards ====== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Empresas Activas"
          value={activeCount.toString()}
          subtext={`de ${companies.length} registradas`}
          icon={<Building2 className="h-5 w-5" />}
          color="primary"
        />
        <KPICard
          label="En Prueba"
          value={trialCount.toString()}
          subtext="7 días de trial"
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <KPICard
          label="MRR"
          value={formatCOP(mrr)}
          subtext="Ingreso recurrente"
          icon={<TrendingUp className="h-5 w-5" />}
          color="emerald"
        />
        <KPICard
          label="Planes"
          value={plans.length.toString()}
          subtext="configurados"
          icon={<Crown className="h-5 w-5" />}
          color="accent"
        />
      </div>

      {/* ====== Plans Overview ====== */}
      <Card>
        <CardHeader
          title="Planes Disponibles"
          description="Estructura de precios actual"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} tier={index} />
          ))}
        </div>
      </Card>

      {/* ====== Subscriptions List ====== */}
      <Card>
        <CardHeader
          title="Suscripciones"
          description={`${subscriptions.length} suscripción${subscriptions.length !== 1 ? 'es' : ''} registrada${subscriptions.length !== 1 ? 's' : ''}`}
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
            >
              Actualizar
            </Button>
          }
        />

        {subscriptions.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por empresa o plan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
        )}

        {subscriptions.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-12 w-12" />}
            title="Sin suscripciones"
            description="Aún no hay suscripciones registradas. Selecciona una empresa para crear una."
          />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            No se encontraron suscripciones con "{search}"
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                subscription={sub}
                onClick={() => onCompanyClick(sub.company_id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ====== Unsubscribed Companies ====== */}
      {unsubscribedCompanies.length > 0 && (
        <Card>
          <CardHeader
            title="Empresas sin Suscripción"
            description="Empresas registradas sin plan activo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unsubscribedCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => onCompanyClick(company.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/30 transition-all text-left group"
              >
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary-100 transition-colors">
                  <Building2 className="h-5 w-5 text-gray-500 group-hover:text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {company.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{company.email}</p>
                </div>
                <Zap className="h-4 w-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

// ============================================
// KPI Card
// ============================================

function KPICard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  color: 'primary' | 'amber' | 'emerald' | 'accent';
}) {
  const colorMap = {
    primary: {
      bg: 'bg-primary-50',
      icon: 'bg-primary-100 text-primary-600',
      border: 'border-primary-100',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      border: 'border-amber-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      border: 'border-emerald-100',
    },
    accent: {
      bg: 'bg-accent-50',
      icon: 'bg-accent-100 text-accent-600',
      border: 'border-accent-100',
    },
  };
  const c = colorMap[color];

  return (
    <div
      className={`${c.bg} rounded-xl border ${c.border} p-5 transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${c.icon}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

// ============================================
// Plan Card
// ============================================

function PlanCard({ plan, tier }: { plan: SubscriptionPlan; tier: number }) {
  const tierStyles = [
    'border-gray-200 bg-white',
    'border-primary-200 bg-gradient-to-br from-primary-50 to-white ring-1 ring-primary-100',
    'border-accent-200 bg-gradient-to-br from-accent-50 to-white ring-1 ring-accent-100',
  ];
  const badgeStyles = [
    'bg-gray-100 text-gray-700',
    'bg-primary-100 text-primary-700',
    'bg-accent-100 text-accent-700',
  ];
  const icons = [
    <Shield key={0} className="h-5 w-5" />,
    <Zap key={1} className="h-5 w-5" />,
    <Crown key={2} className="h-5 w-5" />,
  ];

  return (
    <div
      className={`rounded-xl border p-5 ${tierStyles[tier] || tierStyles[0]} transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`p-1.5 rounded-lg ${badgeStyles[tier] || badgeStyles[0]}`}>
          {icons[tier] || icons[0]}
        </span>
        <h4 className="font-semibold text-gray-900 text-sm">{plan.name}</h4>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {formatCOP(plan.base_price_monthly)}
        <span className="text-xs font-normal text-gray-500">/mes</span>
      </p>
      <p className="text-xs text-gray-500 mb-4">{plan.description}</p>

      {/* Modules */}
      {plan.modules && plan.modules.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {plan.modules.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center gap-2 text-xs text-gray-600"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {mod.name}
            </div>
          ))}
        </div>
      )}

      {/* Discounts */}
      {plan.period_discounts && plan.period_discounts.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {plan.period_discounts
            .filter((d) => d.discount_percentage > 0)
            .map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-500">
                  {PERIOD_LABELS[d.period_type] || d.period_type}
                </span>
                <span className="font-medium text-emerald-600">
                  -{d.discount_percentage}%
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Subscription Row
// ============================================

function SubscriptionRow({
  subscription: sub,
  onClick,
}: {
  subscription: Subscription;
  onClick: () => void;
}) {
  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.expired;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-primary-200 transition-all text-left bg-white"
    >
      <div className="p-2.5 bg-primary-50 rounded-lg">
        <CreditCard className="h-5 w-5 text-primary-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {sub.company_name || 'Empresa'}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Crown className="h-3 w-3" /> {sub.plan_name || 'Sin plan'}
          </span>
          <span>
            {PERIOD_LABELS[sub.period_type] || sub.period_type}
          </span>
          <span className="font-medium text-gray-700">
            {formatCOP(sub.final_price)}
          </span>
          {sub.discount_applied > 0 && (
            <span className="text-emerald-600">-{sub.discount_applied}%</span>
          )}
          
          {/* Next Payment Date */}
          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200">
            <Clock className="h-3 w-3 text-gray-400" />
            {sub.status === 'trial' && sub.trial_ends_at ? (
              <span>Primer pago: {new Date(sub.trial_ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
            ) : sub.status === 'active' && sub.ends_at ? (
              <span>Próx. pago: {new Date(sub.ends_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
            ) : sub.status === 'past_due' ? (
              <span className="text-red-600 font-medium">Pago vencido</span>
            ) : (
              <span>Inactiva</span>
            )}
          </span>
        </div>
      </div>

      <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
    </button>
  );
}
