import { staffBffRequest, staffBffRead } from '@/lib/http/staff-bff';
import type { StaffBookingQuoteDto, StaffBookingRequestDto, StaffBookingReceiptDto, StaffBookingSearchDto } from '../dtos/staff-booking.dto';

export function readStaffBookingOptions(propertyId: string, search: StaffBookingSearchDto, signal?: AbortSignal): Promise<StaffBookingQuoteDto> {
  const params = new URLSearchParams({ propertyId, arrival: search.arrival, departure: search.departure, rooms: String(search.rooms) });
  return staffBffRead(`/api/staff/reservations/creation-options?${params}`, signal);
}
export function postStaffBooking(propertyId: string, body: StaffBookingRequestDto, key: string, signal?: AbortSignal): Promise<StaffBookingReceiptDto> {
  return staffBffRequest(`/api/staff/reservations?${new URLSearchParams({ propertyId })}`, {
    method: 'POST', json: body, headers: { 'Idempotency-Key': key }, signal,
  });
}
