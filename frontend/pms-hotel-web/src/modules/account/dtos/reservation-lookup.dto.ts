import type { LinkedGuestStayDTO, GuestStayDTO } from './linked-guest-stay.dto';

export interface ReservationLookupDTO {
  stays: LinkedGuestStayDTO[];
  details: GuestStayDTO[];
  overview: { createdAt: string; source: string | null; currency: string; confirmedTotalMinor: number | null };
  accommodations: { stayId: string; roomTypeCode: string; timezone: string }[];
}
