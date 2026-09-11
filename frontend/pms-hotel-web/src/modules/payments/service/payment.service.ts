import { httpRequest } from "@/lib/http";

import type {
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
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
