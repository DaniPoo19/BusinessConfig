import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../services/adminApi';
import { subscriptionsApi, plansApi } from '../services/billingApi';
import { MODULE_CATALOG } from '../types/modules';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../types/subscription';
import type { Company } from '../types/company';

export type TimeRangeFilter = 'this_month' | 'quarter' | 'year' | 'all';

export interface ModuleAdoptionMetric {
  id: string;
  label: string;
  icon: string;
  description: string;
  activeCount: number;
  adoptionPercentage: number;
}

export interface PlanDistributionMetric {
  planId: string;
  planName: string;
  companyCount: number;
  percentage: number;
  monthlyRevenue: number;
  color: string;
}

export interface TemplateDistributionMetric {
  type: string;
  label: string;
  count: number;
  percentage: number;
  icon: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  email: string;
  businessType: string;
  salePointsCount: number;
  status: SubscriptionStatus | 'unassigned';
  planName: string;
  monthlyPrice: number;
  createdAt: string;
}

export function useSaaSMetrics(timeRange: TimeRangeFilter = 'all') {
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['metrics-companies'],
    queryFn: () => companiesApi.getAll(200, 0),
  });

  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ['metrics-subscriptions'],
    queryFn: () => subscriptionsApi.list(200),
  });

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['metrics-plans'],
    queryFn: () => plansApi.list(false),
  });

  const isLoading = isLoadingCompanies || isLoadingSubscriptions || isLoadingPlans;

  const metrics = useMemo(() => {
    const companies: Company[] = Array.isArray(companiesData) ? companiesData : companiesData?.companies || [];
    const subscriptions: Subscription[] = Array.isArray(subscriptionsData) ? subscriptionsData : (subscriptionsData as any)?.data || [];
    const plans: SubscriptionPlan[] = Array.isArray(plansData) ? plansData : (plansData as any)?.data || [];

    // Filter by timeRange if necessary
    const now = new Date();
    const filterDate = new Date();
    if (timeRange === 'this_month') {
      filterDate.setDate(1);
      filterDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'quarter') {
      filterDate.setMonth(now.getMonth() - 3);
    } else if (timeRange === 'year') {
      filterDate.setFullYear(now.getFullYear() - 1);
    } else {
      filterDate.setFullYear(2000);
    }

    const filteredCompanies = companies.filter(c => {
      if (timeRange === 'all') return true;
      const createdAt = new Date(c.created_at || Date.now());
      return createdAt >= filterDate;
    });

    const totalCompanies = filteredCompanies.length;

    // Status breakdown
    const statusCounts: Record<SubscriptionStatus | 'unassigned', number> = {
      active: 0,
      trial: 0,
      past_due: 0,
      cancelled: 0,
      expired: 0,
      unassigned: 0,
    };

    let totalSalePoints = 0;
    let mrr = 0;

    // Map plan price by id
    const planMap = new Map<string, SubscriptionPlan>();
    plans.forEach(p => planMap.set(p.id, p));

    // Subscription mapping by company ID
    const companySubMap = new Map<string, Subscription>();
    subscriptions.forEach(sub => {
      companySubMap.set(sub.company_id, sub);
    });

    // Tenants table items
    const tenantSummaries: TenantSummary[] = [];

    // Plan count mapping
    const planCountsMap = new Map<string, { count: number; revenue: number; name: string }>();

    // Module adoption counters
    const moduleCounts: Record<string, number> = {
      kitchen: 0,
      delivery: 0,
      metrics: 0,
      inventory: 0,
      pos: 0,
    };

    // Template counts
    let foodStoreCount = 0;
    let articleStoreCount = 0;

    filteredCompanies.forEach(company => {
      const spCount = company.sale_points_count || company.sale_points?.length || 1;
      totalSalePoints += spCount;

      const sub = companySubMap.get(company.id);
      const status: SubscriptionStatus | 'unassigned' = sub ? sub.status : 'unassigned';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Business template
      if (company.business_type === 'ARTICLE_STORE') {
        articleStoreCount++;
      } else {
        foodStoreCount++;
      }

      // Calculate MRR contribution if active or trial
      let companyMonthlyPrice = 0;
      let planName = 'Sin Plan';

      if (sub && (sub.status === 'active' || sub.status === 'trial')) {
        const plan = planMap.get(sub.plan_id);
        planName = plan ? plan.name : 'Personalizado';
        let basePrice = sub.override_price !== undefined && sub.override_price !== null ? sub.override_price : (plan?.base_price_monthly || 0);

        // Apply discount if 6_months or annual
        if (sub.discount_percentage && sub.discount_percentage > 0) {
          basePrice = basePrice * (1 - sub.discount_percentage / 100);
        }

        companyMonthlyPrice = basePrice * spCount;
        mrr += companyMonthlyPrice;

        // Plan distribution
        const pKey = plan?.id || 'custom';
        const existingPlanStats = planCountsMap.get(pKey) || { count: 0, revenue: 0, name: planName };
        existingPlanStats.count++;
        existingPlanStats.revenue += companyMonthlyPrice;
        planCountsMap.set(pKey, existingPlanStats);

        // Modules included in this plan
        if (plan?.modules) {
          plan.modules.forEach(m => {
            const modId = m.slug || m.id;
            if (moduleCounts[modId] !== undefined) {
              moduleCounts[modId]++;
            }
          });
        }
      }

      tenantSummaries.push({
        id: company.id,
        name: company.name,
        email: company.email || 'sin-correo@negocio.com',
        businessType: company.business_type || 'FOOD_STORE',
        salePointsCount: spCount,
        status,
        planName,
        monthlyPrice: companyMonthlyPrice,
        createdAt: company.created_at || new Date().toISOString(),
      });
    });

    const arr = mrr * 12;
    const activeCompanies = statusCounts.active + statusCounts.trial;
    const arpu = activeCompanies > 0 ? Math.round(mrr / activeCompanies) : 0;
    const retentionRate = totalCompanies > 0 ? Math.round(((statusCounts.active + statusCounts.trial) / totalCompanies) * 100) : 100;

    // Build Module Adoption metrics
    const moduleAdoption: ModuleAdoptionMetric[] = MODULE_CATALOG.map(mod => {
      const activeCount = moduleCounts[mod.id] || 0;
      const adoptionPercentage = totalCompanies > 0 ? Math.round((activeCount / totalCompanies) * 100) : 0;
      return {
        id: mod.id,
        label: mod.label,
        icon: mod.icon,
        description: mod.description,
        activeCount,
        adoptionPercentage,
      };
    });

    // Build Plan Distribution metrics
    const PLAN_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const planDistribution: PlanDistributionMetric[] = Array.from(planCountsMap.entries()).map(([planId, data], index) => ({
      planId,
      planName: data.name,
      companyCount: data.count,
      percentage: activeCompanies > 0 ? Math.round((data.count / activeCompanies) * 100) : 0,
      monthlyRevenue: data.revenue,
      color: PLAN_COLORS[index % PLAN_COLORS.length],
    }));

    // Build Template Distribution metrics
    const templateDistribution: TemplateDistributionMetric[] = [
      {
        type: 'FOOD_STORE',
        label: 'Comidas y Bebidas (Heladerías / Restaurantes)',
        count: foodStoreCount,
        percentage: totalCompanies > 0 ? Math.round((foodStoreCount / totalCompanies) * 100) : 0,
        icon: '🍦',
      },
      {
        type: 'ARTICLE_STORE',
        label: 'Tienda de Artículos / Comercio Directo',
        count: articleStoreCount,
        percentage: totalCompanies > 0 ? Math.round((articleStoreCount / totalCompanies) * 100) : 0,
        icon: '🏪',
      },
    ];

    return {
      totalCompanies,
      totalSalePoints,
      mrr,
      arr,
      arpu,
      retentionRate,
      statusCounts,
      moduleAdoption,
      planDistribution,
      templateDistribution,
      tenantSummaries,
    };
  }, [companiesData, subscriptionsData, plansData, timeRange]);

  return {
    metrics,
    isLoading,
  };
}
