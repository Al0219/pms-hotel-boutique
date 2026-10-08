import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';

export type ServiceRequestFilter = 'ACTIVE' | 'REQUESTED' | 'ASSIGNED' | 'COMPLETED' | 'ALL';
export const minimumServiceLeadTimeMs = 30 * 60 * 1000;
export const serviceRequestModificationCutoffMs = 25 * 60 * 1000;
export const lateCheckoutRequestLeadTimeMs = 35 * 60 * 1000;
export const serviceCompletionReminderDelayMs = 10 * 60 * 1000;

/** Frontend/mock hotel policy; a future property configuration may replace it. */
export interface HotelStayPolicy { standardCheckoutTime: string; }
export const hotelStayPolicy: HotelStayPolicy = { standardCheckoutTime: '12:00' };

export function getMinimumServiceTime(nowMs: number): number { return nowMs + minimumServiceLeadTimeMs; }
export function isServiceTimeAllowed(scheduledAtMs: number, nowMs: number): boolean { return scheduledAtMs >= getMinimumServiceTime(nowMs); }
export function isServiceTimeTextAllowed(value: string, nowMs: number): boolean {
  return isServiceDateTimeAllowed(formatServiceDate(new Date(nowMs)), value, nowMs);
}

export function formatServiceDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function parseServiceDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return formatServiceDate(date) === value ? date : null;
}

export function formatServiceDateLabel(value: string): string {
  const date = parseServiceDate(value);
  return date ? date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : value;
}

