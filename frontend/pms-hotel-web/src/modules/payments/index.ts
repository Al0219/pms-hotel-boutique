/**
 * Public API for the payments module (WEB-4).
 * Export only intentionally public Domain Models, DTO types, mappers, service functions and components.
 */
export { DemoCardGateway } from './components/demo-card-gateway';
export type { DemoCardToken } from './model/demo-card';

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
  RefundPaymentRequestDto,
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
  RefundPaymentRequest,
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
  mapRefundPaymentRequestToDto,
  mapVoidPaymentRequestToDto,
} from "./mappers/payment.mapper";

export {
  usePayments,
  type UsePaymentsResult,
} from "./hooks/use-payments";

export {
  authorizePaymentDto,
  capturePaymentDto,
  createPaymentGuaranteeDto,
  fetchPaymentByIdDto,
  fetchPaymentsDto,
  refundPaymentDto,
  voidPaymentDto,
} from "./service/payment.service";

export {
  PaymentsPage,
} from "./components/payments-page";

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

export {
  PaymentRefundModal,
  type PaymentRefundModalProps,
} from "./components/payment-refund-modal";
