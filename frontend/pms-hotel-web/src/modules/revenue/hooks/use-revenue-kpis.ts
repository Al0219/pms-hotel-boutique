"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchRevenueKpisDto } from "../service/revenue-kpi.service";
import {
  mapRevenueKpiFiltersToDto,
  mapRevenueKpiResponseToDomain,
} from "../mappers/revenue-kpi.mapper";
import type { RevenueKpi, RevenueKpiFilters } from "../model/revenue-kpi";

export interface UseRevenueKpisResult {
  kpis: RevenueKpi | null;
  isLoading: boolean;
  error: string | null;
  loadRevenueKpis: (filters: RevenueKpiFilters) => Promise<void>;
}

export function useRevenueKpis(initialFilters?: RevenueKpiFilters): UseRevenueKpisResult {
  const [kpis, setKpis] = useState<RevenueKpi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRevenueKpis = useCallback(async (filters: RevenueKpiFilters) => {
    if (!filters?.propertyId || !filters?.startDate || !filters?.endDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const dtoRequest = mapRevenueKpiFiltersToDto(filters);
      const dtoResponse = await fetchRevenueKpisDto(dtoRequest);
      const domainKpi = mapRevenueKpiResponseToDomain(dtoResponse);
      setKpis(domainKpi);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar KPIs de Revenue";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const propId = initialFilters?.propertyId;
  const sDate = initialFilters?.startDate;
  const eDate = initialFilters?.endDate;

  useEffect(() => {
    let isCancelled = false;
    if (propId && sDate && eDate) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const dtoRequest = mapRevenueKpiFiltersToDto({
            propertyId: propId,
            startDate: sDate,
            endDate: eDate,
          });
          const dtoResponse = await fetchRevenueKpisDto(dtoRequest);
          if (!isCancelled) {
            setKpis(mapRevenueKpiResponseToDomain(dtoResponse));
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : "Error al cargar KPIs de Revenue");
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      };

      void fetchInitial();
    }
    return () => {
      isCancelled = true;
    };
  }, [propId, sDate, eDate]);

  return {
    kpis,
    isLoading,
    error,
    loadRevenueKpis,
  };
}
