/**
 * Public API for the payments module (WEB-4).
 * Export only intentionally public Domain Models, DTO types, mappers, service functions and components.
 */

export type {
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
  VoidPaymentRequestDto,
} from "./dtos/payment.dto";

export type {
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
  VoidPaymentRequest,
} from "./model/payment";

export {
  mapAuthorizePaymentRequestToDto,
  mapCapturePaymentRequestToDto,
  mapPaymentAuditEntryDtoToDomain,
  mapPaymentDtoToDomain,
  mapPaymentGuaranteeDtoToDomain,
  mapPaymentGuaranteeRequestToDto,
  mapPaymentListFiltersToDto,
  mapPaymentListResponseDtoToDomain,
  mapVoidPaymentRequestToDto,
} from "./mappers/payment.mapper";

export {
  authorizePaymentDto,
  capturePaymentDto,
  createPaymentGuaranteeDto,
  fetchPaymentByIdDto,
  fetchPaymentsDto,
  voidPaymentDto,
} from "./service/payment.service";

export {
  PaymentListCard,
  type PaymentListCardProps,
} from "./components/payment-list-card";

export {
  PaymentAuthorizeModal,
  type PaymentAuthorizeModalProps,
} from "./components/payment-authorize-modal";

export {
  PaymentCaptureModal,
  type PaymentCaptureModalProps,
} from "./components/payment-capture-modal";

export {
  PaymentVoidModal,
  type PaymentVoidModalProps,
} from "./components/payment-void-modal";
