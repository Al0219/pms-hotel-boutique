"use client";

import { useState, useCallback, useEffect } from "react";
import {
  fetchRateRestrictionsDto,
  batchUpdateRateRestrictionsDto,
} from "../service/rate-restriction.service";
import {
  toDomainRateRestriction,
  toDtoRateRestrictionQuery,
  toDtoBatchUpdatePayload,
  toDomainRateRestrictionBatchResult,
} from "../mappers/rate-restriction.mapper";
import type {
  RateRestriction,
  RateRestrictionFilter,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "../model/rate-restriction";

export interface UseRateRestrictionsResult {
  restrictions: RateRestriction[];
  isLoading: boolean;
  error: string | null;
  loadRestrictions: (filter: RateRestrictionFilter) => Promise<void>;
  updateBatch: (params: BatchUpdateRateRestrictionsParams) => Promise<RateRestrictionBatchResult>;
}

export function useRateRestrictions(initialFilter?: RateRestrictionFilter): UseRateRestrictionsResult {
  const [restrictions, setRestrictions] = useState<RateRestriction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRestrictions = useCallback(async (filter: RateRestrictionFilter) => {
    if (!filter?.propertyId || !filter?.startDate || !filter?.endDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const queryDto = toDtoRateRestrictionQuery(filter);
      const resDto = await fetchRateRestrictionsDto(queryDto);
      const domainItems = (resDto.restrictions || []).map(toDomainRateRestriction);
      setRestrictions(domainItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar restricciones";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBatch = useCallback(
    async (params: BatchUpdateRateRestrictionsParams): Promise<RateRestrictionBatchResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const payloadDto = toDtoBatchUpdatePayload(params);
        const resDto = await batchUpdateRateRestrictionsDto(payloadDto);
        const result = toDomainRateRestrictionBatchResult(resDto);
        if (result.success && result.restrictions.length > 0) {
          setRestrictions((prev) => {
            const updatedMap = new Map(result.restrictions.map((r) => [`${r.ratePlanId}-${r.roomTypeId}-${r.date}`, r]));
            return prev.map((item) => updatedMap.get(`${item.ratePlanId}-${item.roomTypeId}-${item.date}`) || item);
          });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar restricciones";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const propId = initialFilter?.propertyId;
  const sDate = initialFilter?.startDate;
  const eDate = initialFilter?.endDate;
  const rpId = initialFilter?.ratePlanId;
  const rtId = initialFilter?.roomTypeId;

  useEffect(() => {
    let isCancelled = false;
    if (propId && sDate && eDate) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const queryDto = toDtoRateRestrictionQuery({
            propertyId: propId,
            startDate: sDate,
            endDate: eDate,
            ratePlanId: rpId,
            roomTypeId: rtId,
          });
          const resDto = await fetchRateRestrictionsDto(queryDto);
          if (!isCancelled) {
            setRestrictions((resDto.restrictions || []).map(toDomainRateRestriction));
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : "Error al cargar restricciones");
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
  }, [propId, sDate, eDate, rpId, rtId]);

  return {
    restrictions,
    isLoading,
    error,
    loadRestrictions,
    updateBatch,
  };
}
