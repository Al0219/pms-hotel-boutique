import { DomainMappingError } from "@/lib/errors";

import type {
  AuthorizePaymentRequestDto,
  CapturePaymentRequestDto,
  PaymentAuditEntryDto,
  PaymentDto,
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
  PaymentListFiltersDto,
  PaymentListResponseDto,
  PaymentMethodDto,
  PaymentStatusDto,
} from "../dtos/payment.dto";
import type {
  AuthorizePaymentRequest,
  CapturePaymentRequest,
  Payment,
  PaymentAuditEntry,
  PaymentGuaranteeRequest,
  PaymentGuaranteeResult,
  PaymentListFilters,
  PaymentListResult,
  PaymentMethod,
  PaymentStatus,
} from "../model/payment";

const VALID_METHODS: ReadonlySet<string> = new Set<PaymentMethodDto>([
  "CREDIT_CARD",
  "DEBIT_CARD",
  "PAY_AT_HOTEL",
  "CASH",
  "BANK_TRANSFER",
]);

const VALID_STATUSES: ReadonlySet<string> = new Set<PaymentStatusDto>([
  "PENDING_GUARANTEE",
  "AUTHORIZED",
  "CAPTURED",
  "PARTIALLY_CAPTURED",
  "VOIDED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DECLINED",
  "FAILED",
]);

const VALID_AUDIT_ACTIONS: ReadonlySet<string> = new Set([
  "AUTHORIZE",
  "CAPTURE",
  "VOID",
  "REFUND",
  "FAIL",
]);

