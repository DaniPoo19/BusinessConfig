import { useQuery } from '@tanstack/react-query';
import { companiesApi, salePointsApi } from '../services/adminApi';
import { parametersApi } from '../services/parametersApi';

// ============================================
// useCompanies — List all companies
// ============================================

export function useCompanies() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll(100, 0),
  });

  return { 
    companies: data?.companies || [], 
    total: data?.total || 0, 
    isLoading, 
    error: error instanceof Error ? error.message : null, 
    refetch 
  };
}

// ============================================
// useSalePoints — Sale points for a company
// ============================================

export function useSalePoints(companyId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['salePoints', companyId],
    queryFn: () => salePointsApi.getByCompany(companyId!),
    enabled: !!companyId,
  });

  return { 
    salePoints: data?.salePoints || [], 
    isLoading, 
    error: error instanceof Error ? error.message : null, 
    refetch 
  };
}

// ============================================
// useParameters — Parameters for a sale point
// ============================================

export function useParameters(companyId: string | null, salePointId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['parameters', companyId, salePointId],
    queryFn: async () => {
      const [bh, dc, all] = await Promise.all([
        parametersApi.getBusinessHours(companyId!, salePointId!),
        parametersApi.getDeliveryCosts(companyId!, salePointId!),
        parametersApi.getAll(companyId!, salePointId!),
      ]);
      return { bh, dc, all };
    },
    enabled: !!companyId && !!salePointId,
  });

  return { 
    businessHours: data?.bh || null, 
    deliveryCosts: data?.dc || null, 
    allParameters: data?.all || [], 
    isLoading, 
    error: error instanceof Error ? error.message : null, 
    refetch 
  };
}
