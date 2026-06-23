import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  plansApi,
  subscriptionsApi,
  companyRefsApi,
  paymentMethodsApi,
} from '../services/billingApi';
import type { PeriodType } from '../types/subscription';

// ============================================
// Queries
// ============================================

export function useSubscriptions(limit = 100) {
  return useQuery({
    queryKey: ['subscriptions', limit],
    queryFn: () => subscriptionsApi.list(limit),
  });
}

export function useCompanySubscriptions(companyId: string) {
  return useQuery({
    queryKey: ['companySubscriptions', companyId],
    queryFn: () => subscriptionsApi.listByCompany(companyId),
    enabled: !!companyId,
  });
}

export function useSubscriptionHistory(subId: string) {
  return useQuery({
    queryKey: ['subscriptionHistory', subId],
    queryFn: () => subscriptionsApi.getHistory(subId),
    enabled: !!subId,
  });
}

export function usePlans(activeOnly = true) {
  return useQuery({
    queryKey: ['plans', activeOnly],
    queryFn: () => plansApi.list(activeOnly),
  });
}

export function useCompanyRefs() {
  return useQuery({
    queryKey: ['companyRefs'],
    queryFn: () => companyRefsApi.list(),
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsApi.list(),
  });
}

export function useCompanyPaymentMethods(companyId: string) {
  return useQuery({
    queryKey: ['companyPaymentMethods', companyId],
    queryFn: () => paymentMethodsApi.getForCompany(companyId),
    enabled: !!companyId,
  });
}

// ============================================
// Mutations
// ============================================

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      salePointId,
      planId,
      periodType,
      overridePrice,
    }: {
      companyId: string;
      salePointId: string;
      planId: string;
      periodType: PeriodType;
      overridePrice?: number;
    }) =>
      subscriptionsApi.create(
        companyId,
        salePointId,
        planId,
        periodType,
        overridePrice
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['companySubscriptions', variables.companyId],
      });
    },
  });
}

export function useActivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.activate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['companySubscriptions', data.company_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['subscriptionHistory', data.id],
      });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.recordPayment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['companySubscriptions', data.company_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['subscriptionHistory', data.id],
      });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancel(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['companySubscriptions', data.company_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['subscriptionHistory', data.id],
      });
    },
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newPlanId,
      overridePrice,
    }: {
      id: string;
      newPlanId: string;
      overridePrice?: number;
    }) => subscriptionsApi.changePlan(id, newPlanId, overridePrice),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({
        queryKey: ['companySubscriptions', data.company_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['subscriptionHistory', data.id],
      });
    },
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      paymentMethodId,
    }: {
      companyId: string;
      paymentMethodId: string;
    }) => paymentMethodsApi.setForCompany(companyId, paymentMethodId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['companyPaymentMethods', variables.companyId],
      });
    },
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      paymentMethodId,
    }: {
      companyId: string;
      paymentMethodId: string;
    }) => paymentMethodsApi.removeFromCompany(companyId, paymentMethodId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['companyPaymentMethods', variables.companyId],
      });
    },
  });
}

export function useUpdatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, basePriceMonthly }: { id: string; basePriceMonthly: number }) =>
      plansApi.updatePrice(id, basePriceMonthly),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdatePlanDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      periodType,
      discountPercentage,
    }: {
      planId: string;
      periodType: PeriodType;
      discountPercentage: number;
    }) => plansApi.updateDiscount(planId, periodType, discountPercentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