/** Combines a local calendar date with an HH:mm value or the start of a slot. */
export function getServiceDateTimeMs(serviceDate: string, serviceTime: string): number | null {
  const date = parseServiceDate(serviceDate);
  const match = /^(\d{2}):(\d{2})/.exec(serviceTime);
  if (!date || !match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

export function isServiceDateTimeAllowed(serviceDate: string, serviceTime: string, nowMs: number): boolean {
  const scheduledAtMs = getServiceDateTimeMs(serviceDate, serviceTime);
  return scheduledAtMs !== null && isServiceTimeAllowed(scheduledAtMs, nowMs);
}

function getServiceEndTime(value: string): string {
  return /–(\d{2}:\d{2})$/.exec(value)?.[1] ?? value;
}

/** Returns the local departure date at the approved normal checkout time. */
export function getStayCheckoutDateTimeMs(departure: string): number | null {
  return getServiceDateTimeMs(departure, hotelStayPolicy.standardCheckoutTime);
}

/** The normal checkout boundary for a stay, expressed in the property's local time. */
export function getNormalCheckoutAt(stay: { departure: string }): number | null {
  return getStayCheckoutDateTimeMs(stay.departure);
}

/** A late checkout remains active until the guest checkout snapshot closes the stay. */
export function getActiveLateCheckoutRequest(requests: readonly SessionServiceRequest[]): SessionServiceRequest | undefined {
  return requests.find((request) => request.kind === 'LATE_CHECKOUT' && request.status !== 'COMPLETED' && request.details?.type === 'LATE_CHECKOUT');
}

export function getEffectiveCheckoutAt(stay: { departure: string }, requests: readonly SessionServiceRequest[]): number | null {
  const normalCheckoutAt = getNormalCheckoutAt(stay);
  const lateCheckout = getActiveLateCheckoutRequest(requests);
  const lateCheckoutAt = lateCheckout?.details?.type === 'LATE_CHECKOUT'
    ? getServiceDateTimeMs(lateCheckout.details.serviceDate, lateCheckout.details.checkoutUntil)
    : null;
  return lateCheckoutAt !== null && lateCheckoutAt !== undefined && (normalCheckoutAt === null || lateCheckoutAt > normalCheckoutAt)
    ? lateCheckoutAt
    : normalCheckoutAt;
}

export type GuestStayActionStatus = 'ACTIVE' | 'CHECKOUT_DUE' | 'CHECKED_OUT';
export function getGuestStayActionStatus({ isCheckedOut, nowMs, requests, stay }: { isCheckedOut: boolean; nowMs: number; requests: readonly SessionServiceRequest[]; stay: { departure: string } }): GuestStayActionStatus {
  if (isCheckedOut) return 'CHECKED_OUT';
  const effectiveCheckoutAt = getEffectiveCheckoutAt(stay, requests);
  return effectiveCheckoutAt !== null && nowMs >= effectiveCheckoutAt ? 'CHECKOUT_DUE' : 'ACTIVE';
}

/** Late check-out is cancellable until thirty minutes before the normal checkout policy. */
export function getLateCheckoutCancellationCutoffMs(serviceDate: string): number | null {
  const checkoutAtMs = getServiceDateTimeMs(serviceDate, hotelStayPolicy.standardCheckoutTime);
  return checkoutAtMs === null ? null : checkoutAtMs - minimumServiceLeadTimeMs;
}

/** Late checkout must be requested no later than 35 minutes before normal checkout. */
export function getLateCheckoutRequestCutoffMs(serviceDate: string): number | null {
  const checkoutAtMs = getServiceDateTimeMs(serviceDate, hotelStayPolicy.standardCheckoutTime);
  return checkoutAtMs === null ? null : checkoutAtMs - lateCheckoutRequestLeadTimeMs;
}

export function canRequestLateCheckout(serviceDate: string, nowMs: number): boolean {
  const cutoffMs = getLateCheckoutRequestCutoffMs(serviceDate);
  return cutoffMs !== null && nowMs <= cutoffMs;
}

export type LateCheckoutCancellationBlockReason = 'DEPENDENT_SERVICE_AFTER_NORMAL_CHECKOUT' | 'CANCELLATION_CUTOFF';

/** Resolves the first blocking business rule for an otherwise active late check-out. */
export function getLateCheckoutCancellationBlockReason(request: SessionServiceRequest, nowMs: number, requests: readonly SessionServiceRequest[] = []): LateCheckoutCancellationBlockReason | null {
  if (request.kind !== 'LATE_CHECKOUT' || request.status === 'COMPLETED' || request.details?.type !== 'LATE_CHECKOUT') return null;
  const normalCheckoutAt = getServiceDateTimeMs(request.details.serviceDate, hotelStayPolicy.standardCheckoutTime);
  const hasDependentService = normalCheckoutAt !== null && requests.some((candidate) => candidate.sessionRequestId !== request.sessionRequestId && candidate.status !== 'COMPLETED' && candidate.kind !== 'LATE_CHECKOUT' && (() => {
    const scheduledAt = getServiceRequestCompletionEligibleAt(candidate);
    return scheduledAt !== null && scheduledAt > normalCheckoutAt;
  })());
  if (hasDependentService) return 'DEPENDENT_SERVICE_AFTER_NORMAL_CHECKOUT';
  const cutoffMs = getLateCheckoutCancellationCutoffMs(request.details.serviceDate);
  return cutoffMs === null || nowMs >= cutoffMs ? 'CANCELLATION_CUTOFF' : null;
}

export function canCancelLateCheckoutRequest(request: SessionServiceRequest, nowMs: number, requests: readonly SessionServiceRequest[] = []): boolean {
  if (request.kind !== 'LATE_CHECKOUT' || request.status === 'COMPLETED' || request.details?.type !== 'LATE_CHECKOUT') return false;
  return getLateCheckoutCancellationBlockReason(request, nowMs, requests) === null;
}

/** Applies the inclusive stay date and normal-checkout boundary to a scheduled service. */
export function getStayServiceDateWindow(arrival: string, departure: string, nowMs: number): { minimumDate: string; maximumDate: string } | null {
  if (!parseServiceDate(arrival) || !parseServiceDate(departure) || arrival > departure) return null;
  const minimumDate = arrival > formatServiceDate(new Date(nowMs)) ? arrival : formatServiceDate(new Date(nowMs));
  return minimumDate <= departure ? { minimumDate, maximumDate: departure } : null;
}

export function isServiceWithinStayWindow({ arrival, departure, endTime, nowMs, serviceDate, startTime }: {
  arrival: string;
  departure: string;
  endTime?: string;
  nowMs: number;
  serviceDate: string;
  startTime: string;
}): boolean {
  const scheduledAtMs = getServiceDateTimeMs(serviceDate, startTime);
  if (!isServiceDateWithinStay(serviceDate, nowMs, arrival, departure) || scheduledAtMs === null || !isServiceTimeAllowed(scheduledAtMs, nowMs)) return false;
  if (serviceDate < departure) return true;
  const checkoutAtMs = getStayCheckoutDateTimeMs(departure);
  const serviceEndAtMs = getServiceDateTimeMs(serviceDate, endTime ?? getServiceEndTime(startTime));
  return checkoutAtMs !== null && serviceEndAtMs !== null && serviceEndAtMs <= checkoutAtMs;
}

/** Same local-date validation as the normal stay window, but with an approved late checkout extension. */
export function isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs, serviceDate, startTime, endTime }: {
  arrival: string;
  effectiveCheckoutAtMs: number | null;
  nowMs: number;
  serviceDate: string;
  startTime: string;
  endTime?: string;
}): boolean {
  const scheduledAtMs = getServiceDateTimeMs(serviceDate, startTime);
  const serviceEndAtMs = getServiceDateTimeMs(serviceDate, endTime ?? getServiceEndTime(startTime));
  if (!parseServiceDate(arrival) || !parseServiceDate(serviceDate) || scheduledAtMs === null || serviceEndAtMs === null || effectiveCheckoutAtMs === null) return false;
  return serviceDate >= arrival && isServiceTimeAllowed(scheduledAtMs, nowMs) && serviceEndAtMs <= effectiveCheckoutAtMs;
}

