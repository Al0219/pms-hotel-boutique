import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';

export type ServiceRequestFilter = 'ACTIVE' | 'REQUESTED' | 'ASSIGNED' | 'COMPLETED' | 'ALL';
export const minimumServiceLeadTimeMs = 30 * 60 * 1000;
export const serviceRequestModificationCutoffMs = 25 * 60 * 1000;

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

/** Applies the inclusive stay date and normal-checkout boundary to a scheduled service. */
export function isServiceWithinStayWindow({ departure, endTime, nowMs, serviceDate, startTime }: {
  departure: string;
  endTime?: string;
  nowMs: number;
  serviceDate: string;
  startTime: string;
}): boolean {
  const scheduledAtMs = getServiceDateTimeMs(serviceDate, startTime);
  if (!isServiceDateWithinStay(serviceDate, nowMs, departure) || scheduledAtMs === null || !isServiceTimeAllowed(scheduledAtMs, nowMs)) return false;
  if (serviceDate < departure) return true;
  const checkoutAtMs = getStayCheckoutDateTimeMs(departure);
  const serviceEndAtMs = getServiceDateTimeMs(serviceDate, endTime ?? getServiceEndTime(startTime));
  return checkoutAtMs !== null && serviceEndAtMs !== null && serviceEndAtMs <= checkoutAtMs;
}

/** Checks a local date against the current calendar day and inclusive stay departure. */
export function isServiceDateWithinStay(serviceDate: string, nowMs: number, departure: string): boolean {
  return parseServiceDate(serviceDate) !== null && serviceDate >= formatServiceDate(new Date(nowMs)) && serviceDate <= departure;
}

/** Finds the first date within the stay with a valid configured time. */
export function getFirstAvailableServiceDate(nowMs: number, availableTimes: readonly string[], departure: string): string | null {
  const departureDate = parseServiceDate(departure);
  const cursor = parseServiceDate(formatServiceDate(new Date(nowMs)));
  if (!departureDate || !cursor) return null;
  while (formatServiceDate(cursor) <= departure) {
    const date = formatServiceDate(cursor);
    if (availableTimes.some((value) => isServiceWithinStayWindow({ departure, nowMs, serviceDate: date, startTime: value }))) return date;
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
export function getNearestServiceTime(serviceDate: string, availableTimes: readonly string[], nowMs: number, currentValue?: string | null, departure?: string): string | null {
  const isAllowed = (value: string) => departure
    ? isServiceWithinStayWindow({ departure, nowMs, serviceDate, startTime: value })
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
  if (details.type === 'LATE_CHECKOUT') return getServiceDateTimeMs(details.serviceDate, details.checkoutUntil);
  return null;
}

export function canCompleteServiceRequest(request: SessionServiceRequest, nowMs: number): boolean {
  const eligibleAt = getServiceRequestCompletionEligibleAt(request);
  return request.status !== 'COMPLETED' && eligibleAt !== null && nowMs >= eligibleAt;
}

export function canModifyServiceRequest(request: SessionServiceRequest, nowMs: number): boolean {
  if (request.status === 'COMPLETED') return false;
  const scheduledAtMs = getServiceRequestScheduledAtMs(request, nowMs);
  return scheduledAtMs === null || nowMs < scheduledAtMs - serviceRequestModificationCutoffMs;
}
