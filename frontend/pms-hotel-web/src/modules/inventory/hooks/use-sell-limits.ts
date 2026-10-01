"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchSellLimitsDto, updateSellLimitDto } from "../service/sell-limit.service";
import {
  toDomainSellLimitList,
  toDomainSellLimit,
  toDtoUpdateSellLimit,
} from "../mappers/sell-limit.mapper";
import type { SellLimit, UpdateSellLimitParams } from "../model/sell-limit";

export interface UseSellLimitsResult {
  sellLimits: SellLimit[];
  isLoading: boolean;
  error: string | null;
  loadSellLimits: (propertyId: string, startDate?: string, endDate?: string, roomTypeId?: string) => Promise<void>;
  updateLimit: (params: UpdateSellLimitParams) => Promise<SellLimit>;
}

export function useSellLimits(
  initialPropertyId?: string,
  initialStartDate?: string,
  initialEndDate?: string,
  initialRoomTypeId?: string
): UseSellLimitsResult {
  const [sellLimits, setSellLimits] = useState<SellLimit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSellLimits = useCallback(
    async (propertyId: string, startDate?: string, endDate?: string, roomTypeId?: string) => {
      if (!propertyId) return;
      setIsLoading(true);
      setError(null);
      try {
        const dto = await fetchSellLimitsDto({
          property_id: propertyId,
          start_date: startDate,
          end_date: endDate,
          room_type_id: roomTypeId,
        });
        const domainList = toDomainSellLimitList(dto);
        setSellLimits(domainList);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar límites de venta";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateLimit = useCallback(
    async (params: UpdateSellLimitParams): Promise<SellLimit> => {
      setIsLoading(true);
      setError(null);
      try {
        const payloadDto = toDtoUpdateSellLimit(params);
        const resDto = await updateSellLimitDto(payloadDto);
        const domainItem = toDomainSellLimit(resDto);
        setSellLimits((prev) =>
          prev.map((item) =>
            item.roomTypeId === domainItem.roomTypeId && item.date === domainItem.date
              ? domainItem
              : item
          )
        );
        return domainItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar límite de venta";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let isCancelled = false;
    if (initialPropertyId) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const dto = await fetchSellLimitsDto({
            property_id: initialPropertyId,
            start_date: initialStartDate,
            end_date: initialEndDate,
            room_type_id: initialRoomTypeId,
          });
          if (!isCancelled) {
            setSellLimits(toDomainSellLimitList(dto));
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : "Error al cargar límites de venta");
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
  }, [initialPropertyId, initialStartDate, initialEndDate, initialRoomTypeId]);

  return {
    sellLimits,
    isLoading,
    error,
    loadSellLimits,
    updateLimit,
  };
}