/** Checks a local date against the current calendar day and inclusive stay departure. */
export function isServiceDateWithinStay(serviceDate: string, nowMs: number, arrival: string, departure: string): boolean {
  const window = getStayServiceDateWindow(arrival, departure, nowMs);
  return window !== null && parseServiceDate(serviceDate) !== null && serviceDate >= window.minimumDate && serviceDate <= window.maximumDate;
}

/** Finds the first date within the stay with a valid configured time. */
export function getFirstAvailableServiceDate(nowMs: number, availableTimes: readonly string[], arrival: string, departure: string, effectiveCheckoutAtMs?: number | null): string | null {
  const window = getStayServiceDateWindow(arrival, departure, nowMs);
  const cursor = window ? parseServiceDate(window.minimumDate) : null;
  if (!window || !cursor) return null;
  while (formatServiceDate(cursor) <= window.maximumDate) {
    const date = formatServiceDate(cursor);
    if (availableTimes.some((value) => effectiveCheckoutAtMs === undefined
      ? isServiceWithinStayWindow({ arrival, departure, nowMs, serviceDate: date, startTime: value })
      : isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs, serviceDate: date, startTime: value }))) return date;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

export function getInitialServiceDate(nowMs: number, availableTimes: readonly string[]): string {
  const today = formatServiceDate(new Date(nowMs));
  return availableTimes.some((value) => isServiceDateTimeAllowed(today, value, nowMs))
    ? today
    : formatServiceDate(new Date(getMinimumServiceTime(nowMs)));
}

/** Retained for consumers that only need to know whether today reaches the minimum. */
export function hasServiceTimeAvailableToday(nowMs: number): boolean {
  return formatServiceDate(new Date(getMinimumServiceTime(nowMs))) === formatServiceDate(new Date(nowMs));
}

/** Returns the closest valid configured value, retaining a valid current choice. */
export function getNearestServiceTime(serviceDate: string, availableTimes: readonly string[], nowMs: number, currentValue?: string | null, arrival?: string, departure?: string, effectiveCheckoutAtMs?: number | null): string | null {
  const isAllowed = (value: string) => arrival && departure
    ? effectiveCheckoutAtMs === undefined
      ? isServiceWithinStayWindow({ arrival, departure, nowMs, serviceDate, startTime: value })
      : isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs, serviceDate, startTime: value })
    : isServiceDateTimeAllowed(serviceDate, value, nowMs);
  if (currentValue && availableTimes.includes(currentValue) && isAllowed(currentValue)) return currentValue;
  return availableTimes.find(isAllowed) ?? null;
}

