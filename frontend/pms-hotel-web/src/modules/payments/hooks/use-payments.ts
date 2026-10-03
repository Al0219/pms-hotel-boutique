"use client";

import { useState, useCallback, useEffect } from "react";
import {
  fetchPaymentsDto,
  authorizePaymentDto,
  capturePaymentDto,
  voidPaymentDto,
  refundPaymentDto,
} from "../service/payment.service";
import {
  mapPaymentListFiltersToDto,
  mapPaymentListResponseDtoToDomain,
  mapAuthorizePaymentRequestToDto,
  mapPaymentDtoToDomain,
  mapCapturePaymentRequestToDto,
  mapVoidPaymentRequestToDto,
  mapRefundPaymentRequestToDto,
} from "../mappers/payment.mapper";
import type {
  Payment,
  PaymentListFilters,
  AuthorizePaymentRequest,
  CapturePaymentRequest,
  VoidPaymentRequest,
  RefundPaymentRequest,
} from "../model/payment";

export interface UsePaymentsResult {
  payments: Payment[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  loadPayments: (filters?: PaymentListFilters) => Promise<void>;
  authorize: (req: AuthorizePaymentRequest) => Promise<Payment>;
  capture: (paymentId: string, req: CapturePaymentRequest) => Promise<Payment>;
  voidPayment: (paymentId: string, req: VoidPaymentRequest) => Promise<Payment>;
  refund: (paymentId: string, req: RefundPaymentRequest) => Promise<Payment>;
}

export function usePayments(initialFilters?: PaymentListFilters): UsePaymentsResult {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (filters?: PaymentListFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const dtoFilters = filters ? mapPaymentListFiltersToDto(filters) : undefined;
      const resDto = await fetchPaymentsDto(dtoFilters);
      const domainResult = mapPaymentListResponseDtoToDomain(resDto);
      setPayments(domainResult.payments);
      setTotalCount(domainResult.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar pagos";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authorize = useCallback(
    async (req: AuthorizePaymentRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);
      try {
        const dto = mapAuthorizePaymentRequestToDto(req);
        const resDto = await authorizePaymentDto(dto);
        const payment = mapPaymentDtoToDomain(resDto);
        setPayments((prev) => [payment, ...prev]);
        return payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al autorizar pago";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const capture = useCallback(
    async (paymentId: string, req: CapturePaymentRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);
      try {
        const dto = mapCapturePaymentRequestToDto(req);
        const resDto = await capturePaymentDto(paymentId, dto);
        const payment = mapPaymentDtoToDomain(resDto);
        setPayments((prev) => prev.map((p) => (p.paymentId === paymentId ? payment : p)));
        return payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al capturar pago";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const voidPayment = useCallback(
    async (paymentId: string, req: VoidPaymentRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);
      try {
        const dto = mapVoidPaymentRequestToDto(req);
        const resDto = await voidPaymentDto(paymentId, dto);
        const payment = mapPaymentDtoToDomain(resDto);
        setPayments((prev) => prev.map((p) => (p.paymentId === paymentId ? payment : p)));
        return payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al anular pago";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refund = useCallback(
    async (paymentId: string, req: RefundPaymentRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);
      try {
        const dto = mapRefundPaymentRequestToDto(req);
        const resDto = await refundPaymentDto(paymentId, dto);
        const payment = mapPaymentDtoToDomain(resDto);
        setPayments((prev) => prev.map((p) => (p.paymentId === paymentId ? payment : p)));
        return payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al reembolsar pago";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const propId = initialFilters?.propertyId;
  const fId = initialFilters?.folioId;

  useEffect(() => {
    let isCancelled = false;
    if (propId || fId) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const dtoFilters = mapPaymentListFiltersToDto({
            propertyId: propId,
            folioId: fId,
          });
          const resDto = await fetchPaymentsDto(dtoFilters);
          if (!isCancelled) {
            const domainResult = mapPaymentListResponseDtoToDomain(resDto);
            setPayments(domainResult.payments);
            setTotalCount(domainResult.totalCount);
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : "Error al cargar pagos");
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
  }, [propId, fId]);

  return {
    payments,
    totalCount,
    isLoading,
    error,
    loadPayments,
    authorize,
    capture,
    voidPayment,
    refund,
  };
}
