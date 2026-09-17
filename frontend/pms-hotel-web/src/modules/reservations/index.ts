/**
 * Public API for the reservations module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { ReservationCenter } from "./components/reservation-center";
export { ReservationDetail } from "./components/reservation-detail";
export { ReservationCancellation } from "./components/reservation-cancellation";
export { WaitlistConversionPanel } from "./components/waitlist-conversion-panel";
export type {
  ReservationDetailData,
  ReservationDetailFinancialSummary,
  ReservationFinanceLine,
  ReservationGuestSummary,
  ReservationSource,
  ReservationStayDetail,
  StayTravelState,
} from "./model/reservation-detail";
export type {
  ReservationAlertItem,
  ReservationCenterData,
  ReservationCenterSummary,
  ReservationFinancialSummary,
  ReservationListItem,
  ReservationStatus,
} from "./model/reservation-summary";
export type { CancellationPreview, CancellationResult } from "./model/reservation-cancellation";
export type {
  WaitlistAvailability,
  WaitlistConversionPreview,
  WaitlistConversionResult,
} from "./model/waitlist";