function parseAmount(value: string | undefined | null, fieldName: string, allowZero = false): number {
  if (value === undefined || value === null || value.trim() === "") {
    throw new DomainMappingError(`MISSING_${fieldName}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (!allowZero && parsed <= 0) || (allowZero && parsed < 0)) {
    throw new DomainMappingError(`INVALID_${fieldName}`);
  }

  return parsed;
}

export function mapPaymentAuditEntryDtoToDomain(dto: PaymentAuditEntryDto): PaymentAuditEntry {
  if (!dto || !dto.audit_id) {
    throw new DomainMappingError("MISSING_AUDIT_ID");
  }

  if (!dto.action || !VALID_AUDIT_ACTIONS.has(dto.action)) {
    throw new DomainMappingError("INVALID_AUDIT_ACTION");
  }

  const amount = parseAmount(dto.amount, "AUDIT_AMOUNT", true);
  const performedAt = new Date(dto.performed_at);
  if (Number.isNaN(performedAt.getTime())) {
    throw new DomainMappingError("INVALID_AUDIT_PERFORMED_AT");
  }

  return {
    auditId: dto.audit_id.trim(),
    action: dto.action,
    amount,
    currency: (dto.currency || "").trim().toUpperCase(),
    performedBy: (dto.performed_by || "").trim(),
    performedAt,
    reason: dto.reason ?? null,
    providerReference: dto.provider_reference ?? null,
  };
}

export function mapPaymentDtoToDomain(dto: PaymentDto): Payment {
  if (!dto || typeof dto.payment_id !== "string" || !dto.payment_id.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_ID");
  }

  if (!dto.folio_id || !dto.folio_id.trim()) {
    throw new DomainMappingError("MISSING_FOLIO_ID");
  }

  if (!dto.method || !VALID_METHODS.has(dto.method)) {
    throw new DomainMappingError("INVALID_PAYMENT_METHOD");
  }

  if (!dto.status || !VALID_STATUSES.has(dto.status)) {
    throw new DomainMappingError("INVALID_PAYMENT_STATUS");
  }

  if (typeof dto.currency !== "string" || !dto.currency.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_CURRENCY");
  }

  const authorizedAmount = parseAmount(dto.authorized_amount, "AUTHORIZED_AMOUNT", true);
  const capturedAmount = parseAmount(dto.captured_amount, "CAPTURED_AMOUNT", true);
  const refundedAmount = parseAmount(dto.refunded_amount, "REFUNDED_AMOUNT", true);

  const createdAt = new Date(dto.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    throw new DomainMappingError("INVALID_PAYMENT_CREATED_AT");
  }

  const updatedAt = new Date(dto.updated_at);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new DomainMappingError("INVALID_PAYMENT_UPDATED_AT");
  }

  const remainingCapturableAmount = Math.max(0, authorizedAmount - capturedAmount);
  const remainingRefundableAmount = Math.max(0, capturedAmount - refundedAmount);

  const auditTrail = Array.isArray(dto.audit_trail)
    ? dto.audit_trail.map(mapPaymentAuditEntryDtoToDomain)
    : [];

  return {
    paymentId: dto.payment_id.trim(),
    folioId: dto.folio_id.trim(),
    reservationId: dto.reservation_id ?? null,
    stayId: dto.stay_id ?? null,
    method: dto.method as PaymentMethod,
    status: dto.status as PaymentStatus,
    currency: dto.currency.trim().toUpperCase(),
    authorizedAmount,
    capturedAmount,
    refundedAmount,
    remainingCapturableAmount,
    remainingRefundableAmount,
    providerReference: dto.provider_reference ?? null,
    last4: dto.last4 ?? null,
    cardBrand: dto.card_brand ?? null,
    createdAt,
    updatedAt,
    failureReason: dto.failure_reason ?? null,
    auditTrail,
  };
}

export function mapPaymentListResponseDtoToDomain(dto: PaymentListResponseDto): PaymentListResult {
  if (!dto || !Array.isArray(dto.payments)) {
    throw new DomainMappingError("INVALID_PAYMENT_LIST_RESPONSE");
  }

  const payments = dto.payments.map(mapPaymentDtoToDomain);
  const totalCount = typeof dto.total_count === "number" ? dto.total_count : payments.length;

  return {
    payments,
    totalCount,
  };
}

export function mapPaymentListFiltersToDto(filters?: PaymentListFilters): PaymentListFiltersDto | undefined {
  if (!filters) return undefined;

  return {
    folio_id: filters.folioId?.trim(),
    reservation_id: filters.reservationId?.trim(),
    status: filters.status as PaymentStatusDto,
    from_date: filters.fromDate,
    to_date: filters.toDate,
  };
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

  const amount = parseAmount(dto.amount, "PAYMENT_AMOUNT");
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

export function mapAuthorizePaymentRequestToDto(request: AuthorizePaymentRequest): AuthorizePaymentRequestDto {
  if (!request || !request.folioId || !request.folioId.trim()) {
    throw new DomainMappingError("MISSING_FOLIO_ID");
  }

  if (!request.method || !VALID_METHODS.has(request.method)) {
    throw new DomainMappingError("INVALID_PAYMENT_METHOD");
  }

  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new DomainMappingError("INVALID_AUTHORIZATION_AMOUNT");
  }

  if (!request.currency || !request.currency.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_CURRENCY");
  }

  return {
    folio_id: request.folioId.trim(),
    reservation_id: request.reservationId?.trim() ?? null,
    stay_id: request.stayId?.trim() ?? null,
    method: request.method as PaymentMethodDto,
    amount: request.amount.toFixed(2),
    currency: request.currency.trim().toUpperCase(),
    card_token: request.cardToken?.trim(),
    card_holder_name: request.cardHolderName?.trim(),
    last4: request.last4?.trim(),
    card_brand: request.cardBrand?.trim(),
  };
}

export function mapCapturePaymentRequestToDto(request: CapturePaymentRequest): CapturePaymentRequestDto {
  if (!request || !Number.isFinite(request.amount) || request.amount <= 0) {
    throw new DomainMappingError("INVALID_CAPTURE_AMOUNT");
  }

  return {
    amount: request.amount.toFixed(2),
    currency: request.currency?.trim().toUpperCase(),
    reason: request.reason?.trim(),
  };
}