export const serviceRequestFilters: readonly { value: ServiceRequestFilter; label: string; emptyText: string }[] = [
  { value: 'ACTIVE', label: 'Activos', emptyText: 'No tienes servicios activos.' },
  { value: 'REQUESTED', label: 'Solicitados', emptyText: 'No tienes servicios solicitados.' },
  { value: 'ASSIGNED', label: 'Asignados', emptyText: 'No tienes servicios asignados.' },
  { value: 'COMPLETED', label: 'Completados', emptyText: 'Aún no tienes servicios completados.' },
  { value: 'ALL', label: 'Todos', emptyText: 'Aún no tienes servicios registrados.' },
];

export function filterServiceRequests(requests: readonly SessionServiceRequest[], filter: ServiceRequestFilter): readonly SessionServiceRequest[] {
  if (filter === 'ALL') return requests;
  if (filter === 'ACTIVE') return requests.filter((request) => request.status === 'REQUESTED' || request.status === 'ASSIGNED');
  return requests.filter((request) => request.status === filter);
}

export function getServiceRequestScheduledAtMs(request: SessionServiceRequest, nowMs: number): number | null {
  const details = request.details;
  if (!details) return null;
  if (details.type === 'TRANSFER') return details.scheduledAtMs;
  if (details.type === 'ROOM_SERVICE') return details.serviceDate ? getServiceDateTimeMs(details.serviceDate, details.deliveryTime) : null;
  if (details.type === 'VEHICLE_REQUEST') return details.serviceDate ? getServiceDateTimeMs(details.serviceDate, details.requestedTime) : null;
  if (details.type === 'HOUSEKEEPING') return details.serviceDate ? getServiceDateTimeMs(details.serviceDate, details.timeSlot) : null;
  if (details.type === 'LATE_CHECKOUT') return getServiceDateTimeMs(details.serviceDate, details.checkoutUntil);
  if (details.type === 'AMENITIES') return getServiceDateTimeMs(details.serviceDate, details.deliveryTime);
  return null;
}

/** Completion is eligible at the scheduled time; housekeeping uses the slot end. */
export function getServiceRequestCompletionEligibleAt(request: SessionServiceRequest): number | null {
  const details = request.details;
  if (!details) return null;
  if (details.type === 'HOUSEKEEPING') {
    const slotEnd = /–(\d{2}:\d{2})$/.exec(details.timeSlot)?.[1];
    return details.serviceDate && slotEnd ? getServiceDateTimeMs(details.serviceDate, slotEnd) : null;
  }
  if (details.type === 'ROOM_SERVICE') return details.serviceDate ? getServiceDateTimeMs(details.serviceDate, details.deliveryTime) : null;
  if (details.type === 'VEHICLE_REQUEST') return details.serviceDate ? getServiceDateTimeMs(details.serviceDate, details.requestedTime) : null;
  if (details.type === 'TRANSFER') return details.scheduledAtMs;
  if (details.type === 'LATE_CHECKOUT') return null;
  if (details.type === 'AMENITIES') return getServiceDateTimeMs(details.serviceDate, details.deliveryTime);
  return null;
}

export function canCompleteServiceRequest(request: SessionServiceRequest, nowMs: number): boolean {
  if (request.kind === 'LATE_CHECKOUT') return false;
  const eligibleAt = getServiceRequestCompletionEligibleAt(request);
  return request.status !== 'COMPLETED' && eligibleAt !== null && nowMs >= eligibleAt;
}

export function getServiceCompletionReminderAt(request: SessionServiceRequest): number | null {
  if (request.status === 'COMPLETED' || request.kind === 'LATE_CHECKOUT') return null;
  const eligibleAt = getServiceRequestCompletionEligibleAt(request);
  return eligibleAt === null ? null : eligibleAt + serviceCompletionReminderDelayMs;
}

export function canModifyServiceRequest(request: SessionServiceRequest, nowMs: number): boolean {
  if (request.status === 'COMPLETED') return false;
  const scheduledAtMs = getServiceRequestScheduledAtMs(request, nowMs);
  return scheduledAtMs === null || nowMs < scheduledAtMs - serviceRequestModificationCutoffMs;
}
