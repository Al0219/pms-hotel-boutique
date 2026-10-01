"use client";

import { useState, useCallback, useEffect } from "react";
import {
  fetchFolioByIdDto,
  splitFolioChargeDto,
  transferFolioChargeDto,
} from "../service/folio.service";
import {
  mapFolioDtoToDomain,
  mapSplitChargeResultDtoToDomain,
  mapTransferChargeResultDtoToDomain,
  mapSplitChargeRequestToDto,
  mapTransferChargeRequestToDto,
} from "../mappers/folio.mapper";
import type {
  Folio,
  SplitChargeRequest,
  SplitChargeResult,
  TransferChargeRequest,
  TransferChargeResult,
} from "../model/folio";

export interface UseFolioResult {
  folio: Folio | null;
  isLoading: boolean;
  error: string | null;
  loadFolio: (folioId: string) => Promise<void>;
  splitCharge: (params: SplitChargeRequest) => Promise<SplitChargeResult>;
  transferCharge: (params: TransferChargeRequest) => Promise<TransferChargeResult>;
}

export function useFolio(initialFolioId?: string): UseFolioResult {
  const [folio, setFolio] = useState<Folio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolio = useCallback(async (folioId: string) => {
    if (!folioId) return;
    setIsLoading(true);
    setError(null);
    try {
      const dto = await fetchFolioByIdDto(folioId);
      const domainFolio = mapFolioDtoToDomain(dto);
      setFolio(domainFolio);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar folio";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const splitCharge = useCallback(
    async (params: SplitChargeRequest): Promise<SplitChargeResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const dtoPayload = mapSplitChargeRequestToDto(params);
        const resDto = await splitFolioChargeDto(params.folioId, dtoPayload);
        const result = mapSplitChargeResultDtoToDomain(resDto);
        if (params.folioId) {
          await loadFolio(params.folioId);
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al dividir cargo";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFolio]
  );

  const transferCharge = useCallback(
    async (params: TransferChargeRequest): Promise<TransferChargeResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const dtoPayload = mapTransferChargeRequestToDto(params);
        const resDto = await transferFolioChargeDto(params.sourceFolioId, dtoPayload);
        const result = mapTransferChargeResultDtoToDomain(resDto);
        if (params.sourceFolioId) {
          await loadFolio(params.sourceFolioId);
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al transferir cargo";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFolio]
  );

  useEffect(() => {
    let isCancelled = false;
    if (initialFolioId) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const dto = await fetchFolioByIdDto(initialFolioId);
          if (!isCancelled) {
            setFolio(mapFolioDtoToDomain(dto));
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : "Error al cargar folio");
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
  }, [initialFolioId]);

  return {
    folio,
    isLoading,
    error,
    loadFolio,
    splitCharge,
    transferCharge,
  };
}
