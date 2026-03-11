import { useState, useCallback, useEffect } from 'react';
import { companiesApi, salePointsApi } from '../services/adminApi';
import { parametersApi } from '../services/parametersApi';
import type {
  Company,
  SalePoint,
  Parameter,
  BusinessHoursValue,
  DeliveryCostValue,
} from '../types/company';

// ============================================
// useCompanies — List all companies
// ============================================

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await companiesApi.getAll(100, 0);
      setCompanies(res.companies);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { companies, total, isLoading, error, refetch: fetch };
}

// ============================================
// useSalePoints — Sale points for a company
// ============================================

export function useSalePoints(companyId: string | null) {
  const [salePoints, setSalePoints] = useState<SalePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) {
      setSalePoints([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await salePointsApi.getByCompany(companyId);
      setSalePoints(res.salePoints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar sucursales');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { salePoints, isLoading, error, refetch: fetch };
}

// ============================================
// useParameters — Parameters for a sale point
// ============================================

export function useParameters(companyId: string | null, salePointId: string | null) {
  const [businessHours, setBusinessHours] = useState<Parameter<BusinessHoursValue> | null>(null);
  const [deliveryCosts, setDeliveryCosts] = useState<Parameter<DeliveryCostValue> | null>(null);
  const [allParameters, setAllParameters] = useState<Parameter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId || !salePointId) {
      setBusinessHours(null);
      setDeliveryCosts(null);
      setAllParameters([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [bh, dc, all] = await Promise.all([
        parametersApi.getBusinessHours(companyId, salePointId),
        parametersApi.getDeliveryCosts(companyId, salePointId),
        parametersApi.getAll(companyId, salePointId),
      ]);
      setBusinessHours(bh);
      setDeliveryCosts(dc);
      setAllParameters(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar parámetros');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, salePointId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { businessHours, deliveryCosts, allParameters, isLoading, error, refetch: fetch };
}
