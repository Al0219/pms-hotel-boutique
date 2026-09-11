import { DomainMappingError } from "@/lib/errors";

import type {
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
  PaymentMethodDto,
  PaymentStatusDto,
} from "../dtos/payment.dto";
import type {
  PaymentGuaranteeRequest,
  PaymentGuaranteeResult,
  PaymentMethod,
  PaymentStatus,
} from "../model/payment";

const VALID_METHODS: ReadonlySet<string> = new Set<PaymentMethodDto>([
  "CREDIT_CARD",
  "DEBIT_CARD",
  "PAY_AT_HOTEL",
]);

const VALID_STATUSES: ReadonlySet<string> = new Set<PaymentStatusDto>([
  "AUTHORIZED",
  "PENDING_GUARANTEE",
  "DECLINED",
  "FAILED",
]);

function parsePaymentAmount(value: string | undefined | null): number {
  if (value === undefined || value === null || value.trim() === "") {
    throw new DomainMappingError("INVALID_PAYMENT_AMOUNT");
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new DomainMappingError("INVALID_NUMERIC_PAYMENT_AMOUNT");
  }

  return parsed;
}

export function mapPaymentGuaranteeDtoToDomain(dto: PaymentGuaranteeResponseDto): PaymentGuaranteeResult {
  if (!dto || typeof dto.payment_id !== "string" || !dto.payment_id.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_ID");
  }

  if (!dto.status || !VALID_STATUSES.has(dto.status)) {
    throw new DomainMappingError("INVALID_PAYMENT_STATUS");
  }

  if (typeof dto.currency !== "string" || !dto.currency.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_CURRENCY");
  }

  const amount = parsePaymentAmount(dto.amount);
  const createdAt = new Date(dto.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    throw new DomainMappingError("INVALID_PAYMENT_CREATED_AT");
  }

  return {
    paymentId: dto.payment_id.trim(),
    status: dto.status as PaymentStatus,
    amount,
    currency: dto.currency.trim().toUpperCase(),
    providerReference: dto.provider_reference ?? null,
    last4: dto.last4 ?? null,
    cardBrand: dto.card_brand ?? null,
    createdAt,
    failureReason: dto.failure_reason ?? null,
  };
}

export function mapPaymentGuaranteeRequestToDto(request: PaymentGuaranteeRequest): PaymentGuaranteeRequestDto {
  if (!request || !request.paymentMethod || !VALID_METHODS.has(request.paymentMethod)) {
    throw new DomainMappingError("INVALID_PAYMENT_METHOD");
  }

  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new DomainMappingError("INVALID_REQUEST_AMOUNT");
  }

  if (!request.currency || !request.currency.trim()) {
    throw new DomainMappingError("MISSING_REQUEST_CURRENCY");
  }

  return {
    payment_method: request.paymentMethod as PaymentMethodDto,
    card_holder_name: request.cardHolderName?.trim(),
    card_token: request.cardToken?.trim(),
    last4: request.last4?.trim(),
    card_brand: request.cardBrand?.trim(),
    expiration_month: request.expirationMonth,
    expiration_year: request.expirationYear,
    amount: request.amount.toFixed(2),
    currency: request.currency.trim().toUpperCase(),
    reservation_reference: request.reservationReference?.trim(),
  };
}
