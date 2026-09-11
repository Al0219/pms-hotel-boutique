import { httpRequest } from "@/lib/http";

import type {
  PaymentDto,
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
  PaymentListFiltersDto,
  PaymentListResponseDto,
} from "../dtos/payment.dto";

export async function createPaymentGuaranteeDto(
  payload: PaymentGuaranteeRequestDto,
  signal?: AbortSignal,
): Promise<PaymentGuaranteeResponseDto> {
  return httpRequest<PaymentGuaranteeResponseDto>({
    path: "/api/v1/public/payments/guarantee",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function fetchPaymentsDto(
  filters?: PaymentListFiltersDto,
  signal?: AbortSignal,
): Promise<PaymentListResponseDto> {
  const params = new URLSearchParams();
  if (filters?.folio_id) params.set("folio_id", filters.folio_id);
  if (filters?.reservation_id) params.set("reservation_id", filters.reservation_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from_date) params.set("from_date", filters.from_date);
  if (filters?.to_date) params.set("to_date", filters.to_date);

  const queryString = params.toString();
  const path = queryString
    ? `/api/v1/private/payments?${queryString}`
    : "/api/v1/private/payments";

  return httpRequest<PaymentListResponseDto>({
    path,
    method: "GET",
    signal,
  });
}

export async function fetchPaymentByIdDto(
  paymentId: string,
  signal?: AbortSignal,
): Promise<PaymentDto> {
  return httpRequest<PaymentDto>({
    path: `/api/v1/private/payments/${encodeURIComponent(paymentId)}`,
    method: "GET",
    signal,
  });
}
